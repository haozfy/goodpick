import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSessionKey } from "@/lib/session";

export async function GET() {
  try {
    const sessionKey = await getSessionKey();

    if (!sessionKey) {
      return NextResponse.json({ ok: true, history: [] });
    }

    // ✅ 关键修复点
    const supabase = supabaseAdmin();

    const { data, error } = await supabase
      .from("gp_sessions")
      .select("id, created_at, result")
      .eq("session_key", sessionKey)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error(error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      history: data ?? [],
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}