'use client';

import Link from 'next/link';

type AppHeaderProps = {
  showMyInfo: boolean;
  onToggleMyInfo: () => void;
  points: number | null;
  pointsLoading?: boolean;
};

const iconButtonClass =
  'flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#111827] text-lg transition-all hover:border-white/20 hover:bg-[#151d32]';

export function AppHeader({
  showMyInfo,
  onToggleMyInfo,
  points,
  pointsLoading = false,
}: AppHeaderProps) {
  return (
    <div className="w-full max-w-xl mb-4">
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-bold text-white tracking-widest hover:text-emerald-300 transition-colors"
        >
          ORACLE-X
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/leaderboard"
            aria-label="리더보드"
            className={iconButtonClass}
          >
            🏆
          </Link>
          <button
            type="button"
            aria-label="내 정보"
            aria-expanded={showMyInfo}
            onClick={onToggleMyInfo}
            className={`${iconButtonClass} ${
              showMyInfo ? 'border-emerald-500/50 bg-[#151d32] ring-2 ring-emerald-500/40' : ''
            }`}
          >
            👤
          </button>
        </div>
      </header>

      {showMyInfo ? (
        <div className="mt-3 bg-[#111827] border border-emerald-500/30 rounded-xl px-5 py-4">
          <p className="text-sm text-gray-400 mb-1">내 정보</p>
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">💰 보유 포인트</span>
            {pointsLoading ? (
              <span className="text-gray-500 text-sm">로딩 중...</span>
            ) : (
              <span className="text-emerald-400 font-bold text-lg tabular-nums">
                {(points ?? 0).toLocaleString()} P
              </span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
