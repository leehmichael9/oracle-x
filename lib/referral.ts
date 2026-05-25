export const REFERRAL_SIGNUP_BONUS = 1500;
export const REFERRAL_BET_COMPLETED_BONUS = 500;
export const REFERRAL_START_PREFIX = 'REF_';
export const BOT_APP_BASE = 'https://t.me/OracleX_bot/app';

/** telegram_id → base36 대문자 6자리 (예: 123456789 → 21I3V9) */
export function generateReferralCode(telegramId: string): string {
  const code = BigInt(telegramId).toString(36).toUpperCase();
  if (code.length >= 6) return code.slice(-6);
  return code.padStart(6, '0');
}

export function parseReferralCodeFromStartParam(
  startParam: string | undefined | null,
): string | null {
  if (!startParam || !startParam.startsWith(REFERRAL_START_PREFIX)) return null;
  const code = startParam.slice(REFERRAL_START_PREFIX.length).trim().toUpperCase();
  return code || null;
}

export function buildInviteLink(referralCode: string): string {
  return `${BOT_APP_BASE}?startapp=${REFERRAL_START_PREFIX}${referralCode}`;
}
