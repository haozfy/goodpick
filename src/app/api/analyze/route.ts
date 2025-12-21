import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const LIMIT = 3;
const COOKIE_NAME = "gp_guest";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function enforceQuota(key: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin.rpc("gp_enforce_quota", {
    p_key: key,
    p_limit: LIMIT,
  });

  if (error) {
    return { ok: false as const, status: 500, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row?.ok) {
    return {
      ok: false as const,
      status: 429,
      error: row?.error ?? "limit_reached",
      used: row?.used ?? LIMIT,
      limit: row?.quota_limit ?? LIMIT,
    };
  }

  return { ok: true as const };
}

// 你之后把真正的分析逻辑写在这里
async function analyze(body: any) {
  return {
    verdict: "unknown",
    reasons: ["TODO"],
    suggestion: "TODO",
  };
}

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  // ===== 登录用户 =====
  if (user) {
    const admin = supabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_pro, plan")
      .eq("id", user.id)
      .single();

    const paid = profile?.is_pro === true || profile?.plan === "pro";

    if (!paid) {
      const quota = await enforceQuota(`u_${user.id}`);
      if (!quota.ok) {
        return NextResponse.json(
          {
            gate: "login_not_paid_limited",
            error: quota.error,
            used: quota.used,
            limit: quota.limit,
          },
          { status: quota.status }
        );
      }
    }

    const body = await req.json();
    const result = await analyze(body);

    return NextResponse.json({
      ok: true,
      gate: paid ? "paid_unlimited" : "login_not_paid_limited",
      result,
    });
  }

  // ===== 未登录 guest =====
  let guestId = req.cookies.get(COOKIE_NAME)?.value;
  let needSetCookie = false;

  if (!guestId) {
    guestId = randomUUID();
    needSetCookie = true;
  }

  const quota = await enforceQuota(`g_${guestId}`);
  if (!quota.ok) {
    const res = NextResponse.json(
      {
        gate: "guest_limited",
        error: quota.error,
        used: quota.used,
        limit: quota.limit,
      },
      { status: quota.status }
    );

    if (needSetCookie) {
      res.cookies.set(COOKIE_NAME, guestId, {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: COOKIE_MAX_AGE,
      });
    }

    return res;
  }

  const body = await req.json();
  const result = await analyze(body);

  const res = NextResponse.json({
    ok: true,
    gate: "guest_limited",
    result,
  });

  if (needSetCookie) {
    res.cookies.set(COOKIE_NAME, guestId, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
  }

  return res;
}