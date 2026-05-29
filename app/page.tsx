'use client';
import { AppFooter } from '@/components/AppFooter';
import { AppHeader } from '@/components/AppHeader';
import { MarketTags } from '@/components/MarketTags';
import { getDisplayTags } from '@/lib/market-tags';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BottomNav, type BottomNavTab } from '@/components/BottomNav';
import { YesNoButton, YesNoButtonGroup } from '@/components/YesNoButton';
import {
  getCategoryImage,
  getSettledResultBadgeStyle,
  HOME_CATEGORY_TABS,
  normalizeCategory,
  type HomeCategoryTab,
} from '@/lib/categories';
import {
  isMarketActiveForFilter,
  isMarketBreakingActive,
  isMarketClosedForFilter,
  isMarketEnded,
  isMarketSettled,
} from '@/lib/market';
import { supabase } from '@/lib/supabase';
import { useTelegramUser } from '@/lib/useTelegramUser';

const NEW_MARKET_MS = 72 * 60 * 60 * 1000;

const SUB_CATEGORY_TABS = [
  '전체',
  '코스피',
  '2026월드컵',
  '이란전쟁',
  '트럼프',
  '나스닥',
  'BTS',
  '지구온난화',
  '러우전쟁',
  '미중간선거',
  '반도체',
] as const;

type SubCategoryTab = (typeof SUB_CATEGORY_TABS)[number];
type SubCategoryFilter = SubCategoryTab | '';

function matchesSubCategoryTab(
  market: { question: string; sub_category?: string | null },
  keyword: string,
): boolean {
  const kw = keyword.toLowerCase();
  const sub = (market.sub_category ?? '').trim();
  if (sub) {
    return sub.toLowerCase().includes(kw);
  }
  return market.question.toLowerCase().includes(kw);
}
const TRENDING_KEYWORD_TAGS: {
  label: string;
  keyword: Exclude<SubCategoryTab, '전체'>;
}[] = [
  { label: '📈 코스피', keyword: '코스피' },
  { label: '⚽ 2026월드컵', keyword: '2026월드컵' },
  { label: '💥 이란전쟁', keyword: '이란전쟁' },
  { label: '🇺🇸 트럼프', keyword: '트럼프' },
  { label: '📊 나스닥', keyword: '나스닥' },
  { label: '🎤 BTS', keyword: 'BTS' },
  { label: '🌡️ 지구온난화', keyword: '지구온난화' },
  { label: '💥 러우전쟁', keyword: '러우전쟁' },
  { label: '🗳️ 미중간선거', keyword: '미중간선거' },
  { label: '💾 반도체', keyword: '반도체' },
];

const TRENDING_TAGS: {
  label: string;
  category: Exclude<HomeCategoryTab, '전체' | '최신'>;
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
  breaking_until: string | null;
  image_url: string | null;
  sub_category: string | null;
  tags: string[] | null;
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
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<HomeCategoryTab>('전체');
  const [subCategoryFilter, setSubCategoryFilter] = useState<SubCategoryFilter>('전체');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [breakingOnly, setBreakingOnly] = useState(false);
  const [navTab, setNavTab] = useState<BottomNavTab>('home');
  const [fixedHeaderHeight, setFixedHeaderHeight] = useState(0);

  const fixedHeaderRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const categoryTabsRef = useRef<HTMLDivElement>(null);
  const statusTabsRef = useRef<HTMLDivElement>(null);
  const trendingTagsRef = useRef<HTMLDivElement>(null);

  const { loading: userLoading } = useTelegramUser();

  // ─── 마켓 필터링 ─────────────────────────────────────────────
  const filteredMarkets = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    const list = markets.filter((m) => {
      if (breakingOnly && !isMarketBreakingActive(m.breaking_until)) return false;
      if (keyword && !m.question.toLowerCase().includes(keyword)) return false;
      if (
        categoryFilter !== '전체' &&
        categoryFilter !== '최신' &&
        normalizeCategory(m.category) !== categoryFilter
      ) {
        return false;
      }
      if (
        subCategoryFilter !== '전체' &&
        !matchesSubCategoryTab(m, subCategoryFilter)
      ) {
        return false;
      }
      if (statusFilter === 'active' && !isMarketActiveForFilter(m)) return false;
      if (statusFilter === 'resolved' && !isMarketClosedForFilter(m)) return false;
      return true;
    });

    return list;
  }, [markets, breakingOnly, searchQuery, categoryFilter, subCategoryFilter, statusFilter]);

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
      const { data } = await supabase
        .from('markets')
        .select('*')
        .order('created_at', { ascending: false });
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

  // ─── 고정 헤더 높이 실측 (AppHeader + 대카테고리 탭만) ───────
  useEffect(() => {
    const update = () => {
      if (fixedHeaderRef.current) {
        setFixedHeaderHeight(fixedHeaderRef.current.offsetHeight);
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
    };
  }, []);

  // ─── 렌더 ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center px-4 pb-20">
      <div
        ref={fixedHeaderRef}
        className="fixed top-0 left-0 right-0 z-50 w-full flex flex-col items-center bg-[#0a0f1e] px-4 py-2"
      >
        <AppHeader />
        <div
          ref={categoryTabsRef}
          className="w-full max-w-xl flex gap-2 overflow-x-auto no-scrollbar"
        >
          {HOME_CATEGORY_TABS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setCategoryFilter(cat);
                setSubCategoryFilter('');
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
      </div>

      <div className="w-full max-w-xl" style={{ paddingTop: fixedHeaderHeight }}>
        <div className="relative w-full mt-2">
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
          className="w-full mt-2 flex gap-2 overflow-x-auto no-scrollbar"
        >
          {TRENDING_KEYWORD_TAGS.map((tag) => (
            <button
              key={tag.keyword}
              type="button"
              onClick={() => {
                setCategoryFilter('전체');
                setSubCategoryFilter(tag.keyword);
                setBreakingOnly(false);
                setNavTab('home');
              }}
              className="shrink-0 whitespace-nowrap px-2.5 py-1 rounded-full text-[12px]"
              style={{ background: '#1e2a3a', color: '#94a3b8' }}
            >
              {tag.label}
            </button>
          ))}
          {TRENDING_TAGS.map((tag) => (
            <button
              key={tag.label}
              type="button"
              onClick={() => {
                setCategoryFilter(tag.category);
                setSubCategoryFilter('');
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
        <div className="w-full mt-2 mb-3 relative z-0">
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
      {loading || userLoading ? null : (
        <div className="flex flex-col gap-4 w-full">
          {/* 빈 상태 */}
          {filteredMarkets.length === 0 ? (
            <p className="text-gray-400 text-center py-8">해당 조건의 마켓이 없습니다.</p>
          ) : null}

          {/* 마켓 카드 목록 */}
          {filteredMarkets.map((m) => {
            const showBreaking = isMarketBreakingActive(m.breaking_until);
            const showNew = isNewMarket(m.created_at);
            const marketTags = getDisplayTags(m.tags);
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

                    {(showBreaking || showNew || marketTags.length > 0) && (
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
                        <MarketTags tags={m.tags} />
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

      <AppFooter />
      </div>

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