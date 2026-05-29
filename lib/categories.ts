import type { CSSProperties } from 'react';

export const MARKET_CATEGORIES = [
  '날씨',
  '정치/시사',
  '지정학',
  '크립토',
  '경제/금융',
  '테크/AI',
  '스포츠',
  '대중문화',
  'K-엔터',
  '한국 증시/경제',
  '사회/이슈',
] as const;

/** 메인 페이지 대카테고리 탭 (전체·최신 + DB 카테고리) */
export const HOME_CATEGORY_TABS = ['전체', '최신', ...MARKET_CATEGORIES] as const;
export type HomeCategoryTab = (typeof HOME_CATEGORY_TABS)[number];

export type MarketCategory = (typeof MARKET_CATEGORIES)[number];

/** DB 저장값 → 관리자/표시용 한글 카테고리 */
const CATEGORY_ALIAS_MAP: Record<string, string> = {
  xrp: 'XRP특화',
  xrp특화: 'XRP특화',
  XRP특화: 'XRP특화',
  crypto: '크립토가격',
  cryptocurrency: '크립토가격',
  크립토가격: '크립토가격',
  politics: '정치/시사',
  '정치/시사': '정치/시사',
  geopolitics: '지정학',
  지정학: '지정학',
  economy: '경제/금융',
  거시경제: '경제/금융',
  '경제/금융': '경제/금융',
  tech: '테크/AI',
  '테크/AI': '테크/AI',
  sports: '스포츠',
  스포츠: '스포츠',
  culture: '대중문화',
  대중문화: '대중문화',
  'k-ent': 'K-엔터',
  k엔터: 'K-엔터',
  'K-엔터': 'K-엔터',
  'korean-economy': '한국 증시/경제',
  '한국 증시/경제': '한국 증시/경제',
  social: '사회/이슈',
  '사회/이슈': '사회/이슈',
  weather: '날씨',
  날씨: '날씨',
  크립토산업: '크립토산업',
};

/** admin 필터 드롭다운 (현행 + 레거시 정규화명) */
export const ADMIN_CATEGORY_FILTER_OPTIONS: string[] = [
  ...MARKET_CATEGORIES,
  'XRP특화',
  '크립토가격',
  '크립토산업',
].filter((v, i, arr) => arr.indexOf(v) === i);

export function normalizeCategory(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  if (trimmed in CATEGORY_ALIAS_MAP) return CATEGORY_ALIAS_MAP[trimmed];
  const lower = trimmed.toLowerCase();
  if (lower in CATEGORY_ALIAS_MAP) return CATEGORY_ALIAS_MAP[lower];
  return trimmed;
}

/** YES/NO 공통 컬러 (메인·상세·게이지 공유) */
export const YES_COLOR = '#34d399';
export const NO_COLOR = '#f87171';

export const YES_BG = 'rgba(52, 211, 153, 0.15)';
export const YES_BG_ACTIVE = 'rgba(52, 211, 153, 0.35)';
export const NO_BG = 'rgba(248, 113, 113, 0.15)';
export const NO_BG_ACTIVE = 'rgba(248, 113, 113, 0.35)';
export const BET_SUBMIT_BG = 'rgba(52, 211, 153, 0.8)';

export type YesNoSide = 'YES' | 'NO';

/** 메인·상세 공통 YES/NO 버튼 레이아웃 */
export const YES_NO_BUTTON_LAYOUT: CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 40,
  padding: '10px 12px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.25,
  border: '1px solid',
  transition: 'background 0.15s ease, opacity 0.15s ease',
  textAlign: 'center',
};

/** 메인·상세 YesNoButton 통일 스타일 */
export function getYesNoButtonStyle(
  side: YesNoSide,
  active = false,
): CSSProperties {
  if (side === 'YES') {
    return {
      ...YES_NO_BUTTON_LAYOUT,
      background: active ? YES_BG_ACTIVE : YES_BG,
      borderColor: YES_COLOR,
      color: YES_COLOR,
    };
  }
  return {
    ...YES_NO_BUTTON_LAYOUT,
    background: active ? NO_BG_ACTIVE : NO_BG,
    borderColor: NO_COLOR,
    color: NO_COLOR,
  };
}

