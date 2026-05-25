'use client';

export type BottomNavTab = 'home' | 'search' | 'breaking' | 'profile';

type BottomNavProps = {
  activeTab: BottomNavTab;
  onHome: () => void;
  onSearch: () => void;
  onBreaking: () => void;
  onProfile: () => void;
};

const NAV_ITEMS: { id: BottomNavTab; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: '홈' },
  { id: 'search', icon: '🔍', label: '검색' },
  { id: 'breaking', icon: '🔥', label: '속보' },
  { id: 'profile', icon: '👤', label: '내정보' },
];

export function BottomNav({
  activeTab,
  onHome,
  onSearch,
  onBreaking,
  onProfile,
}: BottomNavProps) {
  const handlers: Record<BottomNavTab, () => void> = {
    home: onHome,
    search: onSearch,
    breaking: onBreaking,
    profile: onProfile,
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 h-14 border-t"
      style={{
        backgroundColor: '#1a1a2e',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <div className="mx-auto flex h-full max-w-xl items-stretch">
        {NAV_ITEMS.map(({ id, icon, label }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={handlers[id]}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors"
              style={{ color: active ? '#ffffff' : 'rgba(255,255,255,0.4)' }}
            >
              <span className="text-lg leading-none" aria-hidden>
                {icon}
              </span>
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
