export const MARKET_CATEGORIES = [
  '정치/시사',
  '지정학',
  '크립토',
  '경제/금융',
  '테크/AI',
  '스포츠',
  '대중문화',
  'e스포츠',
  'K-엔터',
  '한국 증시/경제',
  '사회/이슈',
] as const;

export type MarketCategory = (typeof MARKET_CATEGORIES)[number];
