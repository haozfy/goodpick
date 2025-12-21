// src/app/api/analyze/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // 避免 edge 环境下某些依赖不兼容

const LIMIT = 3;

// 仅服务端用（Service Role）
function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function enforceGuestQuota() {
  const guestId = cookies().get("gp_guest")?.value;

  if (!guestId) {
    return { ok: false as const, status: 400, error: "no_guest_cookie" };
  }

  const admin = supabaseAdmin();

  // 确保有记录
  const { data: row, error: upsertErr } = await admin
    .from("gp_guest_quota")
    .upsert({ guest_id: guestId }, { onConflict: "guest_id" })
    .select("used")
    .single();

  if (upsertErr) {
    return { ok: false as const, status: 500, error: upsertErr.message };
  }

  const used = row?.used ?? 0;

  if (used >= LIMIT) {
    return {
      ok: false as const,
      status: 402,
      error: "guest_limit_reached",
      limit: LIMIT,
      used,
    };
  }

  // 扣 1 次（简单版本：读-改-写；足够用）
  const { error: incErr } = await admin
    .from("gp_guest_quota")
    .update({ used: used + 1 })
    .eq("guest_id", guestId);

  if (incErr) {
    return { ok: false as const, status: 500, error: incErr.message };
  }

  return { ok: true as const, guestId, usedBefore: used, limit: LIMIT };
}

export async function POST(req: Request) {
  try {
    // 1) 先判断登录态：登录用户不限次
    const supabase = await supabaseServer();
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    // 2) 未登录：执行“每设备 3 次”限制
    if (!user) {
      const quota = await enforceGuestQuota();
      if (!quota.ok) {
        return NextResponse.json(
          { ok: false, error: quota.error, ...(quota as any) },
          { status: quota.status }
        );
      }
    }

    // 3) 你的 analyze 输入
    const body = await req.json();

    // ============================
    // ✅ 把你原来的分析逻辑放这里
    // 例如：
    // const result = await analyzeFood(body);
    // return NextResponse.json({ ok: true, result });
    // ============================

    // 临时示例返回（你替换掉）
    return NextResponse.json({
      ok: true,
      user_id: user?.id ?? null,
      message: "analyze ok (replace with your real analyze logic)",
      input: body,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unknown_error" },
      { status: 500 }
    );
  }
}