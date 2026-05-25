import { NextRequest } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const HISTORY_LIMIT = 20;

export async function GET(request: NextRequest) {
  try {
    const telegramId = request.nextUrl.searchParams.get('telegram_id')?.trim();

    if (!telegramId) {
      return Response.json({ error: 'telegram_id required' }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    const { data, error } = await admin
      .from('point_transactions')
      .select('amount, reason, created_at')
      .eq('user_id', telegramId)
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT);

    if (error) {
      console.error('[api/user/points-history] fetch:', error);
      return Response.json(
        { ok: false, error: error.message, code: error.code },
        { status: 500 },
      );
    }

    return Response.json({
      ok: true,
      items: data ?? [],
    });
  } catch (err) {
    console.error('[api/user/points-history] unexpected:', err);
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'internal_error',
      },
      { status: 500 },
    );
  }
}
