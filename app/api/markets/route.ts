import { NextRequest } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type CreateMarketBody = {
  question?: string;
  category?: string;
  sub_category?: string | null;
  yes_percent?: number;
  no_percent?: number;
  end_date?: string;
  is_breaking?: boolean;
  image_url?: string | null;
  tags?: string[] | null;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateMarketBody;

    const question = body.question?.trim();
    if (!question) {
      return Response.json({ ok: false, error: '질문을 입력해 주세요.' }, { status: 400 });
    }

    const yes = Number(body.yes_percent);
    const no = Number(body.no_percent);
    if (!Number.isFinite(yes) || !Number.isFinite(no)) {
      return Response.json(
        { ok: false, error: 'YES/NO 비율은 숫자로 입력해 주세요.' },
        { status: 400 },
      );
    }
    if (yes + no !== 100) {
      return Response.json(
        { ok: false, error: 'YES 비율과 NO 비율의 합계는 100이어야 합니다.' },
        { status: 400 },
      );
    }

    if (!body.end_date?.trim()) {
      return Response.json(
        { ok: false, error: '마감일(end_date)을 입력해 주세요.' },
        { status: 400 },
      );
    }

    const parsedEndDate = new Date(body.end_date);
    if (Number.isNaN(parsedEndDate.getTime())) {
      return Response.json(
        { ok: false, error: '마감일 형식이 올바르지 않습니다.' },
        { status: 400 },
      );
    }

    const tags =
      Array.isArray(body.tags) && body.tags.length > 0
        ? body.tags.map((t) => String(t).trim()).filter(Boolean)
        : null;

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('markets')
      .insert({
        question,
        category: body.category,
        sub_category: body.sub_category?.trim() || null,
        yes_percent: yes,
        no_percent: no,
        status: 'active',
        result: null,
        end_date: parsedEndDate.toISOString(),
        is_breaking: Boolean(body.is_breaking),
        image_url: body.image_url?.trim() || null,
        tags,
      })
      .select('id')
      .single();

    if (error) {
      return Response.json(
        { ok: false, error: error.message ?? '마켓 생성에 실패했습니다.' },
        { status: 500 },
      );
    }

    return Response.json({ ok: true, id: data?.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : '마켓 생성에 실패했습니다.';
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
