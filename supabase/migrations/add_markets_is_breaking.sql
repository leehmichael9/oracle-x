-- Supabase SQL Editor에서 실행
ALTER TABLE markets
ADD COLUMN IF NOT EXISTS is_breaking boolean NOT NULL DEFAULT false;
