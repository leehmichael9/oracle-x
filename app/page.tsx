'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTelegramUser } from '@/lib/useTelegramUser';

type Market = {
  id: number;
  question: string;
  category: string;
  yes_percent: number;
  no_percent: number;
};

export default function Home() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const { userId, loading: userLoading } = useTelegramUser();

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('markets').select('*');
      setMarkets(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center py-4 px-4">
      <h1 className="text-4xl font-bold text-white tracking-widest mb-2">ORACLE-X</h1>
      <p className="text-gray-400 mb-3">Asia's Crypto Prediction Market</p>
      <Link
        href="/leaderboard"
        className="mb-4 px-5 py-2.5 rounded-xl text-sm font-semibold border border-white/15 text-white bg-[#111827] hover:bg-[#151d32] hover:border-white/25 transition-all"
      >
        리더보드
      </Link>
      {loading || userLoading ? (
        <p className="text-gray-400">로딩 중...</p>
      ) : (
        <div className="flex flex-col gap-4 w-full max-w-xl">
          {markets.map((m) => (
            <Link
              key={m.id}
              href={`/market/${m.id}`}
              className="block bg-[#111827] border border-white/10 rounded-xl p-5 cursor-pointer transition-all hover:border-white/20 hover:bg-[#151d32] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            >
              <p className="text-white text-center mb-3">{m.question}</p>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-emerald-400">YES {m.yes_percent}%</span>
                <span className="text-red-400">NO {m.no_percent}%</span>
              </div>
              <div className="flex rounded-full overflow-hidden h-2">
                <div className="bg-emerald-500" style={{ width: `${m.yes_percent}%` }}></div>
                <div className="bg-red-500" style={{ width: `${m.no_percent}%` }}></div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
