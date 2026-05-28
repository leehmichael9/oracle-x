'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BET_SUBMIT_BG, YES_COLOR } from '@/lib/categories';
import { useTelegramUser } from '@/lib/useTelegramUser';

const QUIZ_DURATION_SEC = 60;
const TOTAL_QUESTIONS = 5;
const UNANSWERED = -1;
const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

const POINTS_GUIDE = [
  { label: '1문제 정답 → 10P' },
  { label: '2문제 정답 → 20P' },
  { label: '3문제 정답 → 30P' },
  { label: '4문제 정답 → 40P' },
  { label: '5문제 전부 정답 → 100P ⭐' },
] as const;

type ScreenStatus = 'idle' | 'playing' | 'result';

type QuizQuestion = {
  id: number | string;
  question: string;
  options: string[];
};

type QuizResult = {
  correct_count: number;
  points_earned: number;
  correct_answers: number[];
};

function getTelegramId(): string {
  const tg = (window as Window & { Telegram?: { WebApp?: TelegramWebApp } })
    .Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user) {
    return String(tg.initDataUnsafe.user.id);
  }
  return 'test_user_001';
}

function normalizeOptions(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options.map((o) => String(o));
}

function timerBarColor(secondsLeft: number): string {
  const ratio = secondsLeft / QUIZ_DURATION_SEC;
  if (ratio > 0.5) return '#34d399';
  if (ratio > 0.3) return '#fbbf24';
  return '#f87171';
}