/** 상세·카드용 YES/NO 비율 프로그레스 바 */
export function getYesNoProgressFillStyles(
  yesPercent: number,
  noPercent: number,
): { yes: CSSProperties; no: CSSProperties } {
  return {
    yes: { width: `${yesPercent}%`, backgroundColor: YES_COLOR },
    no: { width: `${noPercent}%`, backgroundColor: NO_COLOR },
  };
}

export function getSettledResultBadgeStyle(result: 'YES' | 'NO'): CSSProperties {
  return result === 'YES'
    ? { background: YES_BG, color: YES_COLOR }
    : { background: NO_BG, color: NO_COLOR };
}

export type CategoryStyle = {
  emoji: string;
  gradient: string;
};

export const CATEGORY_STYLES: Record<MarketCategory, CategoryStyle> = {
  날씨: {
    emoji: '🌤️',
    gradient: 'linear-gradient(135deg, #1a2a3a, #0d141f)',
  },
  '정치/시사': {
    emoji: '🏛️',
    gradient: 'linear-gradient(135deg, #1e3a5f, #0f2040)',
  },
  지정학: {
    emoji: '🌍',
    gradient: 'linear-gradient(135deg, #1a3a2a, #0d1f14)',
  },
  크립토: {
    emoji: '🪙',
    gradient: 'linear-gradient(135deg, #1a2a1a, #0d150d)',
  },
  '경제/금융': {
    emoji: '💹',
    gradient: 'linear-gradient(135deg, #1a1a3a, #0d0d1f)',
  },
  '테크/AI': {
    emoji: '💻',
    gradient: 'linear-gradient(135deg, #2a1a3a, #150d1f)',
  },
  스포츠: {
    emoji: '⚽',
    gradient: 'linear-gradient(135deg, #1a3a1a, #0d1f0d)',
  },
  대중문화: {
    emoji: '🎬',
    gradient: 'linear-gradient(135deg, #3a1a2a, #1f0d14)',
  },
  'K-엔터': {
    emoji: '🎤',
    gradient: 'linear-gradient(135deg, #3a1a3a, #1f0d1f)',
  },
  '한국 증시/경제': {
    emoji: '🇰🇷',
    gradient: 'linear-gradient(135deg, #3a2a1a, #1f140d)',
  },
  '사회/이슈': {
    emoji: '📢',
    gradient: 'linear-gradient(135deg, #2a2a1a, #14140d)',
  },
};

const DEFAULT_CATEGORY_STYLE: CategoryStyle = {
  emoji: '📊',
  gradient: 'linear-gradient(135deg, #1a1a2a, #0d0d14)',
};

export function getCategoryStyle(category: string): CategoryStyle {
  if (category in CATEGORY_STYLES) {
    return CATEGORY_STYLES[category as MarketCategory];
  }
  return DEFAULT_CATEGORY_STYLE;
}

const CATEGORY_IMAGE_MAP: Record<string, string> = {
  날씨: '/category/social.svg',
  '정치/시사': '/category/politics.svg',
  지정학: '/category/geopolitics.svg',
  크립토: '/category/crypto.svg',
  '경제/금융': '/category/economy.svg',
  '테크/AI': '/category/tech.svg',
  스포츠: '/category/sports.svg',
  대중문화: '/category/culture.svg',
  'K-엔터': '/category/kenter.svg',
  '한국 증시/경제': '/category/korea_market.svg',
  '사회/이슈': '/category/social.svg',
};

export function getCategoryImage(category: string): string {
  const normalized = normalizeCategory(category);
  return CATEGORY_IMAGE_MAP[normalized] ?? '/category/social.svg';
}
