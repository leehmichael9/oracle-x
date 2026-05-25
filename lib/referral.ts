export const REFERRAL_SIGNUP_BONUS = 1500;
export const REFERRAL_BET_COMPLETED_BONUS = 500;
export const REFERRAL_START_PREFIX = 'REF_';
export const BOT_APP_BASE = 'https://t.me/OracleX_bot/app';

/** telegram_id → base36 대문자 6자리 (예: 123456789 → 21I3V9) */
export function generateReferralCode(telegramId: string): string {
  const trimmed = telegramId.trim();
  if (!trimmed) {
    throw new Error('generateReferralCode: empty telegram_id');
  }

  if (/^\d+$/.test(trimmed)) {
    try {
      const code = BigInt(trimmed).toString(36).toUpperCase();
      if (code.length >= 6) return code.slice(-6);
      return code.padStart(6, '0');
    } catch (err) {
      console.error('[referral] BigInt conversion failed:', trimmed, err);
      throw err;
    }
  }

  // 비숫자 telegram_id (로컬 테스트 등) — 결정적 해시 fallback
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash * 31 + trimmed.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36).toUpperCase().padStart(6, '0').slice(-6);
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
