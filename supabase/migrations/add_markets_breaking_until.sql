-- Supabase SQL Editor에서 실행
ALTER TABLE markets
ADD COLUMN IF NOT EXISTS breaking_until timestamptz;

COMMENT ON COLUMN markets.breaking_until IS '속보 표시 만료 시각 (이후 자동 미표시)';
