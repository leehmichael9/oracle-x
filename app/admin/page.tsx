'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { MARKET_CATEGORIES } from '@/lib/categories';
import {
  formatEndDateDisplay,
  isMarketExpiredByEndDate,
  toDatetimeLocalValue,
} from '@/lib/market';
import { supabase } from '@/lib/supabase';

type Market = {
  id: number;
  question: string;
  category: string;
  yes_percent: number;
  no_percent: number;
  status: string;
  result: string | null;
  end_date: string | null;
};


export default function AdminPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<string>(MARKET_CATEGORIES[0]);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editCategory, setEditCategory] = useState<string>(MARKET_CATEGORIES[0]);
  const [savingCategoryId, setSavingCategoryId] = useState<number | null>(null);
  const [categoryEditError, setCategoryEditError] = useState<string | null>(null);
  const [yesPercent, setYesPercent] = useState('');
  const [noPercent, setNoPercent] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingEndDateId, setEditingEndDateId] = useState<number | null>(null);
  const [editEndDate, setEditEndDate] = useState('');
  const [savingEndDateId, setSavingEndDateId] = useState<number | null>(null);
  const [endDateEditError, setEndDateEditError] = useState<string | null>(null);
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

    if (!endDate.trim()) {
      setFormError('마감일(end_date)을 입력해 주세요.');
      return;
    }
    const endDateIso = new Date(endDate).toISOString();
    if (Number.isNaN(new Date(endDate).getTime())) {
      setFormError('마감일 형식이 올바르지 않습니다.');
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
        end_date: endDateIso,
      });

      if (error) {
        setFormError(error.message ?? '마켓 생성에 실패했습니다.');
        return;
      }

      setQuestion('');
      setCategory(MARKET_CATEGORIES[0]);
      setYesPercent('');
      setNoPercent('');
      setEndDate('');
      setFormSuccess(true);
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmedQuestion, type: 'new_market' }),
      });
      await loadMarkets();
    } finally {
      setSubmitting(false);
    }
  }

  
  async function handleResolve(marketId: number, result: 'YES' | 'NO') {
    setResolvingId(marketId);
    setSettleMessage(null);
    setResolveError(null);
    try {
      const { data, error } = await supabase.rpc('settle_market', {
        p_market_id: marketId,
        p_result: result,
      });

      if (error) {
        setResolveError(error.message ?? '정산 처리에 실패했습니다.');
        return;
      }

      if (!data.success) {
        setResolveError(data.error);
        return;
      }

      setSettleMessage(
        `정산 완료! ${data.settled_count}명에게 포인트 지급 (총 풀: ${data.total_pool}P)`
      );

      const market = markets.find((m) => m.id === marketId);
      if (market) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: market.question, result }),
        });
      }
      await loadMarkets();
    } catch (err) {
      setResolveError(
        err instanceof Error ? err.message : '정산 처리에 실패했습니다.',
      );
    } finally {
      setResolvingId(null);
    }
  }
  async function handleDelete(marketId: number, question: string) {
    if (!window.confirm(`마켓을 삭제하시겠습니까?\n\n"${question}"\n\n이 작업은 되돌릴 수 없습니다.`)) return

    // 관련 베팅 먼저 삭제
    await supabase.from('bets').delete().eq('market_id', marketId)

    // 마켓 삭제
    const { error } = await supabase.from('markets').delete().eq('id', marketId)

    if (error) {
      alert('마켓 삭제에 실패했습니다: ' + error.message)
      return
    }

    await loadMarkets()
  }

  function startCategoryEdit(market: Market) {
    setCategoryEditError(null);
    setEditingCategoryId(market.id);
    setEditCategory(market.category);
  }

  function cancelCategoryEdit() {
    setEditingCategoryId(null);
    setCategoryEditError(null);
  }

  function startEndDateEdit(market: Market) {
    setEndDateEditError(null);
    setEditingEndDateId(market.id);
    setEditEndDate(toDatetimeLocalValue(market.end_date));
  }

  function cancelEndDateEdit() {
    setEditingEndDateId(null);
    setEndDateEditError(null);
  }

  async function handleSaveEndDate(marketId: number) {
    if (!editEndDate.trim()) {
      setEndDateEditError('마감일을 입력해 주세요.');
      return;
    }
    const parsed = new Date(editEndDate);
    if (Number.isNaN(parsed.getTime())) {
      setEndDateEditError('마감일 형식이 올바르지 않습니다.');
      return;
    }

    setSavingEndDateId(marketId);
    setEndDateEditError(null);
    try {
      const { error } = await supabase
        .from('markets')
        .update({ end_date: parsed.toISOString() })
        .eq('id', marketId);

      if (error) {
        setEndDateEditError(error.message ?? '마감일 저장에 실패했습니다.');
        return;
      }

      setEditingEndDateId(null);
      await loadMarkets();
    } finally {
      setSavingEndDateId(null);
    }
  }

  async function handleSaveCategory(marketId: number) {
    setSavingCategoryId(marketId);
    setCategoryEditError(null);
    try {
      const { error } = await supabase
        .from('markets')
        .update({ category: editCategory })
        .eq('id', marketId);

      if (error) {
        setCategoryEditError(error.message ?? '카테고리 저장에 실패했습니다.');
        return;
      }

      setEditingCategoryId(null);
      await loadMarkets();
    } finally {
      setSavingCategoryId(null);
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
              {MARKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="end_date" className="block text-sm text-gray-400 mb-2">
              마감일 (end_date)
            </label>
            <input
              id="end_date"
              type="datetime-local"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setFormSuccess(false);
              }}
              className="w-full rounded-lg bg-[#0a0f1e] border border-white/15 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
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
        {categoryEditError ? (
          <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2 mb-4">
            {categoryEditError}
          </p>
        ) : null}
        {endDateEditError ? (
          <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2 mb-4">
            {endDateEditError}
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
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {editingCategoryId === m.id ? (
                    <>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="rounded-md bg-[#0a0f1e] border border-white/15 px-2 py-1 text-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        {MARKET_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={savingCategoryId === m.id}
                        onClick={() => handleSaveCategory(m.id)}
                        className="px-2 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                      >
                        {savingCategoryId === m.id ? '저장 중...' : '저장'}
                      </button>
                      <button
                        type="button"
                        disabled={savingCategoryId === m.id}
                        onClick={cancelCategoryEdit}
                        className="px-2 py-1 rounded-md bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-50 transition-colors"
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="px-2 py-1 rounded-md bg-white/5 text-gray-300">
                        {m.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => startCategoryEdit(m)}
                        className="px-2 py-1 rounded-md bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        수정
                      </button>
                    </>
                  )}
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
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {editingEndDateId === m.id ? (
                    <>
                      <input
                        type="datetime-local"
                        value={editEndDate}
                        onChange={(e) => setEditEndDate(e.target.value)}
                        className="rounded-md bg-[#0a0f1e] border border-white/15 px-2 py-1 text-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                      <button
                        type="button"
                        disabled={savingEndDateId === m.id}
                        onClick={() => handleSaveEndDate(m.id)}
                        className="px-2 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                      >
                        {savingEndDateId === m.id ? '저장 중...' : '저장'}
                      </button>
                      <button
                        type="button"
                        disabled={savingEndDateId === m.id}
                        onClick={cancelEndDateEdit}
                        className="px-2 py-1 rounded-md bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-50 transition-colors"
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="px-2 py-1 rounded-md bg-white/5 text-gray-300">
                        마감: {formatEndDateDisplay(m.end_date)}
                        {isMarketExpiredByEndDate(m.end_date) ? ' (경과)' : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEndDateEdit(m)}
                        className="px-2 py-1 rounded-md bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        마감일 수정
                      </button>
                    </>
                  )}
                </div>
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
                <div className="pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => handleDelete(m.id, m.question)}
                className="w-full py-1.5 rounded-lg text-xs font-medium text-red-400 border border-red-900/50 hover:bg-red-950/50 transition-colors"
              >
                🗑️ 마켓 삭제
              </button>
            </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}