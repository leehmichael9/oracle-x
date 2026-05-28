'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { YesNoButton, YesNoButtonGroup } from '@/components/YesNoButton';
import {
  BET_SUBMIT_BG,
  getSettledResultBadgeStyle,
  getYesNoProgressFillStyles,
  NO_COLOR,
  YES_COLOR,
} from '@/lib/categories';
import { isMarketEnded, isMarketSettled } from '@/lib/market';
import { supabase } from '@/lib/supabase';
import { useTelegramUser } from '@/lib/useTelegramUser';

// userId = users.id (uuid), 로컬 fallback telegram_id는 test_user_001
const MIN_BET = 10;
const MAX_BET = 500;

type Market = {
  id: number;
  question: string;
  category: string;
  yes_percent: number;
  no_percent: number;
  status: string;
  result: 'YES' | 'NO' | null;
  end_date: string | null;
};

type Choice = 'YES' | 'NO';

export default function MarketBetPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const idParam = params.id as string;
  const { userId } = useTelegramUser();

  const [market, setMarket] = useState<Market | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [points, setPoints] = useState<string>('100');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadBalance = useCallback(async () => {
    if (!userId) return   // 
    setBalanceLoading(true);
    const { data, error: balanceErr } = await supabase
      .from('users')
      .select('points')
      .eq('id', userId ?? '')
      .maybeSingle();
    if (!balanceErr && data) {
      setBalance(data.points);
    } else {
      setBalance(null);
    }
    setBalanceLoading(false);
  }, [userId]);

  const loadMarket = useCallback(async () => {
    setMarketLoading(true);
    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      setMarket(null);
      setMarketLoading(false);
      return;
    }
    const { data, error: qErr } = await supabase
      .from('markets')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (qErr) {
      setMarket(null);
      setMarketLoading(false);
      return;
    }
    setMarket(data as Market | null);
    setMarketLoading(false);
  }, [idParam]);

  useEffect(() => {
    loadMarket();
    loadBalance();
  }, [loadMarket, loadBalance]);

  useEffect(() => {
    const side = searchParams.get('side');
    if (side === 'yes') {
      setChoice('YES');
      setSuccess(false);
    } else if (side === 'no') {
      setChoice('NO');
      setSuccess(false);
    }
  }, [searchParams]);

  const pointsNum = Number(points);
  const pointsValid =
    Number.isInteger(pointsNum) && pointsNum >= MIN_BET && pointsNum <= MAX_BET;

  async function handleBet() {
    setError(null);
    setSuccess(false);

    if (!userId) {
      setError('로그인 정보를 확인할 수 없습니다.');
      return;
    }
    if (!choice) {
      setError('YES 또는 NO를 선택해 주세요.');
      return;
    }
    if (!pointsValid) {
      setError(`포인트는 ${MIN_BET}~${MAX_BET} 사이 정수로 입력해 주세요.`);
      return;
    }
    if (market && isMarketEnded(market)) {
      setError('마감된 마켓에는 베팅할 수 없습니다.');
      return;
    }

    const marketId = Number(idParam);
    if (!Number.isFinite(marketId)) {
      setError('잘못된 마켓입니다.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc('place_bet', {
        p_user_id:   userId,
        p_market_id: marketId,
        p_choice:    choice,
        p_amount:    pointsNum,
      });
    
      if (rpcErr) {
        setError('오류가 발생했습니다. 다시 시도해주세요.');
        return;
      }
    
      if (!data.success) {
        setError(data.error);
        return;
      }
    
      setBalance(data.remaining_points);
      setSuccess(true);
      loadMarket();

      fetch('/api/referral/bet-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      }).catch(() => {});
    } finally {
      setSubmitting(false);
    }
  }

  if (marketLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center px-4">
        <p className="text-gray-400">로딩 중...</p>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-300">마켓을 찾을 수 없습니다.</p>
        <Link
          href="/"
          className="underline underline-offset-4 hover:opacity-80 transition-opacity"
          style={{ color: YES_COLOR }}
        >
          목록으로
        </Link>
      </div>
    );
  }

  const progressFill = getYesNoProgressFillStyles(
    market.yes_percent,
    market.no_percent,
  );

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center pt-20 pb-4 px-4">
      <div className="fixed top-0 left-0 right-0 z-50 w-full flex justify-center bg-[#0a0f1e] py-2 px-4">
        <div className="w-full max-w-xl flex items-center justify-between gap-3">
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
          >
            ← 마켓 목록
          </Link>
          <p className="text-sm text-gray-300 truncate">마켓 상세</p>
        </div>
      </div>

      <p className="w-full max-w-xl mb-6 text-sm text-gray-300">
        보유 포인트:{' '}
        <span className="text-amber-300 font-semibold tabular-nums text-base">
          {balanceLoading
            ? '…'
            : balance != null
              ? balance.toLocaleString()
              : '—'}
        </span>
      </p>

      <div className="w-full max-w-xl bg-[#111827] border border-white/10 rounded-xl p-6 space-y-6">
        <h1 className="text-xl font-semibold text-white text-left leading-snug">
          {market.question}
        </h1>

            <div className="w-full mt-3">
              <div className="flex flex-col items-start gap-0.5 text-xs font-medium mb-1">
                <span style={{ color: YES_COLOR }}>
                  YES {market.yes_percent}%
                </span>
                <span style={{ color: NO_COLOR }}>NO {market.no_percent}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden flex">
                <div
                  className="h-full transition-all"
                  style={progressFill.yes}
                />
                <div
                  className="h-full transition-all"
                  style={progressFill.no}
                />
              </div>
            </div>
        {isMarketEnded(market) && (
          <div
            className={`flex items-center justify-start gap-2 py-2 px-4 rounded-xl font-bold text-sm border ${
              isMarketSettled(market)
                ? ''
                : 'bg-gray-800/80 text-gray-400 border-white/10'
            }`}
            style={
              isMarketSettled(market) && market.result
                ? {
                    ...getSettledResultBadgeStyle(market.result),
                    borderColor:
                      market.result === 'YES' ? YES_COLOR : NO_COLOR,
                  }
                : undefined
            }
          >
            {isMarketSettled(market) ? (
              <>
                {market.result === 'YES' ? '✅ 결과: YES' : '❌ 결과: NO'}
                <span className="font-normal ml-1">— 마켓 종료</span>
              </>
            ) : (
              <>⏱️ 마감 — 베팅 종료</>
            )}
          </div>
        )}
        {isMarketEnded(market) ? (
          <p className="text-left text-gray-500 text-sm py-4 px-4 border border-white/10 rounded-xl">
            {isMarketSettled(market)
              ? '이 마켓은 종료되었습니다. 베팅이 불가합니다.'
              : '마감 기한이 지나 베팅이 불가합니다.'}
          </p>
        ) : (
          <>
        <YesNoButtonGroup>
          <YesNoButton
            side="YES"
            active={choice === 'YES'}
            onClick={() => {
              setChoice('YES');
              setSuccess(false);
            }}
          >
            YES
          </YesNoButton>
          <YesNoButton
            side="NO"
            active={choice === 'NO'}
            onClick={() => {
              setChoice('NO');
              setSuccess(false);
            }}
          >
            NO
          </YesNoButton>
        </YesNoButtonGroup>

        <div>
          <label htmlFor="points" className="block text-sm text-gray-400 mb-2">
            베팅 포인트 ({MIN_BET}~{MAX_BET})
          </label>
          <input
            id="points"
            type="number"
            min={MIN_BET}
            max={MAX_BET}
            step={1}
            value={points}
            onChange={(e) => {
              setPoints(e.target.value);
              setSuccess(false);
            }}
            className="w-full rounded-lg bg-[#0a0f1e] border border-white/15 px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[color:var(--yes-color)]/50 focus:border-[color:var(--yes-color)]/50"
          />
        </div>

        {error ? (
  error.includes('이미') ? (
    <p className="text-sm text-blue-300 bg-blue-950/30 border border-blue-800/50 rounded-lg px-3 py-2">
      ℹ️ {error}
    </p>
  ) : (
    <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
      {error}
    </p>
  )
) : null}

        {success ? (
          <p
            className="text-left font-semibold py-2"
            style={{ color: YES_COLOR }}
          >
            베팅 완료!
          </p>
        ) : null}

        <button
          type="button"
          disabled={submitting || success}
          onClick={handleBet}
          className="w-full py-3 rounded-xl font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none transition-opacity"
          style={{ background: BET_SUBMIT_BG }}
        >
          {submitting ? '처리 중...' : '베팅하기'}
        </button>
          </>
        )}
      </div>
    </div>
  );
}
