export const MARKET_CATEGORIES = [
  'XRP특화',
  '크립토가격',
  '거시경제',
  '지정학',
  '크립토산업',
  '정치/시사',
] as const;

export type MarketCategory = (typeof MARKET_CATEGORIES)[number];
