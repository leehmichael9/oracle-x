'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const MY_TELEGRAM_ID = 'test_user_001';

type LeaderboardUser = {
  id: string;
  telegram_id: string;
  username: string;
  points: number;
};

function rankLabel(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank;
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('users')
        .select('id, telegram_id, username, points')
        .order('points', { ascending: false });
      setUsers((data as LeaderboardUser[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center py-12 px-4">
      <h1 className="text-3xl font-bold text-white mb-2">리더보드</h1>
      <Link
        href="/"
        className="text-sm text-gray-400 hover:text-white transition-colors mb-10"
      >
        ← 홈으로
      </Link>

      <div className="w-full max-w-xl bg-[#111827] border border-white/10 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[4rem_1fr_6rem] gap-2 px-4 py-3 border-b border-white/10 text-xs font-medium text-gray-400 uppercase tracking-wide">
          <span>순위</span>
          <span>사용자명</span>
          <span className="text-right">보유 포인트</span>
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-10">로딩 중...</p>
        ) : users.length === 0 ? (
          <p className="text-gray-400 text-center py-10">등록된 사용자가 없습니다.</p>
        ) : (
          <ul>
            {users.map((user, index) => {
              const rank = index + 1;
              const isMe = user.telegram_id === MY_TELEGRAM_ID;
              return (
                <li
                  key={user.id}
                  className={`grid grid-cols-[4rem_1fr_6rem] gap-2 px-4 py-3 border-b border-white/5 last:border-0 items-center ${
                    isMe
                      ? 'bg-amber-500/10 border-l-2 border-l-amber-400'
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <span className="text-lg tabular-nums">
                    {rank <= 3 ? (
                      <span className="text-xl">{rankLabel(rank)}</span>
                    ) : (
                      <span className="text-gray-400 text-sm font-medium pl-1">
                        {rank}
                      </span>
                    )}
                  </span>
                  <span
                    className={`truncate ${
                      isMe ? 'text-amber-300 font-semibold' : 'text-white'
                    }`}
                  >
                    {user.username}
                    {isMe ? (
                      <span className="ml-2 text-xs text-amber-400/80">(나)</span>
                    ) : null}
                  </span>
                  <span
                    className={`text-right tabular-nums font-medium ${
                      isMe ? 'text-amber-300' : 'text-emerald-400'
                    }`}
                  >
                    {user.points.toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
