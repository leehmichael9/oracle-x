import { NextRequest } from 'next/server';
import { getReferralStats } from '@/lib/referral-server';
import { createSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user_id')?.trim();

    if (!userId) {
      return Response.json({ ok: false, error: 'user_id required' }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    const stats = await getReferralStats(admin, userId);

    return Response.json({ ok: true, ...stats });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'stats failed',
      },
      { status: 500 },
    );
  }
}
