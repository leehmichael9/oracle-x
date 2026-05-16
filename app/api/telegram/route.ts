import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const WEB_APP_URL = 'https://oracle-x-kappa.vercel.app';

const START_REPLY = 'Oracle-X에 오신 걸 환영합니다! 🔮';

const START_REPLY_MARKUP = {
  inline_keyboard: [
    [
      {
        text: '🎯 예측시장 참여하기',
        web_app: { url: WEB_APP_URL },
      },
    ],
  ],
} as const;

const DEFAULT_REPLY = `Oracle-X 웹앱에서 베팅에 참여하세요 👉 ${WEB_APP_URL}`;

function isStartCommand(text: string): boolean {
  const first = text.trim().split(/\s+/)[0] ?? '';
  const cmd = first.split('@')[0];
  return cmd === '/start';
}

async function sendTelegramMessage(
  chatId: number,
  text: string,
  replyMarkup?: typeof START_REPLY_MARKUP,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...(replyMarkup !== undefined && { reply_markup: replyMarkup }),
      }),
    });
  } catch {
    // Swallow: webhook must still return 200
  }
}

export async function POST(request: NextRequest) {
  try {
    const update = (await request.json()) as {
      message?: { chat?: { id?: number }; text?: string };
    };

    const chatId = update.message?.chat?.id;
    if (typeof chatId !== 'number') {
      return Response.json({ ok: true }, { status: 200 });
    }

    const text = update.message?.text ?? '';

    if (isStartCommand(text)) {
      await sendTelegramMessage(chatId, START_REPLY, START_REPLY_MARKUP);
    } else {
      await sendTelegramMessage(chatId, DEFAULT_REPLY);
    }
  } catch {
    // Invalid JSON или 기타 오류 — 텔레그램 재시도 방지
  }

  return Response.json({ ok: true }, { status: 200 });
}
