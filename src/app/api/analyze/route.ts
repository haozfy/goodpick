import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  }

  const svc = supabaseService();
  const { data: ent } = await svc
    .from("user_entitlements")
    .select("plan, scans_used, scans_limit")
    .eq("user_id", user.id)
    .single();

  const plan = ent?.plan ?? "free";
  const used = ent?.scans_used ?? 0;
  const limit = ent?.scans_limit ?? 3;

  if (plan !== "pro" && used >= limit) {
    return NextResponse.json(
      { ok: false, reason: "upgrade_required" },
      { status: 402 }
    );
  }

  // 先扣次数（防刷）
  if (plan !== "pro") {
    await svc
      .from("user_entitlements")
      .update({ scans_used: used + 1 })
      .eq("user_id", user.id);
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