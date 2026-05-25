'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { BottomNav, type BottomNavTab } from '@/components/BottomNav';
import { buildInviteLink } from '@/lib/referral';
import { supabase } from '@/lib/supabase';
import { useTelegramUser } from '@/lib/useTelegramUser';

type ReferralStats = {
  referral_code: string;
  invite_count: number;
  total_referral_points: number;
};

export default function ProfilePage() {
  const router = useRouter();
  const { userId, loading: userLoading } = useTelegramUser();
  const [points, setPoints] = useState<number | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [copyToast, setCopyToast] = useState(false);
  const [navTab] = useState<BottomNavTab>('profile');

  const loadPoints = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('users')
      .select('points')
      .eq('id', userId)
      .single();
    if (data) setPoints(data.points ?? 0);
  }, [userId]);

  const loadStats = useCallback(async () => {
    if (!userId) return;
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/referral/stats?user_id=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data.ok) {
        setStats({
          referral_code: data.referral_code,
          invite_count: data.invite_count,
          total_referral_points: data.total_referral_points,
        });
      }
    } finally {
      setStatsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPoints();
    loadStats();
  }, [loadPoints, loadStats]);

  const inviteLink = stats?.referral_code
    ? buildInviteLink(stats.referral_code)
    : '';

  async function handleCopyLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2000);
    } catch {
      window.prompt('링크를 복사하세요:', inviteLink);
    }
  }

  function handleShareTelegram() {
    if (!inviteLink) return;
    const text = 'Oracle-X 예측시장에 초대합니다! 🔮';
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank');
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center py-4 px-4 pb-20">
      <AppHeader />

      <div className="w-full max-w-xl space-y-4">
        <h1 className="text-xl font-bold text-white">내 정보</h1>

        <section className="bg-[#111827] border border-emerald-500/30 rounded-xl px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">💰 보유 포인트</span>
            {userLoading || points === null ? (
              <span className="text-gray-500 text-sm">로딩 중...</span>
            ) : (
              <span className="text-emerald-400 font-bold text-lg tabular-nums">
                {(points ?? 0).toLocaleString()} P
              </span>
            )}
          </div>
        </section>

        <section className="bg-[#111827] border border-white/10 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">친구 초대</h2>

          {statsLoading ? (
            <p className="text-sm text-gray-400">로딩 중...</p>
          ) : stats ? (
            <>
              <div>
                <p className="text-xs text-gray-500 mb-1">내 초대 링크</p>
                <p className="text-sm text-emerald-400 break-all font-mono leading-relaxed">
                  {inviteLink}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-[#34d399]/40 text-[#34d399] hover:bg-emerald-500/10 transition-colors"
                >
                  링크 복사
                </button>
                <button
                  type="button"
                  onClick={handleShareTelegram}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-white/15 text-gray-200 hover:bg-white/5 transition-colors"
                >
                  텔레그램 공유
                </button>
              </div>

              {copyToast ? (
                <p className="text-center text-sm text-emerald-400 font-medium">
                  복사됨!
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
                <div className="rounded-lg bg-[#0a0f1e] px-3 py-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">초대한 친구</p>
                  <p className="text-lg font-bold text-white tabular-nums">
                    {stats.invite_count}명
                  </p>
                </div>
                <div className="rounded-lg bg-[#0a0f1e] px-3 py-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">레퍼럴 획득 포인트</p>
                  <p className="text-lg font-bold text-amber-300 tabular-nums">
                    {stats.total_referral_points.toLocaleString()}P
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                친구 가입 시 친구에게 1,500P · 친구 첫 베팅 완료 시 나에게 500P
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">초대 정보를 불러오지 못했습니다.</p>
          )}
        </section>

        <Link
          href="/"
          className="block text-center text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← 마켓 목록으로
        </Link>
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
