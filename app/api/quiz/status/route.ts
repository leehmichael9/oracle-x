import { NextRequest } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const DAILY_LIMIT = 3;

/** KST(Asia/Seoul) 기준 오늘 completed_at 범위 — DATE(completed_at AT TIME ZONE 'Asia/Seoul') = 오늘 */
function getKstTodayBounds() {
  const dateKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  return {
    start: `${dateKey}T00:00:00+09:00`,
    end: `${dateKey}T23:59:59.999+09:00`,
  };
}

export async function GET(request: NextRequest) {
  try {
    const telegramId = request.nextUrl.searchParams.get('telegram_id')?.trim();

    if (!telegramId) {
      return Response.json({ error: 'telegram_id required' }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    const { start, end } = getKstTodayBounds();

    const { count, error: countErr } = await admin
      .from('quiz_rounds')
      .select('*', { count: 'exact', head: true })
      .eq('telegram_id', telegramId)
      .not('completed_at', 'is', null)
      .gte('completed_at', start)
      .lte('completed_at', end);

    if (countErr) {
      console.error('[api/quiz/status] count today rounds:', countErr);
      return Response.json(
        { error: countErr.message, code: countErr.code },
        { status: 500 },
      );
    }

    const roundsToday = count ?? 0;
    const roundsRemaining = Math.max(0, DAILY_LIMIT - roundsToday);

    return Response.json({
      rounds_today: roundsToday,
      rounds_remaining: roundsRemaining,
    });
  } catch (err) {
    console.error('[api/quiz/status] unexpected:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'internal_error' },
      { status: 500 },
    );
  }
}
