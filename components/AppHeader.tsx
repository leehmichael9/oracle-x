'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

const iconButtonClass =
  'flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#111827] text-lg transition-all hover:border-white/20 hover:bg-[#151d32]';

const SUBTITLES = ["Asia's No.1 Prediction Market", '아시아 최초 예측마켓'];
const SLIDE_DURATION_MS = 800;
const ROTATE_INTERVAL_MS = 5000;

export function AppHeader() {
  const [subtitleIndex, setSubtitleIndex] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const interval = setInterval(() => {
      setEnableTransition(true);
      setTranslateX(-100);

      timeoutId = setTimeout(() => {
        setEnableTransition(false);
        setSubtitleIndex((prev) => (prev + 1) % SUBTITLES.length);
        setTranslateX(100);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setEnableTransition(true);
            setTranslateX(0);
          });
        });
      }, SLIDE_DURATION_MS);
    }, ROTATE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      if (timeoutId) clearTimeout(timeoutId);
    };
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
          <div className="overflow-hidden mt-0.5">
            <p
              className="text-xs text-[#94a3b8] tracking-wider leading-none whitespace-nowrap"
              style={{
                transform: `translateX(${translateX}%)`,
                transition: enableTransition ? `transform ${SLIDE_DURATION_MS}ms ease` : 'none',
              }}
            >
              {SUBTITLES[subtitleIndex]}
            </p>
          </div>
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
