export type MarketEndFields = {
  status: string;
  end_date?: string | null;
};

/** end_date가 현재 시각 이전(이하)이면 true */
export function isMarketExpiredByEndDate(endDate: string | null | undefined): boolean {
  if (!endDate) return false;
  const end = new Date(endDate).getTime();
  if (Number.isNaN(end)) return false;
  return Date.now() >= end;
}

export function isMarketSettled(market: { status: string }): boolean {
  return market.status === 'resolved';
}

/** 정산 완료 또는 마감일 경과 */
export function isMarketEnded(market: MarketEndFields): boolean {
  return isMarketSettled(market) || isMarketExpiredByEndDate(market.end_date);
}

/** 메인 [진행중] 필터 */
export function isMarketActiveForFilter(market: MarketEndFields): boolean {
  return market.status === 'active' && !isMarketExpiredByEndDate(market.end_date);
}

/** 메인 [종료] 필터 */
export function isMarketClosedForFilter(market: MarketEndFields): boolean {
  return isMarketEnded(market);
}

/** datetime-local input 값 (로컬) */
export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatEndDateDisplay(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
