'use client';

import { useCallback, useEffect, useState } from 'react';

export function useTelegramUser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const initUser = useCallback(async () => {
    try {
      const tg = (window as Window & { Telegram?: { WebApp?: TelegramWebApp } })
        .Telegram?.WebApp;

      if (tg) tg.ready();

      let telegramId: string;
      let username: string;
      let startParam: string | undefined;

      if (tg?.initDataUnsafe?.user) {
        const tgUser = tg.initDataUnsafe.user;
        telegramId = String(tgUser.id);
        username = tgUser.username || tgUser.first_name || '익명';
        startParam = tg.initDataUnsafe.start_param;
      } else {
        telegramId = 'test_user_001';
        username = '데스트유저';
        startParam = undefined;
      }

      const res = await fetch('/api/user/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: telegramId,
          username,
          start_param: startParam,
        }),
      });

      const data = await res.json();

      if (data.ok && data.user_id) {
        setUserId(data.user_id);
      }
    } catch (error) {
      console.error('유저 초기화 오류:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initUser();
  }, [initUser]);

  return { userId, loading, refreshUser: initUser };
}

interface TelegramWebApp {
  ready: () => void;
  initDataUnsafe?: {
    user?: {
      id: number;
      username?: string;
      first_name?: string;
    };
    start_param?: string;
  };
}
