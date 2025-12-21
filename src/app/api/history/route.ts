import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseFromAuthHeader(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return { supabase: null, token: null };

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  return { supabase, token };
}

export async function GET(req: Request) {
  const { supabase } = supabaseFromAuthHeader(req);
  if (!supabase) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("gp_scan_history")
    .select("id,created_at,product_name,score,verdict,headline,notes_free,notes_pro,signals")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, result: data?.[0] ?? null });
}