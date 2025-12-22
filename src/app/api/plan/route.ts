import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const FREE_LIMIT = 3;

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = supabaseAdmin();

  // 游客：靠 device_id（前端传 ?device_id=xxx）
  const url = new URL(req.url);
  const deviceId = url.searchParams.get("device_id") || null;

  if (!user) {
    if (!deviceId) {
      return NextResponse.json({ kind: "guest", left: FREE_LIMIT });
    }

    const { data: usage } = await admin
      .from("usage")
      .select("free_judgements_used")
      .eq("device_id", deviceId)
      .maybeSingle();

    const used = usage?.free_judgements_used ?? 0;
    return NextResponse.json({ kind: "guest", left: Math.max(0, FREE_LIMIT - used) });
  }

  // 登录用户：读 profiles.is_pro
  const { data: profile } = await admin
    .from("profiles")
    .select("is_pro")
    .eq("id", user.id)
    .single();

  if (profile?.is_pro) return NextResponse.json({ kind: "pro" });

  // free 用户：读 usage.user_id
  const { data: usage } = await admin
    .from("usage")
    .select("free_judgements_used")
    .eq("user_id", user.id)
    .maybeSingle();

  const used = usage?.free_judgements_used ?? 0;
  return NextResponse.json({ kind: "free", left: Math.max(0, FREE_LIMIT - used) });
}