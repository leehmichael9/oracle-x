'use client';

import { Brain } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type BottomNavTab = 'home' | 'search' | 'quiz' | 'breaking' | 'profile';

type BottomNavProps = {
  activeTab: BottomNavTab;
  onHome: () => void;
  onSearch: () => void;
  onBreaking: () => void;
  onProfile: () => void;
};

type NavItem =
  | {
      id: Exclude<BottomNavTab, 'quiz'>;
      label: string;
      icon: string;
      kind: 'button';
    }
  | {
      id: 'quiz';
      label: string;
      kind: 'link';
      href: string;
    };

const NAV_ITEMS: NavItem[] = [
  { id: 'home', icon: '🏠', label: '홈', kind: 'button' },
  { id: 'search', icon: '🔍', label: '검색', kind: 'button' },
  { id: 'quiz', label: '퀴즈', kind: 'link', href: '/quiz' },
  { id: 'breaking', icon: '🔥', label: '속보', kind: 'button' },
  { id: 'profile', icon: '👤', label: '내정보', kind: 'button' },
];

function isTabActive(
  id: BottomNavTab,
  activeTab: BottomNavTab,
  pathname: string,
): boolean {
  if (id === 'quiz') return pathname === '/quiz';
  return activeTab === id;
}

export function BottomNav({
  activeTab,
  onHome,
  onSearch,
  onBreaking,
  onProfile,
}: BottomNavProps) {
  const pathname = usePathname();

  const handlers: Record<
    Exclude<BottomNavTab, 'quiz'>,
    () => void
  > = {
    home: onHome,
    search: onSearch,
    breaking: onBreaking,
    profile: onProfile,
  };

  const inactiveColor = 'rgba(255,255,255,0.4)';
  const activeColor = '#ffffff';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 h-14 border-t"
      style={{
        backgroundColor: '#1a1a2e',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-xl items-stretch">
        {NAV_ITEMS.map((item) => {
          const active = isTabActive(item.id, activeTab, pathname);
          const color = active ? activeColor : inactiveColor;

          const inner = (
            <>
              {item.kind === 'link' ? (
                <Brain
                  className="h-5 w-5 shrink-0"
                  strokeWidth={2}
                  aria-hidden
                />
              ) : (
                <span className="text-lg leading-none" aria-hidden>
                  {item.icon}
                </span>
              )}
              <span className="text-[10px] font-medium leading-none">
                {item.label}
              </span>
            </>
          );

          const className =
            'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 transition-colors';

          if (item.kind === 'link') {
            return (
              <Link
                key={item.id}
                href={item.href}
                className={className}
                style={{ color }}
              >
                {inner}
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={handlers[item.id]}
              className={className}
              style={{ color }}
            >
              {inner}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
