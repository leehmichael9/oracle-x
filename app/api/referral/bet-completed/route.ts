import { NextRequest } from 'next/server';
import { processReferralFirstBet } from '@/lib/referral-server';
import { createSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = String(body.user_id ?? '').trim();

    if (!userId) {
      return Response.json({ ok: false, error: 'user_id required' }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    const result = await processReferralFirstBet(admin, userId);

    return Response.json({ ok: true, ...result });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'referral bet failed',
      },
      { status: 500 },
    );
  }
}
