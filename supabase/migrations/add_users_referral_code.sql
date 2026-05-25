-- users.referral_code: 레퍼럴 초대 코드 (telegram_id 기반 생성값 저장)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_code text;

CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_key
  ON public.users (referral_code)
  WHERE referral_code IS NOT NULL;
