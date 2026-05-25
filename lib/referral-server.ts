import type { SupabaseClient } from '@supabase/supabase-js';
import {
  REFERRAL_BET_COMPLETED_BONUS,
  REFERRAL_SIGNUP_BONUS,
  generateReferralCode,
} from '@/lib/referral';
import { awardPoints } from '@/lib/points';

export async function ensureUserReferralCode(
  admin: SupabaseClient,
  userId: string,
  telegramId: string,
  existingCode: string | null | undefined,
): Promise<string> {
  if (existingCode) return existingCode;
  const code = generateReferralCode(telegramId);
  const { error } = await admin
    .from('users')
    .update({ referral_code: code })
    .eq('id', userId);

  if (error) {
    console.error('[referral-server] ensureUserReferralCode update failed:', error);
    throw new Error(
      `referral_code update failed: ${error.message} (code: ${error.code ?? 'n/a'})`,
    );
  }

  return code;
}

export async function processReferralSignup(
  admin: SupabaseClient,
  referredUserId: string,
  referralCode: string,
): Promise<void> {
  const { data: referrer } = await admin
    .from('users')
    .select('id')
    .eq('referral_code', referralCode)
    .maybeSingle();

  if (!referrer?.id || referrer.id === referredUserId) return;

  const { data: existing } = await admin
    .from('referrals')
    .select('id')
    .eq('referred_id', referredUserId)
    .maybeSingle();

  if (existing) return;

  const { error: insertErr } = await admin.from('referrals').insert({
    referrer_id: referrer.id,
    referred_id: referredUserId,
    status: 'pending',
  });

  if (insertErr) return;

  await awardPoints(admin, referredUserId, REFERRAL_SIGNUP_BONUS, 'referral_signup');
}

export async function processReferralFirstBet(
  admin: SupabaseClient,
  referredUserId: string,
): Promise<{ completed: boolean }> {
  const { count, error: countErr } = await admin
    .from('bets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', referredUserId);

  if (countErr || count !== 1) return { completed: false };

  const { data: referral } = await admin
    .from('referrals')
    .select('id, referrer_id, status')
    .eq('referred_id', referredUserId)
    .eq('status', 'pending')
    .maybeSingle();

  if (!referral) return { completed: false };

  const { error: updateErr } = await admin
    .from('referrals')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', referral.id);

  if (updateErr) return { completed: false };

  await awardPoints(
    admin,
    referral.referrer_id,
    REFERRAL_BET_COMPLETED_BONUS,
    'referral_bet_completed',
  );

  return { completed: true };
}

export async function getReferralStats(admin: SupabaseClient, userId: string) {
  const { data: user } = await admin
    .from('users')
    .select('referral_code, telegram_id')
    .eq('id', userId)
    .single();

  const referralCode = user
    ? await ensureUserReferralCode(
        admin,
        userId,
        user.telegram_id,
        user.referral_code,
      )
    : '';

  const { count: inviteCount } = await admin
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', userId);

  const { data: txRows } = await admin
    .from('point_transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('reason', 'referral_bet_completed');

  const totalReferralPoints =
    txRows?.reduce((sum, row) => sum + (row.amount ?? 0), 0) ?? 0;

  return {
    referral_code: referralCode,
    invite_count: inviteCount ?? 0,
    total_referral_points: totalReferralPoints,
  };
}
