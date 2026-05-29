-- Supabase SQL Editor에서 실행
ALTER TABLE markets
ADD COLUMN IF NOT EXISTS sub_category text;

COMMENT ON COLUMN markets.sub_category IS '마켓 세분류 (예: 코스피, BTS)';
