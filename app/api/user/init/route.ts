import { NextRequest } from 'next/server';
import { parseReferralCodeFromStartParam } from '@/lib/referral';
import { generateReferralCode } from '@/lib/referral';
import {
  ensureUserReferralCode,
  processReferralSignup,
} from '@/lib/referral-server';
import { createSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const DEFAULT_START_POINTS = 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const telegramId = String(body.telegram_id ?? '').trim();
    const username = String(body.username ?? '익명').trim() || '익명';
    const startParam =
      typeof body.start_param === 'string' ? body.start_param : undefined;

    if (!telegramId) {
      return Response.json({ ok: false, error: 'telegram_id required' }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    const { data: existing } = await admin
      .from('users')
      .select('id, referral_code')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (existing) {
      const referralCode = await ensureUserReferralCode(
        admin,
        existing.id,
        telegramId,
        existing.referral_code,
      );

      return Response.json({
        ok: true,
        user_id: existing.id,
        is_new_user: false,
        referral_code: referralCode,
      });
    }

    const referralCode = generateReferralCode(telegramId);

    const { data: newUser, error: insertErr } = await admin
      .from('users')
      .insert({
        telegram_id: telegramId,
        username,
        points: DEFAULT_START_POINTS,
        referral_code: referralCode,
      })
      .select('id, referral_code')
      .single();

    if (insertErr || !newUser) {
      return Response.json(
        { ok: false, error: insertErr?.message ?? '유저 생성 실패' },
        { status: 500 },
      );
    }

    const parsedReferral = parseReferralCodeFromStartParam(startParam);
    if (parsedReferral) {
      await processReferralSignup(admin, newUser.id, parsedReferral);
    }

    const { data: refreshed } = await admin
      .from('users')
      .select('points')
      .eq('id', newUser.id)
      .single();

    return Response.json({
      ok: true,
      user_id: newUser.id,
      is_new_user: true,
      referral_code: newUser.referral_code,
      points: refreshed?.points ?? DEFAULT_START_POINTS,
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'init failed',
      },
      { status: 500 },
    );
  }
}
