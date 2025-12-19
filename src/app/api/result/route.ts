import { NextResponse } from "next/server";
import { getSessionKey } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const sessionKey = await getSessionKey();
    const supabase = supabaseAdmin();

    const { data: isProRow } = await supabase
      .from("gp_sessions")
      .select("is_pro")
      .eq("session_key", sessionKey)
      .maybeSingle();

    const isPro = Boolean(isProRow?.is_pro);

    const { data, error } = await supabase
      .from("gp_scan_history")
      .select(
        "id,created_at,product_name,score,notes_free,notes_pro,signals,session_key"
      )
      .eq("session_key", sessionKey)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const row = data?.[0] || null;

    if (!row) {
      return NextResponse.json({ ok: true, result: null, isPro });
    }

    return NextResponse.json({
      ok: true,
      isPro,
      result: {
        id: row.id,
        created_at: row.created_at,
        product_name: row.product_name,
        score: row.score,
        notes_free: Array.isArray(row.notes_free) ? row.notes_free : [],
        notes_pro: isPro && Array.isArray(row.notes_pro) ? row.notes_pro : [],
        signals: row.signals ?? {},
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: e?.message || "result_error" },
      { status: 500 }
    );
  }
}