import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server"; // ✅ 1. 改这里：引入 createClient
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  // ✅ 2. 改这里：必须加 await
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  }

  // Admin 客户端初始化 (之前改过的 supabaseAdmin 是个函数)
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
    
    // 扣费逻辑：更新使用次数
    // 建议加上 updated_at 记录最后一次扫描时间
    await svc
      .from("user_entitlements")
      .update({ 
        scans_used: used + 1, 
        updated_at: new Date().toISOString() 
      })
      .eq("user_id", user.id);
  }

  // 模拟返回结果
  const result = { score: 62, label: "Good", negatives: [], positives: [] };
  return NextResponse.json({ ok: true, result });
}
