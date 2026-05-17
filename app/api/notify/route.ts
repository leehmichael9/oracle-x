import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const CHANNEL_ID = '@OracleX_KR'

export async function POST(request: NextRequest) {
  try {
    const { question, result } = await request.json()
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return Response.json({ ok: false }, { status: 500 })

    const emoji = result === 'YES' ? '✅' : '❌'
    const message = `🔔 *마켓 결과 발표*\n\n📌 ${question}\n\n${emoji} 결과: *${result}*\n\n예측시장 참여하기 👉 https://oracle-x-kappa.vercel.app`

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHANNEL_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    })

    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 500 })
  }
}