'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTelegramUser } from '@/lib/useTelegramUser';

type LeaderboardUser = {
  id: string;
  telegram_id: string;
  username: string;
  points: number;
  total_bets: number;
  correct_bets: number;
  win_rate: number;
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
  const { userId: currentUserId } = useTelegramUser();

  useEffect(() => {
    async function load() {
      // 1. 유저 목록
      const { data: userData } = await supabase
        .from('users')
        .select('id, telegram_id, username, points');

      // 2. resolved 마켓 목록
      const { data: marketData } = await supabase
        .from('markets')
        .select('id, result')
        .eq('status', 'resolved');

      // 3. 전체 베팅 목록
      const { data: betData } = await supabase
        .from('bets')
        .select('user_id, market_id, choice');

      if (!userData) { setLoading(false); return; }

      const resolvedMarkets = new Map(
        (marketData ?? []).map(m => [m.id, m.result])
      );

      const enriched: LeaderboardUser[] = userData.map(user => {
        const userBets = (betData ?? []).filter(b => b.user_id === user.id);
        const resolvedBets = userBets.filter(b => resolvedMarkets.has(b.market_id));
        const correctBets = resolvedBets.filter(
          b => resolvedMarkets.get(b.market_id) === b.choice
        );
        const winRate =
          resolvedBets.length > 0
            ? Math.round((correctBets.length / resolvedBets.length) * 100)
            : 0;
        return {
          ...user,
          total_bets: resolvedBets.length,
          correct_bets: correctBets.length,
          win_rate: winRate,
        };
      });

      // 포인트 기준 정렬 (동점 시 적중률 우선)
      enriched.sort((a, b) => b.points - a.points || b.win_rate - a.win_rate);
      setUsers(enriched);
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
        <div className="grid grid-cols-[3rem_1fr_5rem_6rem] gap-2 px-4 py-3 border-b border-white/10 text-xs font-medium text-gray-400">
          <span>순위</span>
          <span>사용자명</span>
          <span className="text-center">적중률</span>
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
              const isMe = user.id === currentUserId;
              return (
                <li
                  key={user.id}
                  className={`grid grid-cols-[3rem_1fr_5rem_6rem] gap-2 px-4 py-3 border-b border-white/5 last:border-0 ${
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
                    {user.username || `익명_${user.telegram_id?.slice(-4) ?? '????'}`}
                    {isMe && (
                      <span className="ml-2 text-xs text-amber-400/80">(나)</span>
                    )}
                  </span>
                  <span className="text-center tabular-nums">
                    {user.total_bets > 0 ? (
                      <>
                        <span
                          className={`text-sm font-medium ${
                            user.win_rate >= 60
                              ? 'text-emerald-400'
                              : user.win_rate >= 40
                              ? 'text-yellow-400'
                              : 'text-red-400'
                          }`}
                        >
                          {user.win_rate}%
                        </span>
                        <span className="block text-xs text-gray-500">
                          {user.correct_bets}/{user.total_bets}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-600 text-sm">—</span>
                    )}
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