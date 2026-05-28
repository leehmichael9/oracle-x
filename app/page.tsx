'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BottomNav, type BottomNavTab } from '@/components/BottomNav';
import { YesNoButton, YesNoButtonGroup } from '@/components/YesNoButton';
import {
  getCategoryImage,
  getSettledResultBadgeStyle,
  MARKET_CATEGORIES,
  normalizeCategory,
} from '@/lib/categories';
import {
  isMarketActiveForFilter,
  isMarketClosedForFilter,
  isMarketEnded,
  isMarketSettled,
} from '@/lib/market';
import { supabase } from '@/lib/supabase';
import { useTelegramUser } from '@/lib/useTelegramUser';

// ─── 상수 (컴포넌트 외부 — 렌더링마다 재생성 방지) ───────────────
const GLOBAL_HEADER_HEIGHT = 88;
const FIXED_TOP_GAP = 16;
const MIN_CONTENT_TOP_PADDING = 188;
const NEW_MARKET_MS = 72 * 60 * 60 * 1000;
const TRENDING_TAGS: {
  label: string;
  category: CategoryFilter;
}[] = [
  { label: '🔥 XRP', category: '크립토' },
  { label: '🇺🇸 FOMC', category: '경제/금융' },
  { label: '🌏 지정학', category: '지정학' },
  { label: '⚡ BTC', category: '크립토' },
  { label: '🇰🇷 한국', category: '한국 증시/경제' },
  { label: '🤖 AI', category: '테크/AI' },
  { label: '⚽ 스포츠', category: '스포츠' },
];

// ─── 타입 ────────────────────────────────────────────────────────
type CategoryFilter = '전체' | (typeof MARKET_CATEGORIES)[number];
type StatusFilter = 'active' | 'resolved';

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
  image_url: string | null;
};

