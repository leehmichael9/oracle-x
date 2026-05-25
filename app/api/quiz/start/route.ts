import { NextRequest } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const DAILY_LIMIT = 3;
const QUESTIONS_PER_ROUND = 5;

function getKstTodayBounds() {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);
  const todayKST = kstNow.toISOString().split('T')[0];

  return {
    start: `${todayKST}T00:00:00+09:00`,
    end: `${todayKST}T23:59:59+09:00`,
  };
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const telegramId = String(body.telegram_id ?? '').trim();

    if (!telegramId) {
      return Response.json({ error: 'telegram_id required' }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    const { start, end } = getKstTodayBounds();

    const { count: completedToday, error: countErr } = await admin
      .from('quiz_rounds')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', telegramId)
      .not('completed_at', 'is', null)
      .gte('completed_at', start)
      .lte('completed_at', end);

    if (countErr) {
      console.error('[api/quiz/start] count today rounds:', countErr);
      return Response.json(
        { error: countErr.message, code: countErr.code },
        { status: 500 },
      );
    }

    if ((completedToday ?? 0) >= DAILY_LIMIT) {
      return Response.json({ error: 'daily_limit_reached' }, { status: 429 });
    }

    const { data: allQuestions, error: questionsErr } = await admin
      .from('quiz_questions')
      .select('id, question, options');

    if (questionsErr) {
      console.error('[api/quiz/start] fetch questions:', questionsErr);
      return Response.json(
        { error: questionsErr.message, code: questionsErr.code },
        { status: 500 },
      );
    }

    if (!allQuestions?.length) {
      return Response.json({ error: 'no_questions_available' }, { status: 404 });
    }

    const picked = shuffle(allQuestions).slice(0, QUESTIONS_PER_ROUND);
    const questionIds = picked.map((q) => q.id);

    const { data: round, error: insertErr } = await admin
      .from('quiz_rounds')
      .insert({
        telegram_id: telegramId,
        question_ids: questionIds,
        completed_at: null,
      })
      .select('id')
      .single();

    if (insertErr || !round) {
      console.error('[api/quiz/start] insert round:', insertErr);
      return Response.json(
        { error: insertErr?.message ?? 'failed to create round' },
        { status: 500 },
      );
    }

    return Response.json({
      round_id: round.id,
      questions: picked.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
      })),
    });
  } catch (err) {
    console.error('[api/quiz/start] unexpected:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'internal_error' },
      { status: 500 },
    );
  }
}
