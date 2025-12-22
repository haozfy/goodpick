import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const FREE_LIMIT = 3;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = supabaseAdmin();

  const body = await req.json().catch(() => ({}));
  const deviceId: string | null = body.device_id ?? null;

  // 1) 如果是 Pro，直接放行
  if (user) {
    const { data: profile } = await admin
      .from("profiles")
      .select("is_pro")
      .eq("id", user.id)
      .single();

    if (profile?.is_pro) {
      return NextResponse.json({ ok: true, allowed: true });
    }
  }

  // 2) Free / Guest：检查 usage
  const key = user ? { user_id: user.id } : { device_id: deviceId };
  if (!user && !deviceId) {
    return NextResponse.json({ ok: false, error: "Missing device_id" }, { status: 400 });
  }

  const { data: usage } = await admin
    .from("usage")
    .select("free_judgements_used")
    .match(key)
    .maybeSingle();

  const used = usage?.free_judgements_used ?? 0;

  if (used >= FREE_LIMIT) {
    return NextResponse.json({ ok: true, allowed: false, reason: "paywall" });
  }

  // 3) 允许：扣一次
  const { error } = await admin
    .from("usage")
    .upsert(
      {
        ...key,
        free_judgements_used: used + 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: user ? "user_id" : "device_id" }
    );

  if (error) return NextResponse.json({ ok: false }, { status: 500 });

  return NextResponse.json({ ok: true, allowed: true, left: FREE_LIMIT - (used + 1) });
}