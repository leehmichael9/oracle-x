import { NextRequest } from 'next/server';
import {
  generateReferralCode,
  parseReferralCodeFromStartParam,
} from '@/lib/referral';
import { processReferralSignup } from '@/lib/referral-server';
import { createSupabaseAdmin } from '@/lib/supabase-admin';
import {
  findUserByTelegramId,
  persistUserReferralCode,
  usersHasReferralCodeColumn,
} from '@/lib/users-db';

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

    const hasReferralCodeColumn = await usersHasReferralCodeColumn(admin);

    step = 'select_existing_user';
    const { user: existing, error: findErr } = await findUserByTelegramId(
      admin,
      telegramId,
    );

    if (findErr) {
      return errorResponse(step, findErr, {
        telegram_id: telegramId,
        hint: 'users 테이블 조회 실패 — telegram_id 컬럼명/RLS 확인',
      });
    }

    if (existing) {
      step = 'ensure_referral_code_existing';
      let code = existing.referral_code ?? referralCode;
      if (!existing.referral_code) {
        try {
          const persisted = await persistUserReferralCode(
            admin,
            { id: existing.id, telegram_id: existing.telegram_id },
            referralCode,
          );
          code = persisted.code;
          if (persisted.warning) {
            console.warn('[api/user/init] referral_code not persisted:', persisted.warning);
          }
        } catch (err) {
          return errorResponse(step, err, {
            user_id: existing.id,
            telegram_id: existing.telegram_id,
          });
        }
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
    };
    if (hasReferralCodeColumn) {
      insertPayload.referral_code = referralCode;
    }

    const insertQuery = admin.from('users').insert(insertPayload);
    const { data: newUser, error: insertErr } = hasReferralCodeColumn
      ? await insertQuery.select('id, referral_code').single()
      : await insertQuery.select('id').single();

    if (insertErr) {
      if (insertErr.code === '23505') {
        step = 'insert_duplicate_retry_select';
        const { user: raced, error: raceErr } = await findUserByTelegramId(
          admin,
          telegramId,
        );

        if (raceErr || !raced) {
          return errorResponse(step, raceErr ?? insertErr, {
            telegram_id: telegramId,
            insert_error: insertErr.message,
          });
        }

        const code =
          raced.referral_code ??
          (await persistUserReferralCode(
            admin,
            { id: raced.id, telegram_id: raced.telegram_id },
            referralCode,
          )).code;

        return Response.json({
          ok: true,
          user_id: raced.id,
          is_new_user: false,
          referral_code: code,
        });
      }

      return errorResponse(step, insertErr, {
        telegram_id: telegramId,
        payload: insertPayload,
        hint: 'users INSERT 실패 — 컬럼명(telegram_id, username, points) 확인',
      });
    }

    if (!newUser?.id) {
      return errorResponse(step, new Error('insert succeeded but no row returned'), {
        telegram_id: telegramId,
      });
    }

    const userId = String(newUser.id);
    const savedReferralCode = hasReferralCodeColumn
      ? ((newUser as { referral_code?: string }).referral_code ?? referralCode)
      : referralCode;

    step = 'process_referral_signup';
    const parsedReferral = parseReferralCodeFromStartParam(startParam);
    if (parsedReferral && hasReferralCodeColumn) {
      try {
        await processReferralSignup(admin, userId, parsedReferral);
      } catch (err) {
        console.error('[api/user/init] processReferralSignup failed (non-fatal):', err);
      }
    }

    step = 'refresh_points';
    const { data: refreshed, error: refreshErr } = await admin
      .from('users')
      .select('points')
      .eq('id', userId)
      .single();

    if (refreshErr) {
      console.error('[api/user/init] refresh points failed (non-fatal):', refreshErr);
    }

    return Response.json({
      ok: true,
      user_id: userId,
      is_new_user: true,
      referral_code: savedReferralCode,
      points: refreshed?.points ?? DEFAULT_START_POINTS,
    });
  } catch (err) {
    return errorResponse(step, err);
  }
}
