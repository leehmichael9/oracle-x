import { NextRequest } from 'next/server';
import {
  generateReferralCode,
  parseReferralCodeFromStartParam,
} from '@/lib/referral';
import {
  ensureUserReferralCode,
  processReferralSignup,
} from '@/lib/referral-server';
import { createSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const DEFAULT_START_POINTS = 1000;

function errorResponse(
  step: string,
  err: unknown,
  extra?: Record<string, unknown>,
  status = 500,
) {
  const message = err instanceof Error ? err.message : String(err);
  const details =
    err && typeof err === 'object' && 'details' in err
      ? (err as { details?: string }).details
      : undefined;
  const code =
    err && typeof err === 'object' && 'code' in err
      ? (err as { code?: string }).code
      : undefined;

  console.error(`[api/user/init] ${step}:`, {
    message,
    code,
    details,
    ...extra,
    err,
  });

  return Response.json(
    {
      ok: false,
      step,
      error: message,
      code,
      details,
      ...extra,
    },
    { status },
  );
}

export async function POST(request: NextRequest) {
  let step = 'init';

  try {
    step = 'parse_body';
    const body = await request.json();
    const telegramId = String(body.telegram_id ?? '').trim();
    const username = String(body.username ?? '익명').trim() || '익명';
    const startParam =
      typeof body.start_param === 'string' ? body.start_param : undefined;

    if (!telegramId) {
      return Response.json(
        { ok: false, step, error: 'telegram_id required' },
        { status: 400 },
      );
    }

    step = 'create_supabase_client';
    const admin = createSupabaseAdmin();

    step = 'generate_referral_code';
    let referralCode: string;
    try {
      referralCode = generateReferralCode(telegramId);
    } catch (err) {
      return errorResponse(step, err, { telegram_id: telegramId });
    }

    step = 'select_existing_user';
    const { data: existing, error: selectErr } = await admin
      .from('users')
      .select('id, referral_code, telegram_id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (selectErr) {
      // referral_code 컬럼 미존재 등 — id만 재조회
      console.error('[api/user/init] select with referral_code failed, retry id only:', selectErr);
      step = 'select_existing_user_fallback';
      const { data: existingFallback, error: fallbackErr } = await admin
        .from('users')
        .select('id, telegram_id')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      if (fallbackErr) {
        return errorResponse(step, fallbackErr, {
          telegram_id: telegramId,
          hint: 'users 테이블 조회 실패 — telegram_id 컬럼명/RLS 확인',
        });
      }

      if (existingFallback) {
        step = 'ensure_referral_code_existing';
        let code = referralCode;
        try {
          code = await ensureUserReferralCode(
            admin,
            existingFallback.id,
            telegramId,
            null,
          );
        } catch (err) {
          return errorResponse(step, err, { user_id: existingFallback.id });
        }

        return Response.json({
          ok: true,
          user_id: existingFallback.id,
          is_new_user: false,
          referral_code: code,
        });
      }
    } else if (existing) {
      step = 'ensure_referral_code_existing';
      let code: string;
      try {
        code = await ensureUserReferralCode(
          admin,
          existing.id,
          telegramId,
          existing.referral_code,
        );
      } catch (err) {
        return errorResponse(step, err, { user_id: existing.id });
      }

      return Response.json({
        ok: true,
        user_id: existing.id,
        is_new_user: false,
        referral_code: code,
      });
    }

    step = 'insert_new_user';
    const insertPayload: Record<string, unknown> = {
      telegram_id: telegramId,
      username,
      points: DEFAULT_START_POINTS,
      referral_code: referralCode,
    };

    const { data: newUser, error: insertErr } = await admin
      .from('users')
      .insert(insertPayload)
      .select('id, referral_code')
      .single();

    if (insertErr) {
      // 동시 요청 등으로 이미 생성된 경우 재조회
      if (insertErr.code === '23505') {
        step = 'insert_duplicate_retry_select';
        const { data: raced, error: raceErr } = await admin
          .from('users')
          .select('id, referral_code')
          .eq('telegram_id', telegramId)
          .maybeSingle();

        if (raceErr || !raced) {
          return errorResponse(step, raceErr ?? insertErr, {
            telegram_id: telegramId,
            insert_error: insertErr.message,
          });
        }

        return Response.json({
          ok: true,
          user_id: raced.id,
          is_new_user: false,
          referral_code: raced.referral_code ?? referralCode,
        });
      }

      return errorResponse(step, insertErr, {
        telegram_id: telegramId,
        payload: insertPayload,
        hint: 'users INSERT 실패 — 컬럼명(referral_code, telegram_id, username, points) 확인',
      });
    }

    if (!newUser) {
      return errorResponse(step, new Error('insert succeeded but no row returned'), {
        telegram_id: telegramId,
      });
    }

    step = 'process_referral_signup';
    const parsedReferral = parseReferralCodeFromStartParam(startParam);
    if (parsedReferral) {
      try {
        await processReferralSignup(admin, newUser.id, parsedReferral);
      } catch (err) {
        // 레퍼럴 실패는 가입 자체를 막지 않음
        console.error('[api/user/init] processReferralSignup failed (non-fatal):', err);
      }
    }

    step = 'refresh_points';
    const { data: refreshed, error: refreshErr } = await admin
      .from('users')
      .select('points')
      .eq('id', newUser.id)
      .single();

    if (refreshErr) {
      console.error('[api/user/init] refresh points failed (non-fatal):', refreshErr);
    }

    return Response.json({
      ok: true,
      user_id: newUser.id,
      is_new_user: true,
      referral_code: newUser.referral_code ?? referralCode,
      points: refreshed?.points ?? DEFAULT_START_POINTS,
    });
  } catch (err) {
    return errorResponse(step, err);
  }
}