// ─── 유틸 함수 ───────────────────────────────────────────────────
function isNewMarket(createdAt: string | undefined): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created < NEW_MARKET_MS;
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────────
export default function Home() {
  const localHeaderTop = GLOBAL_HEADER_HEIGHT;
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('전체');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [breakingOnly, setBreakingOnly] = useState(false);
  const [navTab, setNavTab] = useState<BottomNavTab>('home');
  const [localHeaderHeight, setLocalHeaderHeight] = useState(0);
  const [stickyTabsHeight, setStickyTabsHeight] = useState(0);

  const localHeaderRef = useRef<HTMLDivElement>(null);
  const stickyTabsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const categoryTabsRef = useRef<HTMLDivElement>(null);
  const statusTabsRef = useRef<HTMLDivElement>(null);
  const trendingTagsRef = useRef<HTMLDivElement>(null);

  const { userId, loading: userLoading } = useTelegramUser();

  // ─── 마켓 필터링 ─────────────────────────────────────────────
  const filteredMarkets = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return markets.filter((m) => {
      if (breakingOnly && !m.is_breaking) return false;
      if (keyword && !m.question.toLowerCase().includes(keyword)) return false;
      if (categoryFilter !== '전체' && m.category !== categoryFilter) return false;
      if (statusFilter === 'active' && !isMarketActiveForFilter(m)) return false;
      if (statusFilter === 'resolved' && !isMarketClosedForFilter(m)) return false;
      return true;
    });
  }, [markets, breakingOnly, searchQuery, categoryFilter, statusFilter]);

  // ─── 하단 네비 핸들러 ────────────────────────────────────────
  function handleNavHome() {
    setNavTab('home');
    setBreakingOnly(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleNavSearch() {
    setNavTab('search');
    setBreakingOnly(false);
    searchInputRef.current?.focus();
    searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function handleNavBreaking() {
    setNavTab('breaking');
    setBreakingOnly(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleNavProfile() {
    router.push('/profile');
  }

  // ─── 마켓 데이터 로드 ────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('markets').select('*');
      setMarkets(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  // ─── 카테고리 탭 마우스 휠 가로 스크롤 ──────────────────────
  useEffect(() => {
    const el = categoryTabsRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => { e.preventDefault(); el.scrollLeft += e.deltaY; };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  useEffect(() => {
    const el = statusTabsRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => { e.preventDefault(); el.scrollLeft += e.deltaY; };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  useEffect(() => {
    const el = trendingTagsRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => { e.preventDefault(); el.scrollLeft += e.deltaY; };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // ─── 고정 헤더 높이 측정 (콘텐츠 top padding 계산용) ────────
  useEffect(() => {
    const updateHeights = () => {
      setLocalHeaderHeight(localHeaderRef.current?.offsetHeight ?? 0);
      setStickyTabsHeight(stickyTabsRef.current?.offsetHeight ?? 0);
    };
    const raf = window.requestAnimationFrame(updateHeights);
    window.addEventListener('resize', updateHeights);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateHeights);
    };
  }, [loading, userLoading]);

  const contentTopPadding = Math.max(
    localHeaderHeight + stickyTabsHeight + FIXED_TOP_GAP,
    MIN_CONTENT_TOP_PADDING,
  );

  // ─── 렌더 ────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-[#0a0f1e] flex flex-col items-center px-4 pb-20"
      style={{ paddingTop: contentTopPadding }}
    >
      {/* 검색창 고정 헤더 */}
      <div
        ref={localHeaderRef}
        className="fixed left-0 right-0 z-40 w-full flex flex-col items-center bg-[#0a0f1e] px-4 pb-3"
        style={{ top: localHeaderTop }}
      >
        <div
          ref={categoryTabsRef}
          className="w-full max-w-xl flex gap-2 overflow-x-auto no-scrollbar mb-2"
        >
          {(['전체', ...MARKET_CATEGORIES] as CategoryFilter[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setCategoryFilter(cat);
                setBreakingOnly(false);
                setNavTab('home');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border whitespace-nowrap shrink-0 ${
                categoryFilter === cat
                  ? 'text-white border-[#34d399]/40'
                  : 'bg-[#111827] text-gray-400 border-white/10 hover:text-white hover:border-white/20'
              }`}
              style={categoryFilter === cat ? { backgroundColor: 'rgba(52,211,153,0.2)' } : undefined}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xl">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            aria-hidden
          >
            🔍
          </span>
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setNavTab('search')}
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
        <div
          ref={trendingTagsRef}
          className="w-full max-w-xl mt-2 flex gap-2 overflow-x-auto no-scrollbar"
        >
          {TRENDING_TAGS.map((tag) => (
            <button
              key={tag.label}
              type="button"
              onClick={() => {
                setCategoryFilter(tag.category);
                setBreakingOnly(false);
                setNavTab('home');
              }}
              className="shrink-0 whitespace-nowrap px-2.5 py-1 rounded-full text-[12px]"
              style={{ background: '#1e2a3a', color: '#94a3b8' }}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {loading || userLoading ? (
        <p className="text-gray-400">로딩 중...</p>
      ) : (
        <div className="flex flex-col gap-4 w-full max-w-xl">
          {/* 카테고리 · 상태 탭 고정 */}
          <div
            ref={stickyTabsRef}
            className="space-y-2 fixed left-0 right-0 z-30 bg-[#0a0f1e] px-4 py-2 flex justify-center"
            style={{ top: localHeaderTop + localHeaderHeight }}
          >
            <div className="w-full max-w-xl space-y-2">
              {/* 진행중 / 종료 탭 */}
              <div
                ref={statusTabsRef}
                className="flex gap-2 overflow-x-auto no-scrollbar"
              >
                {([
                  { value: 'active' as const, label: '진행중' },
                  { value: 'resolved' as const, label: '종료' },
                ] as const).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(value);
                      setBreakingOnly(false);
                      setNavTab('home');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border whitespace-nowrap shrink-0 ${
                      statusFilter === value
                        ? 'text-white border-[#34d399]/40'
                        : 'bg-[#111827] text-gray-400 border-white/10 hover:text-white hover:border-white/20'
                    }`}
                    style={statusFilter === value ? { backgroundColor: 'rgba(52,211,153,0.2)' } : undefined}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 빈 상태 */}
          {filteredMarkets.length === 0 ? (
            <p className="text-gray-400 text-center py-8">해당 조건의 마켓이 없습니다.</p>
          ) : null}

          {/* 마켓 카드 목록 */}
          {filteredMarkets.map((m) => {
            const showBreaking = Boolean(m.is_breaking);
            const showNew = isNewMarket(m.created_at);
            const thumbnailSrc = m.image_url?.trim() || getCategoryImage(normalizeCategory(m.category));

            return (
              <div
                key={m.id}
                className="bg-[#111827] border border-white/10 rounded-xl p-4 transition-all hover:border-white/20 hover:bg-[#151d32]"
              >
                <Link
                  href={`/market/${m.id}`}
                  className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]/40 rounded-lg"
                >
                  {/* 썸네일 — 부모 div의 overflow-hidden+rounded-lg가 클리핑 처리 */}
                  <div
                    className="shrink-0 rounded-lg overflow-hidden bg-[#0a0f1e]"
                    style={{ width: 64, height: 64, minWidth: 64 }}
                  >
                    <img
                      src={thumbnailSrc}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                      alt={m.category}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium leading-snug line-clamp-2 text-left">
                      {m.question}
                    </p>

                    {(showBreaking || showNew) && (
                      <div className="flex flex-wrap items-center justify-start gap-1.5 mt-1.5">
                        {showBreaking ? (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{
                              background: 'rgba(220,38,38,0.25)',
                              border: '1px solid rgba(220,38,38,0.5)',
                              color: '#fca5a5',
                            }}
                          >
                            🔥 속보
                          </span>
                        ) : null}
                        {showNew ? (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{
                              background: 'rgba(79,70,229,0.25)',
                              border: '1px solid rgba(79,70,229,0.5)',
                              color: '#a5b4fc',
                            }}
                          >
                            🆕 신규
                          </span>
                        ) : null}
                      </div>
                    )}

                    {isMarketEnded(m) && (
                      <div
                        className="text-xs font-bold px-2 py-1 rounded-lg mt-2 inline-block"
                        style={
                          isMarketSettled(m) && m.result
                            ? getSettledResultBadgeStyle(m.result)
                            : { background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }
                        }
                      >
                        {isMarketSettled(m)
                          ? m.result === 'YES' ? '✅ 종료 · YES' : '❌ 종료 · NO'
                          : '⏱️ 마감 · 베팅 종료'}
                      </div>
                    )}
                  </div>
                </Link>

                <YesNoButtonGroup className="mt-3">
                  <YesNoButton side="YES" href={`/market/${m.id}?side=yes`}>
                    YES {m.yes_percent}%
                  </YesNoButton>
                  <YesNoButton side="NO" href={`/market/${m.id}?side=no`}>
                    NO {m.no_percent}%
                  </YesNoButton>
                </YesNoButtonGroup>
              </div>
            );
          })}
        </div>
      )}

      <BottomNav
        activeTab={navTab}
        onHome={handleNavHome}
        onSearch={handleNavSearch}
        onBreaking={handleNavBreaking}
        onProfile={handleNavProfile}
      />
    </div>
  );
}