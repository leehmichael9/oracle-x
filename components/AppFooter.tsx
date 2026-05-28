import Link from 'next/link';

export function AppFooter() {
  return (
    <footer className="w-full bg-[#0a0f1e] border-t border-white/10 py-6 text-xs text-center">
      <div className="flex items-center justify-center gap-2">
        <Link href="/terms" className="text-slate-400 hover:text-white transition-colors">
          이용약관
        </Link>
        <span className="text-slate-600">|</span>
        <Link href="/privacy" className="text-slate-400 hover:text-white transition-colors">
          개인정보처리방침
        </Link>
      </div>
      <p className="mt-3 text-slate-500">
        본 서비스는 포인트 기반이며 실거래가 아닙니다
      </p>
      <p className="mt-2 text-slate-500">
        © 2026 Oracle-X | 엑스플래닛(주)
      </p>
    </footer>
  );
}
