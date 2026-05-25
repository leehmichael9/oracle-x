import type { SupabaseClient } from '@supabase/supabase-js';

export async function awardPoints(
  admin: SupabaseClient,
  userId: string,
  amount: number,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: user, error: fetchErr } = await admin
    .from('users')
    .select('points')
    .eq('id', userId)
    .single();

  if (fetchErr || !user) {
    return { ok: false, error: fetchErr?.message ?? '사용자를 찾을 수 없습니다.' };
  }

  const nextPoints = (user.points ?? 0) + amount;

  const { error: updateErr } = await admin
    .from('users')
    .update({ points: nextPoints })
    .eq('id', userId);

  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  const { error: txErr } = await admin.from('point_transactions').insert({
    user_id: userId,
    amount,
    reason,
  });

  if (txErr) {
    console.error('[points] point_transactions insert failed:', txErr);
    return {
      ok: false,
      error: `${txErr.message} (hint: point_transactions 컬럼 user_id/amount/reason 확인)`,
    };
  }

  return { ok: true };
}
