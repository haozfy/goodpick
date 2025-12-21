import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server"; // ✅ 1. 引入服务端 Client
import { supabaseAdmin } from "@/lib/supabase/admin"; // ✅ 2. 引入 Admin Client

export const runtime = "nodejs";
const LIMIT = 3;
const COOKIE_NAME = "gp_guest";

// ❌ 删除了这里本地定义的 function supabaseAdmin() ...
// 直接复用 import 进来的，保持代码整洁

async function getUsed(key: string) {
  // ✅ 3. 调用引入的 Admin 函数
  const admin = supabaseAdmin();
  
  const { data, error } = await admin
    .from("gp_quota")
    .select("used")
    .eq("key", key)
    .single();

  if (error) return 0;
  return data?.used ?? 0;
}

export async function GET(req: NextRequest) {
  // ✅ 4. 改为异步 await createClient()
  const supabase = await createClient();
  
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  if (user) {
    const admin = supabaseAdmin();
    const { data: prof } = await admin
      .from("profiles")
      .select("plan,is_pro") // 确认你的表里是叫 is_pro 还是 plan，这里保留了原逻辑
      .eq("id", user.id)
      .single();

    const paid = prof?.is_pro === true || prof?.plan === "pro";
    if (paid) {
      return NextResponse.json({ ok: true, loggedIn: true, paid: true, remaining: null });
    }

    const used = await getUsed(`u_${user.id}`);
    return NextResponse.json({
      ok: true,
      loggedIn: true,
      paid: false,
      remaining: Math.max(0, LIMIT - used),
      limit: LIMIT,
      used,
    });
  }

  const guestId = req.cookies.get(COOKIE_NAME)?.value ?? null;
  if (!guestId) {
    return NextResponse.json({ ok: true, loggedIn: false, paid: false, remaining: LIMIT, limit: LIMIT, used: 0 });
  }

  const used = await getUsed(`g_${guestId}`);
  return NextResponse.json({
    ok: true,
    loggedIn: false,
    paid: false,
    remaining: Math.max(0, LIMIT - used),
    limit: LIMIT,
    used,
  });
}
