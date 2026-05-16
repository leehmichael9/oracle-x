'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const CATEGORIES = [
  'XRP특화',
  '크립토가격',
  '거시경제',
  '지정학',
  '크립토산업',
] as const;

type Market = {
  id: number;
  question: string;
  category: string;
  yes_percent: number;
  no_percent: number;
  status: string;
  result: string | null;
};

type BetRow = {
  user_id: string;
  choice: string;
  amount: number;
};

export default function AdminPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [yesPercent, setYesPercent] = useState('');
  const [noPercent, setNoPercent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [settleMessage, setSettleMessage] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const loadMarkets = useCallback(async () => {
    setListLoading(true);
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .order('id', { ascending: false });
    if (!error) {
      setMarkets((data as Market[]) ?? []);
    }
    setListLoading(false);
  }, []);

  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setFormError('질문을 입력해 주세요.');
      return;
    }

    const yes = Number(yesPercent);
    const no = Number(noPercent);
    if (!Number.isFinite(yes) || !Number.isFinite(no)) {
      setFormError('YES/NO 비율은 숫자로 입력해 주세요.');
      return;
    }
    if (yes + no !== 100) {
      setFormError('YES 비율과 NO 비율의 합계는 100이어야 합니다.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('markets').insert({
        question: trimmedQuestion,
        category,
        yes_percent: yes,
        no_percent: no,
        status: 'active',
        result: null,
      });

      if (error) {
        setFormError(error.message ?? '마켓 생성에 실패했습니다.');
        return;
      }

      setQuestion('');
      setCategory(CATEGORIES[0]);
      setYesPercent('');
      setNoPercent('');
      setFormSuccess(true);
      await loadMarkets();
    } finally {
      setSubmitting(false);
    }
  }

  async function settleWinners(marketId: number, result: 'YES' | 'NO') {
    const { data: allBets, error: betsErr } = await supabase
      .from('bets')
      .select('user_id, choice, amount')
      .eq('market_id', marketId);

    if (betsErr) {
      throw new Error(betsErr.message ?? '베팅 조회에 실패했습니다.');
    }

    const bets = (allBets as BetRow[]) ?? [];
    const totalPool = bets.reduce((sum, b) => sum + b.amount, 0);
    const winningBets = bets.filter((b) => b.choice === result);
    const winningPool = winningBets.reduce((sum, b) => sum + b.amount, 0);

    const payoutByUser = new Map<string, number>();

    if (winningPool > 0) {
      for (const bet of winningBets) {
        const payout = Math.floor((bet.amount / winningPool) * totalPool);
        if (payout > 0) {
          payoutByUser.set(
            bet.user_id,
            (payoutByUser.get(bet.user_id) ?? 0) + payout,
          );
        }
      }
    }

    for (const [userId, payout] of payoutByUser) {
      const { data: userRow, error: userErr } = await supabase
        .from('users')
        .select('points')
        .eq('id', userId)
        .maybeSingle();

      if (userErr || userRow?.points == null) {
        throw new Error('승리자 포인트 지급에 실패했습니다.');
      }

      const { error: updateErr } = await supabase
        .from('users')
        .update({ points: userRow.points + payout })
        .eq('id', userId);

      if (updateErr) {
        throw new Error(updateErr.message ?? '승리자 포인트 지급에 실패했습니다.');
      }
    }

    return payoutByUser.size;
  }

  async function handleResolve(marketId: number, result: 'YES' | 'NO') {
    setResolvingId(marketId);
    setSettleMessage(null);
    setResolveError(null);
    try {
      const { error: marketErr } = await supabase
        .from('markets')
        .update({ status: 'resolved', result })
        .eq('id', marketId);

      if (marketErr) {
        setResolveError(marketErr.message ?? '마켓 결과 저장에 실패했습니다.');
        return;
      }

      const paidCount = await settleWinners(marketId, result);
      setSettleMessage(`정산 완료! ${paidCount}명에게 포인트 지급`);
      await loadMarkets();
    } catch (err) {
      setResolveError(
        err instanceof Error ? err.message : '정산 처리에 실패했습니다.',
      );
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center py-12 px-4">
      <p className="text-amber-400 text-sm font-medium tracking-wide mb-2">
        관리자 전용
      </p>
      <h1 className="text-3xl font-bold text-white mb-2">마켓 관리</h1>
      <Link
        href="/"
        className="text-sm text-gray-400 hover:text-white transition-colors mb-10"
      >
        ← 홈으로
      </Link>

      <section className="w-full max-w-xl mb-12">
        <h2 className="text-lg font-semibold text-white mb-4">마켓 생성</h2>
        <form
          onSubmit={handleCreate}
          className="bg-[#111827] border border-white/10 rounded-xl p-6 space-y-4"
        >
          <div>
            <label htmlFor="question" className="block text-sm text-gray-400 mb-2">
              질문
            </label>
            <input
              id="question"
              type="text"
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                setFormSuccess(false);
              }}
              className="w-full rounded-lg bg-[#0a0f1e] border border-white/15 px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              placeholder="예측 질문을 입력하세요"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm text-gray-400 mb-2">
              카테고리
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setFormSuccess(false);
              }}
              className="w-full rounded-lg bg-[#0a0f1e] border border-white/15 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="yes_percent" className="block text-sm text-gray-400 mb-2">
                YES 비율 (%)
              </label>
              <input
                id="yes_percent"
                type="number"
                min={0}
                max={100}
                value={yesPercent}
                onChange={(e) => {
                  setYesPercent(e.target.value);
                  setFormSuccess(false);
                }}
                className="w-full rounded-lg bg-[#0a0f1e] border border-white/15 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="no_percent" className="block text-sm text-gray-400 mb-2">
                NO 비율 (%)
              </label>
              <input
                id="no_percent"
                type="number"
                min={0}
                max={100}
                value={noPercent}
                onChange={(e) => {
                  setNoPercent(e.target.value);
                  setFormSuccess(false);
                }}
                className="w-full rounded-lg bg-[#0a0f1e] border border-white/15 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              />
            </div>
          </div>

          {formError ? (
            <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
              {formError}
            </p>
          ) : null}

          {formSuccess ? (
            <p className="text-center text-emerald-400 font-semibold py-2">
              마켓 생성 완료!
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-lg shadow-emerald-900/30"
          >
            {submitting ? '생성 중...' : '마켓 생성'}
          </button>
        </form>
      </section>

      <section className="w-full max-w-xl">
        <h2 className="text-lg font-semibold text-white mb-4">마켓 목록</h2>
        {settleMessage ? (
          <p className="text-center text-emerald-400 font-semibold mb-4 py-2 bg-emerald-950/30 border border-emerald-900/50 rounded-lg">
            {settleMessage}
          </p>
        ) : null}
        {resolveError ? (
          <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2 mb-4">
            {resolveError}
          </p>
        ) : null}
        {listLoading ? (
          <p className="text-gray-400">로딩 중...</p>
        ) : markets.length === 0 ? (
          <p className="text-gray-400">등록된 마켓이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {markets.map((m) => (
              <div
                key={m.id}
                className="bg-[#111827] border border-white/10 rounded-xl p-5 space-y-3"
              >
                <p className="text-white font-medium">{m.question}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded-md bg-white/5 text-gray-300">
                    {m.category}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-md ${
                      m.status === 'active'
                        ? 'bg-emerald-950/50 text-emerald-400'
                        : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {m.status}
                  </span>
                  <span className="px-2 py-1 rounded-md bg-white/5 text-gray-300">
                    결과: {m.result ?? '—'}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  YES {m.yes_percent}% · NO {m.no_percent}%
                </p>
                {m.status === 'active' ? (
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      disabled={resolvingId === m.id}
                      onClick={() => handleResolve(m.id, 'YES')}
                      className="flex-1 py-2 rounded-lg font-semibold text-sm bg-emerald-600 border border-emerald-400 text-white hover:bg-emerald-500 disabled:opacity-50 transition-all"
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      disabled={resolvingId === m.id}
                      onClick={() => handleResolve(m.id, 'NO')}
                      className="flex-1 py-2 rounded-lg font-semibold text-sm bg-red-600 border border-red-400 text-white hover:bg-red-500 disabled:opacity-50 transition-all"
                    >
                      NO
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}