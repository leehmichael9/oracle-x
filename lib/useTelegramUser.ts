'use client'

import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function useTelegramUser() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function initUser() {
      try {
        const tg = (window as any).Telegram?.WebApp
        let telegramId: string
        let username: string

        if (tg && tg.initDataUnsafe?.user) {
          const tgUser = tg.initDataUnsafe.user
          telegramId = String(tgUser.id)
          username = tgUser.username || tgUser.first_name || '익명'
          tg.ready()
        } else {
          telegramId = 'test_user_001'
          username = '테스트유저'
        }

        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('telegram_id', telegramId)
          .single()

        if (existingUser) {
          setUserId(existingUser.id)
        } else {
          const { data: newUser } = await supabase
            .from('users')
            .insert({ telegram_id: telegramId, username, points: 1000 })
            .select('id')
            .single()

          if (newUser) setUserId(newUser.id)
        }
      } catch (error) {
        console.error('유저 초기화 오류:', error)
      } finally {
        setLoading(false)
      }
    }

    initUser()
  }, [])

  return { userId, loading }
}