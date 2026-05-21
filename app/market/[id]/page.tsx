'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTelegramUser } from '@/lib/useTelegramUser';

// test_user_001 (telegram_id) — Supabase users.id
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
};

type Choice = 'YES' | 'NO';

export default function MarketBetPage() {
  const params = useParams();
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

    const marketId = Number(idParam);
    if (!Number.isFinite(marketId)) {
      setError('잘못된 마켓입니다.');
      return;
    }

    setSubmitting(true);
    try {
      // 중복 베팅 체크
const { data: existingBet } = await supabase
.from('bets')
.select('id')
.eq('user_id', userId ?? '')
.eq('market_id', marketId)
.maybeSingle();

if (existingBet) {
setError('이미 이 마켓에 베팅하셨습니다.');
return;
}
      const { data: userRow, error: userErr } = await supabase
        .from('users')
        .select('points')
        .eq('id', userId ?? '')
        .maybeSingle();

      if (userErr || userRow?.points == null) {
        setError('테스트 사용자를 찾을 수 없습니다.');
        return;
      }

      const currentPoints = userRow.points;
      if (pointsNum > currentPoints) {
        setError('포인트가 부족합니다');
        return;
      }

      const { error: insertErr } = await supabase.from('bets').insert({
        choice,
        amount: pointsNum,
        user_id: userId ?? '',
        market_id: marketId,
      });

      if (insertErr) {
        setError(insertErr.message ?? '베팅 저장에 실패했습니다.');
        return;
      }

      const newBalance = currentPoints - pointsNum;
      const { error: updateErr } = await supabase
        .from('users')
        .update({ points: newBalance })
        .eq('id', userId ?? '');
      if (updateErr) {
        setError(updateErr.message ?? '포인트 차감에 실패했습니다.');
        return;
      }

      setBalance(newBalance);
      setSuccess(true);
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
          className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4"
        >
          목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center py-12 px-4">
      <Link
        href="/"
        className="self-start max-w-xl w-full mb-4 text-sm text-gray-400 hover:text-white transition-colors"
      >
        ← 마켓 목록
      </Link>

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
        <h1 className="text-xl font-semibold text-white text-center leading-snug">
          {market.question}
        </h1>
        
            {/* 현재 배당률 */}
            <div className="w-full mt-3">
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-emerald-400">YES {market.yes_percent}%</span>
                <span className="text-red-400">NO {market.no_percent}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden bg-red-900/40">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${market.yes_percent}%` }}
                />
              </div>
            </div>
        {market.status === 'resolved' && (
  <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold text-sm ${
    market.result === 'YES'
      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
      : 'bg-red-500/20 text-red-400 border border-red-500/40'
  }`}>
    {market.result === 'YES' ? '✅ 결과: YES' : '❌ 결과: NO'}
    <span className="font-normal ml-1">— 마켓 종료</span>
  </div>
)}
{market.status === 'resolved' ? (
  <p className="text-center text-gray-500 text-sm py-4 border border-white/10 rounded-xl">
    이 마켓은 종료되었습니다. 베팅이 불가합니다.
  </p>
) : (<>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setChoice('YES');
              setSuccess(false);
            }}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all border ${
              choice === 'YES'
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-900/40 scale-[1.02]'
                : 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300/80 hover:border-emerald-600/60'
            }`}
          >
            YES
          </button>
          <button
            type="button"
            onClick={() => {
              setChoice('NO');
              setSuccess(false);
            }}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all border ${
              choice === 'NO'
                ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-900/40 scale-[1.02]'
                : 'bg-red-950/40 border-red-800/50 text-red-300/80 hover:border-red-600/60'
            }`}
          >
            NO
          </button>
        </div>

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
            className="w-full rounded-lg bg-[#0a0f1e] border border-white/15 px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
          />
        </div>

        {error ? (
          <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="text-center text-emerald-400 font-semibold py-2">베팅 완료!</p>
        ) : null}

        <button
          type="button"
          disabled={submitting}
          onClick={handleBet}
          className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-lg shadow-emerald-900/30"
        >
          {submitting ? '처리 중...' : '베팅하기'}
        </button>
        </>)}
      </div>
    </div>
  );
}
