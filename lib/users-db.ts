import type { SupabaseClient } from '@supabase/supabase-js';

export type UsersRowKey = {
  /** users.id (uuid) */
  id: string;
  telegram_id: string;
};

export type UserWithOptionalReferralCode = UsersRowKey & {
  referral_code?: string | null;
};

let referralCodeColumnChecked: boolean | null = null;
let referralCodeColumnExists = false;

/** PostgREST 스키마 캐시 기준 referral_code 컬럼 존재 여부 */
export async function usersHasReferralCodeColumn(
  admin: SupabaseClient,
): Promise<boolean> {
  if (referralCodeColumnChecked) return referralCodeColumnExists;

  const { error } = await admin
    .from('users')
    .select('referral_code')
    .limit(1);

  referralCodeColumnChecked = true;
  referralCodeColumnExists = !error || !isMissingReferralCodeColumnError(error);

  return referralCodeColumnExists;
}

function isMissingReferralCodeColumnError(err: {
  message?: string;
  code?: string;
}): boolean {
  const msg = err.message ?? '';
  return (
    err.code === 'PGRST204' ||
    err.code === '42703' ||
    msg.includes("Could not find the 'referral_code' column") ||
    (msg.includes('referral_code') && msg.includes('does not exist'))
  );
}

/** telegram_id로 users 행 조회 (PK는 id uuid) */
export async function findUserByTelegramId(
  admin: SupabaseClient,
  telegramId: string,
): Promise<{ user: UserWithOptionalReferralCode | null; error: Error | null }> {
  const hasReferralCode = await usersHasReferralCodeColumn(admin);
  const { data, error } = hasReferralCode
    ? await admin
        .from('users')
        .select('id, telegram_id, referral_code')
        .eq('telegram_id', telegramId)
        .maybeSingle()
    : await admin
        .from('users')
        .select('id, telegram_id')
        .eq('telegram_id', telegramId)
        .maybeSingle();

  if (error) {
    return {
      user: null,
      error: new Error(
        `users select failed: ${error.message} (code: ${error.code ?? 'n/a'})`,
      ),
    };
  }

  if (!data?.id || !data.telegram_id) {
    return { user: null, error: null };
  }

  const user: UserWithOptionalReferralCode = {
    id: String(data.id),
    telegram_id: String(data.telegram_id),
  };
  if ('referral_code' in data) {
    user.referral_code = data.referral_code as string | null | undefined;
  }

  return { user, error: null };
}

/**
 * referral_code 저장. 컬럼이 없으면 DB 쓰기 없이 code만 반환.
 * WHERE는 telegram_id 우선, 실패 시 id(uuid)로 재시도.
 */
export async function persistUserReferralCode(
  admin: SupabaseClient,
  key: UsersRowKey,
  code: string,
): Promise<{ code: string; persisted: boolean; warning?: string }> {
  const hasColumn = await usersHasReferralCodeColumn(admin);
  if (!hasColumn) {
    return {
      code,
      persisted: false,
      warning:
        'users.referral_code 컬럼 없음 — supabase/migrations/add_users_referral_code.sql 실행 필요',
    };
  }

  const { error: byTelegramErr } = await admin
    .from('users')
    .update({ referral_code: code })
    .eq('telegram_id', key.telegram_id);

  if (!byTelegramErr) {
    return { code, persisted: true };
  }

  if (isMissingReferralCodeColumnError(byTelegramErr)) {
    referralCodeColumnChecked = true;
    referralCodeColumnExists = false;
    return {
      code,
      persisted: false,
      warning: byTelegramErr.message,
    };
  }

  const { error: byIdErr } = await admin
    .from('users')
    .update({ referral_code: code })
    .eq('id', key.id);

  if (!byIdErr) {
    return { code, persisted: true };
  }

  if (isMissingReferralCodeColumnError(byIdErr)) {
    referralCodeColumnChecked = true;
    referralCodeColumnExists = false;
    return {
      code,
      persisted: false,
      warning: byIdErr.message,
    };
  }

  throw new Error(
    `referral_code update failed: ${byIdErr.message} (code: ${byIdErr.code ?? 'n/a'}, user_id: ${key.id}, telegram_id: ${key.telegram_id})`,
  );
}
