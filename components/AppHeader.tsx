'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

const iconButtonClass =
  'flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#111827] text-lg transition-all hover:border-white/20 hover:bg-[#151d32]';

export function AppHeader() {
  const SUBTITLES = ["Asia's No.1 Prediction Market", "아시아 최초 예측마켓"];
const [subtitleIndex, setSubtitleIndex] = useState(0);
const [visible, setVisible] = useState(true);

useEffect(() => {
  const interval = setInterval(() => {
    setVisible(false);
    setTimeout(() => {
      setSubtitleIndex(prev => (prev + 1) % SUBTITLES.length);
      setVisible(true);
    }, 400);
  }, 3000);
  return () => clearInterval(interval);
}, []);
  return (
    <div className="w-full max-w-xl py-4">
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="group"
        >
          <p className="text-2xl font-bold text-white tracking-widest group-hover:text-emerald-300 transition-colors">
            ORACLE-X
          </p>
          <p
            className="text-xs text-[#94a3b8] tracking-wider leading-none mt-0.5"
            style={{ transition: 'opacity 0.4s ease', opacity: visible ? 1 : 0 }}
          >
            {SUBTITLES[subtitleIndex]}
          </p>
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
