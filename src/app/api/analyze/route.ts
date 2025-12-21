import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const FREE_LIMIT = 3;

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未登录：直接挡
  if (!user) {
    return NextResponse.json({ ok: false, error: "login_required" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 是否付费
  const { data: profile } = await admin
    .from("profiles")
    .select("is_pro")
    .eq("id", user.id)
    .single();

  // 付费用户：无限
  if (profile?.is_pro) {
    return NextResponse.json({ ok: true, result: mockResult() });
  }

  // 免费用户：3 次
  const { data: row } = await admin
    .from("usage")
    .upsert({ user_id: user.id }, { onConflict: "user_id" })
    .select("used")
    .single();

  const used = row?.used ?? 0;
  if (used >= FREE_LIMIT) {
    return NextResponse.json(
      { ok: false, error: "limit_reached", limit: FREE_LIMIT },
      { status: 402 }
    );
  }

  await admin
    .from("usage")
    .update({ used: used + 1 })
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true, result: mockResult() });
}

// 先占位
function mockResult() {
  return {
    score: 62,
    label: "Good",
    negatives: [],
    positives: [],
  };
}