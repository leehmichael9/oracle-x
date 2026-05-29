'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const iconButtonClass =
  'flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#111827] text-lg transition-all hover:border-white/20 hover:bg-[#151d32]';

const NOTICE_LAST_READ_KEY = 'notice_last_read';
const SUBTITLES = ["Asia's No.1 Prediction Market", '아시아 최초 예측마켓'];
const SLIDE_DURATION_MS = 800;
const ROTATE_INTERVAL_MS = 5000;

export function AppHeader() {
  const [subtitleIndex, setSubtitleIndex] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);
  const [hasUnreadNotice, setHasUnreadNotice] = useState(false);

  useEffect(() => {
    async function checkUnreadNotices() {
      const { data, error } = await supabase
        .from('notices')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data?.created_at) {
        setHasUnreadNotice(false);
        return;
      }

      const lastRead = localStorage.getItem(NOTICE_LAST_READ_KEY);
      if (!lastRead) {
        setHasUnreadNotice(true);
        return;
      }

      setHasUnreadNotice(
        new Date(data.created_at).getTime() > new Date(lastRead).getTime(),
      );
    }

    checkUnreadNotices();
  }, []);

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
          <Link
            href="/notice"
            aria-label="공지사항"
            className={`relative ${iconButtonClass} text-gray-300 hover:text-white`}
          >
            <Bell className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
            {hasUnreadNotice ? (
              <span
                className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#111827]"
                aria-hidden
              />
            ) : null}
          </Link>
        </div>
      </header>
    </div>
  );
}
