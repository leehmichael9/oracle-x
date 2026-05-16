import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const WEB_APP_URL = 'https://oracle-x-kappa.vercel.app';

const START_REPLY =
  `Oracle-X에 오신 걸 환영합니다! 🔮 예측시장에 참여하려면 아래 링크를 클릭하세요: ${WEB_APP_URL}`;

const DEFAULT_REPLY = `Oracle-X 웹앱에서 베팅에 참여하세요 👉 ${WEB_APP_URL}`;

function isStartCommand(text: string): boolean {
  const first = text.trim().split(/\s+/)[0] ?? '';
  const cmd = first.split('@')[0];
  return cmd === '/start';
}

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
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
    const reply = isStartCommand(text) ? START_REPLY : DEFAULT_REPLY;

    await sendTelegramMessage(chatId, reply);
  } catch {
    // Invalid JSON или 기타 오류 — 텔레그램 재시도 방지
  }

  return Response.json({ ok: true }, { status: 200 });
}
