import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
const LIMIT = 3;
const COOKIE_NAME = "gp_guest";

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function getUsed(key: string) {
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
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  if (user) {
    const admin = supabaseAdmin();
    const { data: prof } = await admin
      .from("profiles")
      .select("plan,is_pro")
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