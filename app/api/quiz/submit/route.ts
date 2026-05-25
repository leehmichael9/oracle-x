import { NextRequest } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const POINTS_BY_CORRECT: Record<number, number> = {
  1: 10,
  2: 20,
  3: 30,
  4: 40,
  5: 100,
};

function pointsForCorrectCount(count: number): number {
  return POINTS_BY_CORRECT[count] ?? 0;
}

function isValidAnswerIndex(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 3
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const roundId = body.round_id;
    const userAnswers = body.user_answers;

    if (roundId == null || roundId === '') {
      return Response.json({ error: 'round_id required' }, { status: 400 });
    }

    if (
      !Array.isArray(userAnswers) ||
      userAnswers.length !== 5 ||
      !userAnswers.every(isValidAnswerIndex)
    ) {
      return Response.json(
        { error: 'user_answers must be an array of 5 integers (0-3)' },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdmin();

    const { data: round, error: roundErr } = await admin
      .from('quiz_rounds')
      .select('id, telegram_id, question_ids, completed_at')
      .eq('id', roundId)
      .maybeSingle();

    if (roundErr) {
      console.error('[api/quiz/submit] fetch round:', roundErr);
      return Response.json(
        { error: roundErr.message, code: roundErr.code },
        { status: 500 },
      );
    }

    if (!round) {
      return Response.json({ error: 'round_not_found' }, { status: 404 });
    }

    if (round.completed_at) {
      return Response.json({ error: 'round_already_completed' }, { status: 409 });
    }

    const questionIds = round.question_ids as unknown;
    if (!Array.isArray(questionIds) || questionIds.length !== 5) {
      return Response.json({ error: 'invalid_question_ids on round' }, { status: 500 });
    }

    const { data: questions, error: questionsErr } = await admin
      .from('quiz_questions')
      .select('id, correct_index')
      .in('id', questionIds);

    if (questionsErr) {
      console.error('[api/quiz/submit] fetch answers:', questionsErr);
      return Response.json(
        { error: questionsErr.message, code: questionsErr.code },
        { status: 500 },
      );
    }

    const answerById = new Map(
      (questions ?? []).map((q) => [q.id, q.correct_index as number]),
    );

    const correctAnswers: number[] = questionIds.map((qid) => {
      const answer = answerById.get(qid);
      if (typeof answer !== 'number' || answer < 0 || answer > 3) {
        throw new Error(`missing or invalid correct_index for question ${qid}`);
      }
      return answer;
    });

    let correctCount = 0;
    for (let i = 0; i < 5; i++) {
      if (userAnswers[i] === correctAnswers[i]) correctCount++;
    }

    const pointsEarned = pointsForCorrectCount(correctCount);
    const completedAt = new Date().toISOString();

    const { error: updateErr } = await admin
      .from('quiz_rounds')
      .update({
        correct_count: correctCount,
        points_earned: pointsEarned,
        user_answers: userAnswers,
        completed_at: completedAt,
      })
      .eq('id', roundId);

    if (updateErr) {
      console.error('[api/quiz/submit] update round:', updateErr);
      return Response.json(
        { error: updateErr.message, code: updateErr.code },
        { status: 500 },
      );
    }

    if (pointsEarned > 0) {
      const { error: txErr } = await admin.from('point_transactions').insert({
        user_id: round.telegram_id,
        amount: pointsEarned,
        reason: 'quiz_correct',
      });

      if (txErr) {
        console.error('[api/quiz/submit] point_transactions insert:', txErr);
        return Response.json(
          { error: txErr.message, code: txErr.code },
          { status: 500 },
        );
      }
    }

    return Response.json({
      correct_count: correctCount,
      points_earned: pointsEarned,
      correct_answers: correctAnswers,
    });
  } catch (err) {
    console.error('[api/quiz/submit] unexpected:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'internal_error' },
      { status: 500 },
    );
  }
}
