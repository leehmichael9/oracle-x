@AGENTS.md

## ⚠️ 미해결 주의사항 (Cursor 작업 중 발생)

| **#** | **내용** | **상태** |
|---|---|---|
| 1 | 신규뱃지 — Supabase markets 테이블에 created_at 컬럼(timestamptz, default now()) 없으면 뱃지 미표시. SQL Editor에서 추가 필요 | ⏳ 미해결 |
| 2 | 폰트 — layout.tsx에 Geist 설정 잔존. 완전 제거 원하면 별도 작업 필요 | ⏳ 미해결 |
| 3 | end_date — `supabase/migrations/add_markets_end_date.sql`을 Supabase SQL Editor에서 실행해야 마감·필터·admin 저장 동작 | ⏳ 미해결 |
| 4 | is_breaking — `supabase/migrations/add_markets_is_breaking.sql`을 Supabase SQL Editor에서 실행해야 속보 뱃지·admin 체크박스 동작 | ⏳ 미해결 |

※ 커서 작업 중 주의사항 발생 시 이 섹션에 추가
※ 해결 시 상태를 ✅ 완료로 변경
