export const MARKET_CATEGORIES = [
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

export const YES_COLOR = '#34d399';
export const NO_COLOR = '#f87171';

export type CategoryStyle = {
  emoji: string;
  gradient: string;
};

export const CATEGORY_STYLES: Record<MarketCategory, CategoryStyle> = {
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
