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

  if (error) return { ok: false as const, status: 500, error: error.message };

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
  return { ok: true as const, used: row.used, limit: row.quota_limit };
}

async function isPaid(userId: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("profiles")
    .select("plan,is_pro")
    .eq("id", userId)
    .single();

  if (error) return false;
  return data?.is_pro === true || data?.plan === "pro";
}

async function yourAnalyze(body: any) {
  // TODO: 这里接你的食品判断逻辑/模型调用
  return {
    verdict: "unknown",
    reasons: ["TODO: implement yourAnalyze()"],
    suggestion: "TODO",
    raw: body,
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    // A) 登录用户
    if (user) {
      const paid = await isPaid(user.id);
      if (!paid) {
        const quota = await enforceQuota(`u_${user.id}`);
        if (!quota.ok) {
          return NextResponse.json(
            { ok: false, gate: "login_not_paid_limited", ...quota },
            { status: quota.status }
          );
        }
      }

      const body = await req.json();
      const result = await yourAnalyze(body);

      return NextResponse.json({
        ok: true,
        gate: paid ? "paid_unlimited" : "login_not_paid_limited",
        user_id: user.id,
        result,
      });
    }

    // B) 未登录：guest cookie
    let guestId = req.cookies.get(COOKIE_NAME)?.value ?? null;
    let shouldSet = false;

    if (!guestId) {
      guestId = randomUUID();
      shouldSet = true;
    }

    const quota = await enforceQuota(`g_${guestId}`);
    if (!quota.ok) {
      const res = NextResponse.json(
        { ok: false, gate: "guest_limited", ...quota },
        { status: quota.status }
      );
      if (shouldSet) {
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
    const result = await yourAnalyze(body);

    const res = NextResponse.json({
      ok: true,
      gate: "guest_limited",
      guest_id: guestId,
      result,
    });

    if (shouldSet && guestId) {
      res.cookies.set(COOKIE_NAME, guestId, {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: COOKIE_MAX_AGE,
      });
    }

    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}