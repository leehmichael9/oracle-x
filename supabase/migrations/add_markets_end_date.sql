-- Supabase SQL Editor에서 실행
ALTER TABLE markets
ADD COLUMN IF NOT EXISTS end_date timestamptz;

COMMENT ON COLUMN markets.end_date IS '마켓 베팅 마감 시각';
