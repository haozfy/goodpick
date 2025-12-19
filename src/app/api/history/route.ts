import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSessionKey } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const sessionKey = getSessionKey();

    const { data: session } = await supabaseAdmin
      .from("gp_sessions")
      .select("id")
      .eq("session_key", sessionKey)
      .single();

    if (!session) return NextResponse.json({ items: [] });

    const { data } = await supabaseAdmin
      .from("gp_scans")
      .select("id,product_name,verdict,created_at")
      .eq("session_id", session.id)
      .order("created_at", { ascending: false })
      .limit(30);

    return NextResponse.json({
      items: (data ?? []).map((x) => ({
        id: x.id,
        productName: x.product_name,
        verdict: x.verdict,
        createdAt: x.created_at,
      })),
    });
  } catch {
    return NextResponse.json({ items: [] });
  }
}