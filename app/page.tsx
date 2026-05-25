'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { getCategoryStyle, MARKET_CATEGORIES } from '@/lib/categories';
import {
  isMarketActiveForFilter,
  isMarketClosedForFilter,
  isMarketEnded,
  isMarketSettled,
} from '@/lib/market';
import { supabase } from '@/lib/supabase';
import { useTelegramUser } from '@/lib/useTelegramUser';

type CategoryFilter = '전체' | (typeof MARKET_CATEGORIES)[number];
type StatusFilter = 'active' | 'resolved';

const NEW_MARKET_MS = 72 * 60 * 60 * 1000;

type Market = {
  id: number;
  question: string;
  category: string;
  yes_percent: number;
  no_percent: number;
  status: string;
  result: 'YES' | 'NO' | null;
  created_at: string;
  end_date: string | null;
  is_breaking: boolean | null;
};

function isNewMarket(createdAt: string | undefined): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created < NEW_MARKET_MS;
}

export default function Home() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('전체');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMyInfo, setShowMyInfo] = useState(false);
  const { userId, loading: userLoading } = useTelegramUser();

  const filteredMarkets = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return markets.filter((m) => {
      if (keyword && !m.question.toLowerCase().includes(keyword)) return false;
      if (categoryFilter !== '전체' && m.category !== categoryFilter) return false;
      if (statusFilter === 'active' && !isMarketActiveForFilter(m)) return false;
      if (statusFilter === 'resolved' && !isMarketClosedForFilter(m)) return false;
      return true;
    });
  }, [markets, searchQuery, categoryFilter, statusFilter]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('markets').select('*');
      setMarkets(data ?? []);
      setLoading(false);
    }
    load();
  }, []);
  useEffect(() => {
    if (!userId) return;
    async function loadPoints() {
      const { data } = await supabase
        .from('users')
        .select('points')
        .eq('id', userId)
        .single();
      if (data) setPoints(data.points ?? 0);
    }
    loadPoints();
  }, [userId]);

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center py-4 px-4">
      <AppHeader
        showMyInfo={showMyInfo}
        onToggleMyInfo={() => setShowMyInfo((v) => !v)}
        points={points}
        pointsLoading={userLoading || (Boolean(userId) && points === null)}
      />
      <p className="text-gray-400 text-sm mb-4 w-full max-w-xl">
        Asia&apos;s No.1 Prediction Market
      </p>
      {loading || userLoading ? (
        <p className="text-gray-400">로딩 중...</p>
      ) : (
        <div className="flex flex-col gap-4 w-full max-w-xl">
          <div className="relative">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              aria-hidden
            >
              🔍
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="마켓 검색"
              className="w-full rounded-xl bg-[#111827] border border-white/10 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
            {searchQuery ? (
              <button
                type="button"
                aria-label="검색어 초기화"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
              >
                ✕
              </button>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {(['전체', ...MARKET_CATEGORIES] as CategoryFilter[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    categoryFilter === cat
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#111827] text-gray-400 border border-white/10 hover:text-white hover:border-white/20'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: 'active' as const, label: '진행중' },
                  { value: 'resolved' as const, label: '종료' },
                ] as const
              ).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === value
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#111827] text-gray-400 border border-white/10 hover:text-white hover:border-white/20'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filteredMarkets.length === 0 ? (
            <p className="text-gray-400 text-center py-8">해당 조건의 마켓이 없습니다.</p>
          ) : null}

          {filteredMarkets.map((m) => {
            const { emoji, bgColor } = getCategoryStyle(m.category);
            const showBreaking = Boolean(m.is_breaking);
            const showNew = isNewMarket(m.created_at);

            return (
              <Link
                key={m.id}
                href={`/market/${m.id}`}
                className="block bg-[#111827] border border-white/10 rounded-xl p-4 cursor-pointer transition-all hover:border-white/20 hover:bg-[#151d32] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
              >
                <div className="flex gap-3">
                  <div
                    className="shrink-0 w-16 h-16 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: bgColor }}
                    aria-hidden
                  >
                    <span
                      style={{
                        fontSize: '28px',
                        fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", sans-serif',
                      }}
                    >
                      {emoji}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-white text-sm font-medium leading-snug line-clamp-2 ${
                        showBreaking || showNew ? '' : 'mb-2'
                      }`}
                    >
                      {m.question}
                    </p>
                    {(showBreaking || showNew) && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        {showBreaking ? (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-600 text-white font-medium">
                            🔥 속보
                          </span>
                        ) : null}
                        {showNew ? (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-medium">
                            🆕 신규
                          </span>
                        ) : null}
                      </div>
                    )}
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-emerald-400">YES {m.yes_percent}%</span>
                      <span className="text-red-400">NO {m.no_percent}%</span>
                    </div>
                    <div className="flex rounded-full overflow-hidden h-2">
                      <div
                        className="bg-emerald-500"
                        style={{ width: `${m.yes_percent}%` }}
                      />
                      <div
                        className="bg-red-500"
                        style={{ width: `${m.no_percent}%` }}
                      />
                    </div>
                    {isMarketEnded(m) && (
                      <div
                        className={`text-xs font-bold px-2 py-1 rounded-lg text-center mt-2 ${
                          isMarketSettled(m)
                            ? m.result === 'YES'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'
                            : 'bg-gray-800/80 text-gray-400'
                        }`}
                      >
                        {isMarketSettled(m)
                          ? m.result === 'YES'
                            ? '✅ 종료 · YES'
                            : '❌ 종료 · NO'
                          : '⏱️ 마감 · 베팅 종료'}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
