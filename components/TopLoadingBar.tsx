'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function TopLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    setProgress(0);

    const t1 = setTimeout(() => setProgress(30), 50);
    const t2 = setTimeout(() => setProgress(60), 200);
    const t3 = setTimeout(() => setProgress(85), 400);
    const t4 = setTimeout(() => setProgress(100), 600);
    const t5 = setTimeout(() => setVisible(false), 900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '3px',
      zIndex: 99999,
      backgroundColor: '#1a1a2e',
    }}>
      <div style={{
        height: '100%',
        width: `${progress}%`,
        background: '#10b981',
        transition: 'width 0.3s ease',
        boxShadow: '0 0 10px #10b981',
      }} />
    </div>
  );
}