export default function QuizPage() {
  const { loading: userLoading } = useTelegramUser();

  const [status, setStatus] = useState<ScreenStatus>('idle');
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [roundsToday, setRoundsToday] = useState(0);
  const [roundsRemaining, setRoundsRemaining] = useState(3);

  const [roundId, setRoundId] = useState<string | number | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(QUIZ_DURATION_SEC);

  const [result, setResult] = useState<QuizResult | null>(null);
  const [reviewAnswers, setReviewAnswers] = useState<number[]>([]);

  const submitLockRef = useRef(false);
  const answersRef = useRef<number[]>([]);
  const roundIdRef = useRef<string | number | null>(null);
  const finishQuizRef = useRef<(answers: number[]) => void>(() => {});

  const loadStatus = useCallback(async () => {
    const telegramId = getTelegramId();
    const res = await fetch(
      `/api/quiz/status?telegram_id=${encodeURIComponent(telegramId)}`,
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? '상태 조회 실패');
    }
    setRoundsToday(data.rounds_today ?? 0);
    setRoundsRemaining(data.rounds_remaining ?? 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setPageLoading(true);
      setError(null);
      try {
        await loadStatus();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '상태를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    }
    if (!userLoading) init();
    return () => {
      cancelled = true;
    };
  }, [userLoading, loadStatus]);

  const submitQuiz = useCallback(
    async (finalAnswers: number[], review: number[]) => {
      if (submitLockRef.current || !roundIdRef.current) return;
      submitLockRef.current = true;
      setActionLoading(true);
      setError(null);

      const payloadAnswers = finalAnswers.map((a) =>
        a === UNANSWERED ? 0 : a,
      );

      try {
        const res = await fetch('/api/quiz/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            round_id: roundIdRef.current,
            user_answers: payloadAnswers,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? '제출 실패');
        }

        setResult({
          correct_count: data.correct_count,
          points_earned: data.points_earned,
          correct_answers: data.correct_answers,
        });
        setReviewAnswers(review);
        setStatus('result');
        await loadStatus();
      } catch (e) {
        setError(e instanceof Error ? e.message : '제출 중 오류가 발생했습니다.');
        setStatus('idle');
      } finally {
        setActionLoading(false);
      }
    },
    [loadStatus],
  );

  const finishQuiz = useCallback(
    (currentAnswers: number[]) => {
      const padded = [...currentAnswers];
      while (padded.length < TOTAL_QUESTIONS) {
        padded.push(UNANSWERED);
      }
      const review = padded.slice(0, TOTAL_QUESTIONS);
      submitQuiz(review, review);
    },
    [submitQuiz],
  );

  finishQuizRef.current = finishQuiz;

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (status !== 'playing') return;

    setSecondsLeft(QUIZ_DURATION_SEC);
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          finishQuizRef.current(answersRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [status]);

  async function handleStart() {
    if (roundsRemaining <= 0 || actionLoading) return;
    setActionLoading(true);
    setError(null);
    submitLockRef.current = false;

    try {
      const res = await fetch('/api/quiz/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: getTelegramId() }),
      });
      const data = await res.json();

      if (res.status === 429 || data.error === 'daily_limit_reached') {
        setRoundsRemaining(0);
        setError('오늘 퀴즈 횟수를 모두 사용했습니다.');
        return;
      }
      if (!res.ok) {
        throw new Error(data.error ?? '퀴즈 시작 실패');
      }

      const qs: QuizQuestion[] = (data.questions ?? []).map(
        (q: { id: number | string; question: string; options: unknown }) => ({
          id: q.id,
          question: q.question,
          options: normalizeOptions(q.options),
        }),
      );

      setRoundId(data.round_id);
      roundIdRef.current = data.round_id;
      setQuestions(qs);
      setCurrentIndex(0);
      setAnswers([]);
      answersRef.current = [];
      setSecondsLeft(QUIZ_DURATION_SEC);
      setResult(null);
      setReviewAnswers([]);
      setStatus('playing');
    } catch (e) {
      setError(e instanceof Error ? e.message : '퀴즈를 시작하지 못했습니다.');
    } finally {
      setActionLoading(false);
    }
  }

  function handleSelectOption(optionIndex: number) {
    if (status !== 'playing' || actionLoading) return;

    const nextAnswers = [...answersRef.current, optionIndex];
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);

    if (nextAnswers.length >= TOTAL_QUESTIONS) {
      finishQuiz(nextAnswers);
      return;
    }

    setCurrentIndex(nextAnswers.length);
  }

  function handleRetry() {
    setStatus('idle');
    setResult(null);
    setReviewAnswers([]);
    setRoundId(null);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setError(null);
    submitLockRef.current = false;
  }

  const showSpinner = userLoading || pageLoading;
  const currentQuestion = questions[currentIndex];
  const progressRatio =
    status === 'playing'
      ? Math.max(0, secondsLeft / QUIZ_DURATION_SEC)
      : 0;

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center pt-20 px-4 pb-12">
      <div className="fixed top-0 left-0 right-0 z-50 w-full flex justify-center bg-[#0a0f1e] py-2 px-4">
        <div className="w-full max-w-xl flex items-center justify-between gap-3">
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
          >
            ← 홈으로
          </Link>
          <h1 className="text-xl font-bold text-white">🧩 퀴즈</h1>
          <span className="w-[56px]" aria-hidden />
        </div>
      </div>

      <div className="w-full max-w-xl space-y-4">
        {error ? (
          <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
            {error}
          </p>
        ) : null}

        {showSpinner ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div
              className="w-10 h-10 rounded-full border-2 border-white/20 border-t-[#34d399] animate-spin"
              aria-hidden
            />
            <p className="text-gray-400 text-sm">로딩 중...</p>
          </div>
        ) : null}

        {!showSpinner && status === 'idle' ? (
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">
              오늘{' '}
              <span className="text-white font-semibold tabular-nums">
                {roundsRemaining}회
              </span>{' '}
              남음 / 3회 중
            </p>

            <div className="bg-[#111827] border border-white/10 rounded-xl p-5 space-y-2">
              <p className="text-sm font-semibold text-gray-200 mb-3">
                포인트 안내
              </p>
              <ul className="space-y-1.5 text-sm text-gray-300">
                {POINTS_GUIDE.map((row) => (
                  <li key={row.label}>{row.label}</li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              disabled={roundsRemaining <= 0 || actionLoading}
              onClick={handleStart}
              className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
              style={{ background: BET_SUBMIT_BG }}
            >
              {actionLoading ? '시작 중...' : '퀴즈 시작'}
            </button>

            {roundsRemaining <= 0 ? (
              <p className="text-center text-gray-500 text-sm">
                내일 오전 0시 초기화
              </p>
            ) : null}
          </div>
        ) : null}

        {!showSpinner && status === 'playing' && currentQuestion ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">남은 시간</span>
                <span
                  className="font-bold tabular-nums text-lg"
                  style={{ color: timerBarColor(secondsLeft) }}
                >
                  {secondsLeft}초
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full transition-all duration-1000 linear rounded-full"
                  style={{
                    width: `${progressRatio * 100}%`,
                    backgroundColor: timerBarColor(secondsLeft),
                  }}
                />
              </div>
            </div>

            <p className="text-sm text-gray-400">
              문제 {currentIndex + 1} / {TOTAL_QUESTIONS}
            </p>

            <h2 className="text-xl font-semibold text-white leading-snug">
              {currentQuestion.question}
            </h2>

            <div className="flex flex-col gap-2">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleSelectOption(idx)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-white/15 bg-white/5 text-gray-100 hover:bg-white/10 hover:border-white/25 transition-colors disabled:opacity-50"
                >
                  <span className="text-gray-400 font-semibold mr-2">
                    {OPTION_LABELS[idx]}.
                  </span>
                  {option}
                </button>
              ))}
            </div>

            {actionLoading ? (
              <p className="text-center text-gray-400 text-sm">채점 중...</p>
            ) : null}
          </div>
        ) : null}

        {!showSpinner && status === 'result' && result ? (
          <div className="space-y-5">
            <div className="bg-[#111827] border border-white/10 rounded-xl p-6 text-center space-y-2">
              <p className="text-gray-400 text-sm">정답 수</p>
              <p className="text-4xl font-bold text-white tabular-nums">
                {result.correct_count}{' '}
                <span className="text-2xl text-gray-500">/ 5</span>
              </p>
              <p
                className="text-2xl font-bold tabular-nums"
                style={{ color: YES_COLOR }}
              >
                +{result.points_earned}P
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-300">문제별 리뷰</p>
              {questions.map((q, i) => {
                const userAnswer = reviewAnswers[i];
                const correctIndex = result.correct_answers[i];
                const isUnanswered = userAnswer === UNANSWERED;
                const isCorrect =
                  !isUnanswered && userAnswer === correctIndex;
                const correctLabel =
                  q.options[correctIndex] ?? `선택지 ${correctIndex + 1}`;

                return (
                  <div
                    key={String(q.id)}
                    className="bg-[#111827] border border-white/10 rounded-xl p-4 space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg shrink-0">
                        {isCorrect ? '✅' : '❌'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-400 mb-1">
                          {i + 1}번
                          {isUnanswered ? ' · 미응답' : ''}
                        </p>
                        <p className="text-white text-sm leading-relaxed">
                          {q.question}
                        </p>
                        <p className="text-sm mt-2" style={{ color: YES_COLOR }}>
                          정답: {OPTION_LABELS[correctIndex]}. {correctLabel}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {roundsRemaining > 0 ? (
              <button
                type="button"
                onClick={handleRetry}
                disabled={actionLoading}
                className="w-full py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: BET_SUBMIT_BG }}
              >
                다시 도전
              </button>
            ) : (
              <p className="text-center text-gray-300 py-4">
                오늘 퀴즈 완료! 내일 또 도전하세요 🎉
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface TelegramWebApp {
  initDataUnsafe?: {
    user?: {
      id: number;
    };
  };
}
