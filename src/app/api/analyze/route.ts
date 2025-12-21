import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  }

  const svc = supabaseAdmin();

  const { data: ent } = await svc
    .from("user_entitlements")
    .select("plan, scans_used, scans_limit")
    .eq("user_id", user.id)
    .single();

  const plan = ent?.plan ?? "free";
  const used = ent?.scans_used ?? 0;
  const limit = ent?.scans_limit ?? 3;

  // ✅ Pro 无限：直接放行，不扣次数
  if (plan !== "pro") {
    if (used >= limit) {
      return NextResponse.json({ ok: false, reason: "upgrade_required" }, { status: 402 });
    }
    await svc
      .from("user_entitlements")
      .update({ scans_used: used + 1, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
  }

  const result = { score: 62, label: "Good", negatives: [], positives: [] };
  return NextResponse.json({ ok: true, result });
}