'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { BottomNav, type BottomNavTab } from '@/components/BottomNav';
import { NO_COLOR, YES_COLOR } from '@/lib/categories';
import { buildInviteLink } from '@/lib/referral';
import { supabase } from '@/lib/supabase';
import { useTelegramUser } from '@/lib/useTelegramUser';

// ─── 타입 ────────────────────────────────────────────────────────
interface TelegramWebApp {
  initDataUnsafe?: {
    user?: { id: number };
  };
}

type PointHistoryItem = {
  amount: number;
  reason: string;
  created_at: string;
};

type ReferralStats = {
  referral_code: string;
  invite_count: number;
  total_referral_points: number;
};

// ─── 상수 ────────────────────────────────────────────────────────
const REASON_LABELS: Record<string, string> = {
  quiz_correct:           '🧩 퀴즈 정답',
  referral_signup:        '👥 친구 초대 가입',
  referral_bet_completed: '👥 친구 첫 베팅',
  bet_win:                '🏆 베팅 적중',
  signup_bonus:           '🎁 가입 보너스',
  daily_checkin:          '📅 출석 체크',
};

// ─── 유틸 함수 ───────────────────────────────────────────────────
function getTelegramId(): string {
  const tg = (window as Window & { Telegram?: { WebApp?: TelegramWebApp } })
    .Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user) {
    return String(tg.initDataUnsafe.user.id);
  }
  return 'test_user_001';
}

function getReasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? '📌 기타';
}

function formatTransactionDate(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00';

  return `${get('month')}.${get('day')} ${get('hour')}:${get('minute')}`;
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const { userId, loading: userLoading } = useTelegramUser();

  const [points, setPoints] = useState<number | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [copyToast, setCopyToast] = useState(false);
  const [pointHistory, setPointHistory] = useState<PointHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);

  // navTab은 이 페이지에서 절대 변하지 않으므로 상태 불필요
  const navTab: BottomNavTab = 'profile';

  // ─── 데이터 로드 ─────────────────────────────────────────────
  const loadPoints = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('users')
      .select('points')
      .eq('id', userId)
      .single();
    if (data) setPoints(data.points ?? 0);
  }, [userId]);

  const loadPointHistory = useCallback(async () => {
    if (!userId) return; // ← Telegram 환경 외 test_user_001 fallback 방지
    setHistoryLoading(true);
    try {
      const telegramId = getTelegramId();
      const res = await fetch(
        `/api/user/points-history?telegram_id=${encodeURIComponent(telegramId)}`,
      );
      const data = await res.json();
      setPointHistory(data.ok && Array.isArray(data.items) ? data.items : []);
    } catch {
      setPointHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [userId]);

  const loadStats = useCallback(async () => {
    if (!userId) return;
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/referral/stats?user_id=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data.ok) {
        setStats({
          referral_code:          data.referral_code,
          invite_count:           data.invite_count,
          total_referral_points:  data.total_referral_points,
        });
      }
    } finally {
      setStatsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPoints();
    loadStats();
    loadPointHistory();
  }, [loadPoints, loadStats, loadPointHistory]);

  useEffect(() => {
    const update = () => {
      if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ─── 핸들러 ──────────────────────────────────────────────────
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

  // ─── 렌더 ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center px-4 pb-20">
      <div
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 w-full flex justify-center bg-[#0a0f1e] px-4 py-2"
      >
        <AppHeader />
      </div>
      <div className="w-full max-w-xl space-y-4" style={{ paddingTop: headerHeight }}>
        <h1 className="text-xl font-bold text-white">내 정보</h1>

        {/* 보유 포인트 */}
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

        {/* 포인트 내역 */}
        <section className="bg-[#111827] border border-white/10 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white">포인트 내역</h2>
          {historyLoading ? (
            <p className="text-sm text-gray-400">로딩 중...</p>
          ) : pointHistory.length === 0 ? (
            <p className="text-sm text-gray-500">아직 포인트 내역이 없습니다</p>
          ) : (
            <ul className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: 300 }}>
              {pointHistory.map((item, index) => {
                const amount = item.amount ?? 0;
                const isGain = amount >= 0;
                const amountLabel = isGain
                  ? `+${Math.abs(amount).toLocaleString()} P`
                  : `-${Math.abs(amount).toLocaleString()} P`;

                return (
                  <li
                    key={`${item.created_at}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-[#0a0f1e] px-3 py-2.5 border border-white/5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500 tabular-nums mb-0.5">
                        {formatTransactionDate(item.created_at)}
                      </p>
                      <p className="text-sm text-gray-200 truncate">
                        {getReasonLabel(item.reason)}
                      </p>
                    </div>
                    <span
                      className="text-sm font-semibold tabular-nums shrink-0"
                      style={{ color: isGain ? YES_COLOR : NO_COLOR }}
                    >
                      {amountLabel}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 친구 초대 */}
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
                <p className="text-center text-sm text-emerald-400 font-medium">복사됨!</p>
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