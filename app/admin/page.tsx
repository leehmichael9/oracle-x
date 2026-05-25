'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MARKET_CATEGORIES, normalizeCategory } from '@/lib/categories';
import { isMarketExpiredByEndDate, toDatetimeLocalValue } from '@/lib/market';
import { supabase } from '@/lib/supabase';

type Market = {
  id: number;
  question: string;
  category: string;
  sub_category: string | null;
  yes_percent: number;
  no_percent: number;
  status: string;
  result: string | null;
  end_date: string | null;
  is_breaking: boolean;
};

type AdminDisplayStatus = 'active' | 'ended' | 'settled';
type StatusFilter = 'all' | AdminDisplayStatus;
type EndDateSort = 'asc' | 'desc';

function getAdminMarketStatus(m: Market): AdminDisplayStatus {
  if (m.status === 'resolved') return 'settled';
  if (m.status === 'active' && isMarketExpiredByEndDate(m.end_date)) return 'ended';
  return 'active';
}

function formatAdminEndDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function StatusBadge({ status }: { status: AdminDisplayStatus }) {
  const config = {
    active: {
      label: '진행중',
      className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    },
    ended: {
      label: '마감',
      className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    },
    settled: {
      label: '정산완료',
      className: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    },
  }[status];

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${config.className}`}
    >
      {config.label}
    </span>
  );
}

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'active', label: '진행중' },
  { value: 'ended', label: '마감' },
  { value: 'settled', label: '정산완료' },
];

export default function AdminPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [expandSettleId, setExpandSettleId] = useState<number | null>(null);

  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<string>(MARKET_CATEGORIES[0]);
  const [subCategory, setSubCategory] = useState('');
  const [yesPercent, setYesPercent] = useState('50');
  const [noPercent, setNoPercent] = useState('50');
  const [endDate, setEndDate] = useState('');
  const [isBreaking, setIsBreaking] = useState(false);
  const [editingEndDateId, setEditingEndDateId] = useState<number | null>(null);
  const [editEndDate, setEditEndDate] = useState('');
  const [savingEndDateId, setSavingEndDateId] = useState<number | null>(null);
  const [endDateEditError, setEndDateEditError] = useState<string | null>(null);
  const [editingSubCategoryId, setEditingSubCategoryId] = useState<number | null>(null);
  const [editSubCategory, setEditSubCategory] = useState('');
  const [savingSubCategoryId, setSavingSubCategoryId] = useState<number | null>(null);
  const [subCategoryEditError, setSubCategoryEditError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [settleMessage, setSettleMessage] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('전체');
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('전체');
  const [endDateSort, setEndDateSort] = useState<EndDateSort>('asc');

  const subCategoryOptions = useMemo(() => {
    if (categoryFilter === '전체') return [];
    const subs = new Set<string>();
    for (const m of markets) {
      if (
        normalizeCategory(m.category) === categoryFilter &&
        m.sub_category?.trim()
      ) {
        subs.add(m.sub_category.trim());
      }
    }
    return Array.from(subs).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [markets, categoryFilter]);

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

  const displayMarkets = useMemo(() => {
    let list = [...markets];

    if (statusFilter !== 'all') {
      list = list.filter((m) => getAdminMarketStatus(m) === statusFilter);
    }
    if (categoryFilter !== '전체') {
      list = list.filter(
        (m) => normalizeCategory(m.category) === categoryFilter,
      );
    }
    if (subCategoryFilter !== '전체') {
      list = list.filter((m) => (m.sub_category?.trim() ?? '') === subCategoryFilter);
    }

    list.sort((a, b) => {
      const ta = a.end_date ? new Date(a.end_date).getTime() : 0;
      const tb = b.end_date ? new Date(b.end_date).getTime() : 0;
      return endDateSort === 'asc' ? ta - tb : tb - ta;
    });

    return list;
  }, [markets, statusFilter, categoryFilter, subCategoryFilter, endDateSort]);

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
        sub_category: subCategory.trim() || null,
        yes_percent: yes,
        no_percent: no,
        status: 'active',
        result: null,
        end_date: endDateIso,
        is_breaking: isBreaking,
      });

      if (error) {
        setFormError(error.message ?? '마켓 생성에 실패했습니다.');
        return;
      }

      setQuestion('');
      setCategory(MARKET_CATEGORIES[0]);
      setSubCategory('');
      setYesPercent('50');
      setNoPercent('50');
      setEndDate('');
      setIsBreaking(false);
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
        `정산 완료! ${data.settled_count}명에게 포인트 지급 (총 풀: ${data.total_pool}P)`,
      );
      setExpandSettleId(null);

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

  async function handleDelete(marketId: number) {
    if (!window.confirm('이 마켓을 삭제하시겠습니까?')) return;

    await supabase.from('bets').delete().eq('market_id', marketId);

    const { error } = await supabase.from('markets').delete().eq('id', marketId);

    if (error) {
      alert('마켓 삭제에 실패했습니다: ' + error.message);
      return;
    }

    await loadMarkets();
  }

  function startSubCategoryEdit(market: Market) {
    setSubCategoryEditError(null);
    setExpandSettleId(null);
    setEditingEndDateId(null);
    setEditingSubCategoryId(market.id);
    setEditSubCategory(market.sub_category ?? '');
  }

  function cancelSubCategoryEdit() {
    setEditingSubCategoryId(null);
    setSubCategoryEditError(null);
  }

  async function handleSaveSubCategory(marketId: number) {
    setSavingSubCategoryId(marketId);
    setSubCategoryEditError(null);
    try {
      const value = editSubCategory.trim() || null;
      const { error } = await supabase
        .from('markets')
        .update({ sub_category: value })
        .eq('id', marketId);

      if (error) {
        setSubCategoryEditError(error.message ?? '세분류 저장에 실패했습니다.');
        return;
      }

      setEditingSubCategoryId(null);
      await loadMarkets();
    } finally {
      setSavingSubCategoryId(null);
    }
  }

  function startEndDateEdit(market: Market) {
    setEndDateEditError(null);
    setSubCategoryEditError(null);
    setExpandSettleId(null);
    setEditingSubCategoryId(null);
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

  function toggleEndDateSort() {
    setEndDateSort((s) => (s === 'asc' ? 'desc' : 'asc'));
  }

  const thClass =
    'px-3 py-2.5 text-left text-xs font-semibold text-gray-400 whitespace-nowrap';
  const tdClass = 'px-3 py-2.5 text-sm text-gray-300 align-middle';

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center py-12 px-4">
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

      <section className="w-full max-w-6xl mb-12">
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
              카테고리 (대분류)
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
            <label htmlFor="sub_category" className="block text-sm text-gray-400 mb-2">
              세분류 <span className="text-gray-600">(선택)</span>
            </label>
            <input
              id="sub_category"
              type="text"
              value={subCategory}
              onChange={(e) => {
                setSubCategory(e.target.value);
                setFormSuccess(false);
              }}
              placeholder="세분류 입력 (예: XRP, 국내정치, FOMC·금리)"
              className="w-full rounded-lg bg-[#0a0f1e] border border-white/15 px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
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

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isBreaking}
              onChange={(e) => {
                setIsBreaking(e.target.checked);
                setFormSuccess(false);
              }}
              className="w-4 h-4 rounded border-white/20 bg-[#0a0f1e] text-emerald-600 focus:ring-emerald-500/50"
            />
            <span className="text-sm text-gray-300">🔥 속보 마켓으로 지정</span>
          </label>

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

      <section className="w-full max-w-6xl">
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
        {endDateEditError ? (
          <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2 mb-4">
            {endDateEditError}
          </p>
        ) : null}
        {subCategoryEditError ? (
          <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2 mb-4">
            {subCategoryEditError}
          </p>
        ) : null}

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  statusFilter === value
                    ? 'bg-[#1e293b] text-white border-white/20'
                    : 'bg-[#111827] text-gray-400 border-white/10 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setSubCategoryFilter('전체');
            }}
            className="rounded-lg bg-[#111827] border border-white/10 px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="전체">대분류: 전체</option>
            {MARKET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={subCategoryFilter}
            onChange={(e) => setSubCategoryFilter(e.target.value)}
            disabled={categoryFilter === '전체'}
            className="rounded-lg bg-[#111827] border border-white/10 px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="전체">세분류: 전체</option>
            {subCategoryOptions.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500">
            {displayMarkets.length}건 표시
          </span>
        </div>

        {listLoading ? (
          <p className="text-gray-400">로딩 중...</p>
        ) : markets.length === 0 ? (
          <p className="text-gray-400">등록된 마켓이 없습니다.</p>
        ) : displayMarkets.length === 0 ? (
          <p className="text-gray-400">필터 조건에 맞는 마켓이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[1020px] border-collapse text-left">
              <thead>
                <tr className="bg-[#1e293b] border-b border-white/10">
                  <th className={thClass}>#</th>
                  <th className={`${thClass} min-w-[200px]`}>질문</th>
                  <th className={thClass}>대분류</th>
                  <th className={thClass}>세분류</th>
                  <th className={thClass}>상태</th>
                  <th className={thClass}>YES% / NO%</th>
                  <th className={thClass}>
                    <button
                      type="button"
                      onClick={toggleEndDateSort}
                      className="inline-flex items-center gap-1 hover:text-white transition-colors"
                    >
                      마감일
                      <span className="text-gray-500">
                        {endDateSort === 'asc' ? '↑' : '↓'}
                      </span>
                    </button>
                  </th>
                  <th className={`${thClass} text-center`}>속보</th>
                  <th className={thClass}>결과</th>
                  <th className={`${thClass} min-w-[200px]`}>액션</th>
                </tr>
              </thead>
              <tbody>
                {displayMarkets.map((m, index) => {
                  const displayStatus = getAdminMarketStatus(m);
                  const isSettled = displayStatus === 'settled';
                  const isEditingEndDate = editingEndDateId === m.id;
                  const isEditingSubCategory = editingSubCategoryId === m.id;
                  const isSettleExpanded = expandSettleId === m.id;

                  return (
                    <tr
                      key={m.id}
                      className={`border-b border-white/5 ${
                        index % 2 === 0 ? 'bg-[#111827]' : 'bg-[#0f172a]'
                      }`}
                    >
                      <td className={`${tdClass} text-gray-500 tabular-nums`}>
                        {m.id}
                      </td>
                      <td className={tdClass}>
                        <p
                          className="max-w-[280px] truncate text-white font-medium"
                          title={m.question}
                        >
                          {m.question}
                        </p>
                      </td>
                      <td className={`${tdClass} text-xs whitespace-nowrap`}>
                        {normalizeCategory(m.category)}
                      </td>
                      <td className={`${tdClass} text-xs min-w-[90px]`}>
                        {isEditingSubCategory ? (
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              value={editSubCategory}
                              onChange={(e) => setEditSubCategory(e.target.value)}
                              placeholder="세분류"
                              className="w-full min-w-[100px] rounded bg-[#0a0f1e] border border-white/15 px-1.5 py-1 text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                disabled={savingSubCategoryId === m.id}
                                onClick={() => handleSaveSubCategory(m.id)}
                                className="px-2 py-0.5 rounded text-xs bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                              >
                                저장
                              </button>
                              <button
                                type="button"
                                disabled={savingSubCategoryId === m.id}
                                onClick={cancelSubCategoryEdit}
                                className="px-2 py-0.5 rounded text-xs bg-white/5 text-gray-300 hover:bg-white/10"
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startSubCategoryEdit(m)}
                            className="text-left rounded p-1 -m-1 hover:bg-white/5 transition-colors whitespace-nowrap"
                            title="클릭하여 세분류 수정"
                          >
                            {m.sub_category?.trim() ? (
                              <span className="text-gray-300">{m.sub_category.trim()}</span>
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </button>
                        )}
                      </td>
                      <td className={tdClass}>
                        <StatusBadge status={displayStatus} />
                      </td>
                      <td className={`${tdClass} whitespace-nowrap tabular-nums text-xs`}>
                        <span className="text-emerald-400">YES {m.yes_percent}%</span>
                        <span className="text-gray-600 mx-1">/</span>
                        <span className="text-red-400">NO {m.no_percent}%</span>
                      </td>
                      <td className={`${tdClass} whitespace-nowrap text-xs tabular-nums`}>
                        {formatAdminEndDate(m.end_date)}
                      </td>
                      <td className={`${tdClass} text-center`}>
                        {m.is_breaking ? (
                          <span title="속보">🔥</span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className={`${tdClass} whitespace-nowrap text-xs`}>
                        {m.result === 'YES' ? (
                          <span className="text-emerald-400">YES</span>
                        ) : m.result === 'NO' ? (
                          <span className="text-red-400">NO</span>
                        ) : (
                          <span className="text-gray-500">미정</span>
                        )}
                      </td>
                      <td className={tdClass}>
                        {isEditingEndDate ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <input
                              type="datetime-local"
                              value={editEndDate}
                              onChange={(e) => setEditEndDate(e.target.value)}
                              className="rounded bg-[#0a0f1e] border border-white/15 px-1.5 py-1 text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                            />
                            <button
                              type="button"
                              disabled={savingEndDateId === m.id}
                              onClick={() => handleSaveEndDate(m.id)}
                              className="px-2 py-1 rounded text-xs bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              disabled={savingEndDateId === m.id}
                              onClick={cancelEndDateEdit}
                              className="px-2 py-1 rounded text-xs bg-white/5 text-gray-300 hover:bg-white/10"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1">
                            {isSettleExpanded ? (
                              <>
                                <button
                                  type="button"
                                  disabled={resolvingId === m.id}
                                  onClick={() => handleResolve(m.id, 'YES')}
                                  className="px-2 py-1 rounded text-xs font-medium bg-emerald-600/80 text-white hover:bg-emerald-500 disabled:opacity-50"
                                >
                                  YES
                                </button>
                                <button
                                  type="button"
                                  disabled={resolvingId === m.id}
                                  onClick={() => handleResolve(m.id, 'NO')}
                                  className="px-2 py-1 rounded text-xs font-medium bg-red-600/80 text-white hover:bg-red-500 disabled:opacity-50"
                                >
                                  NO
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExpandSettleId(null)}
                                  className="px-2 py-1 rounded text-xs bg-white/5 text-gray-300 hover:bg-white/10"
                                >
                                  취소
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled={isSettled}
                                onClick={() => {
                                  setExpandSettleId(m.id);
                                  setEditingEndDateId(null);
                                  setEditingSubCategoryId(null);
                                }}
                                className="px-2 py-1 rounded text-xs font-medium border border-white/15 text-gray-200 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:text-gray-500"
                              >
                                정산
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => startEndDateEdit(m)}
                              className="px-2 py-1 rounded text-xs font-medium border border-white/15 text-gray-300 hover:bg-white/5"
                            >
                              마감일수정
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(m.id)}
                              className="px-2 py-1 rounded text-xs font-medium border border-red-900/50 text-red-400 hover:bg-red-950/40"
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
