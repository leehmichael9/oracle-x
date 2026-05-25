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

export type CategoryStyle = {
  emoji: string;
  bgColor: string;
};

export const CATEGORY_STYLES: Record<MarketCategory, CategoryStyle> = {
  '정치/시사': { emoji: '🏛️', bgColor: '#1e3a5f' },
  지정학: { emoji: '🌍', bgColor: '#1a3a2a' },
  크립토: { emoji: '₿', bgColor: '#1a2a1a' },
  '경제/금융': { emoji: '📈', bgColor: '#1a1a3a' },
  '테크/AI': { emoji: '🤖', bgColor: '#2a1a3a' },
  스포츠: { emoji: '⚽', bgColor: '#1a3a1a' },
  대중문화: { emoji: '🎬', bgColor: '#3a1a2a' },
  'K-엔터': { emoji: '🎤', bgColor: '#3a1a3a' },
  '한국 증시/경제': { emoji: '🇰🇷', bgColor: '#3a2a1a' },
  '사회/이슈': { emoji: '📢', bgColor: '#2a2a1a' },
};

const DEFAULT_CATEGORY_STYLE: CategoryStyle = { emoji: '📊', bgColor: '#1a1a2a' };

export function getCategoryStyle(category: string): CategoryStyle {
  if (category in CATEGORY_STYLES) {
    return CATEGORY_STYLES[category as MarketCategory];
  }
  return DEFAULT_CATEGORY_STYLE;
}
