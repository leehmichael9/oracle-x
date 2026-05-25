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
