import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, reason: "login_required" },
      { status: 401 }
    );
  }

  const admin = supabaseAdmin();

  // 取 entitlement（没有就创建一条 free）
  let { data: ent } = await admin
    .from("user_entitlements")
    .select("plan, scans_used, scans_limit")
    .eq("user_id", user.id)
    .single();

  if (!ent) {
    const inserted = await admin
      .from("user_entitlements")
      .upsert(
        { user_id: user.id, plan: "free", scans_used: 0, scans_limit: 3 },
        { onConflict: "user_id" }
      )
      .select("plan, scans_used, scans_limit")
      .single();

    ent = inserted.data ?? { plan: "free", scans_used: 0, scans_limit: 3 };
  }

  const plan = ent.plan ?? "free";
  const limit = ent.scans_limit ?? 3;

  // pro 不限
  if (plan !== "pro") {
    // 原子扣次数：只有 scans_used < limit 才能扣
    const { data: updated } = await admin
      .from("user_entitlements")
      .update({ scans_used: (ent.scans_used ?? 0) + 1 })
      .eq("user_id", user.id)
      .lt("scans_used", limit)
      .select("scans_used")
      .single();

    if (!updated) {
      return NextResponse.json(
        { ok: false, reason: "upgrade_required" },
        { status: 402 }
      );
    }
  }

  // TODO: 这里放你真实的分析逻辑
  const result = {
    score: 62,
    label: "Good",
    negatives: [],
    positives: [],
  };

  return NextResponse.json({ ok: true, result });
}