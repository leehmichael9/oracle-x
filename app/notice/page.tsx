'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { BottomNav, type BottomNavTab } from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';

const NOTICE_LAST_READ_KEY = 'notice_last_read';

type Notice = {
  id: number | string;
  title: string;
  content: string;
  created_at: string;
};

function formatNoticeDate(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

export default function NoticePage() {
  const router = useRouter();
  const navTab: BottomNavTab = 'home';

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<Notice['id'] | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);

  const loadNotices = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notices')
      .select('id, title, content, created_at')
      .order('created_at', { ascending: false });

    if (error || !data) {
      setNotices([]);
    } else {
      setNotices(
        data.map((row) => ({
          id: row.id,
          title: String(row.title ?? ''),
          content: String(row.content ?? ''),
          created_at: String(row.created_at ?? ''),
        })),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    localStorage.setItem(NOTICE_LAST_READ_KEY, new Date().toISOString());
  }, []);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  useEffect(() => {
    const update = () => {
      if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const topPadding = Math.max(headerHeight, 88);

  function toggleNotice(id: Notice['id']) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center px-4 pb-20">
      <div
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 w-full flex justify-center bg-[#0a0f1e] px-4 py-2"
      >
        <AppHeader />
      </div>

      <div
        className="w-full max-w-xl space-y-4"
        style={{ paddingTop: topPadding }}
      >
        <h1 className="text-xl font-bold text-white">공지사항</h1>

        {loading ? null : notices.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">
            등록된 공지가 없습니다
          </p>
        ) : (
          <ul className="space-y-3">
            {notices.map((notice) => {
              const isOpen = expandedId === notice.id;
              return (
                <li
                  key={String(notice.id)}
                  className="bg-[#111827] border border-white/10 rounded-xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleNotice(notice.id)}
                    className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-[#151d32] transition-colors"
                    aria-expanded={isOpen}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-emerald-400 font-semibold text-sm leading-snug">
                        {notice.title}
                      </p>
                      <p className="text-slate-500 text-xs mt-1 tabular-nums">
                        {formatNoticeDate(notice.created_at)}
                      </p>
                    </div>
                    <span
                      className="text-slate-500 text-xs shrink-0 mt-0.5 transition-transform"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      aria-hidden
                    >
                      ▼
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="px-4 pb-4 border-t border-white/10">
                      <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap pt-3">
                        {notice.content}
                      </p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <BottomNav
        activeTab={navTab}
        onHome={() => router.push('/')}
        onSearch={() => router.push('/')}
        onBreaking={() => router.push('/')}
        onProfile={() => router.push('/profile')}
      />
    </div>
  );
}
