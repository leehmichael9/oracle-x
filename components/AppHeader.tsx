'use client';

import Link from 'next/link';

const iconButtonClass =
  'flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#111827] text-lg transition-all hover:border-white/20 hover:bg-[#151d32]';

export function AppHeader() {
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
          <Link href="/profile" aria-label="내 정보" className={iconButtonClass}>
            👤
          </Link>
        </div>
      </header>
    </div>
  );
}
