import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const DEFAULT_PREFS = {
  low_sodium: false,
  low_sugar: false,
  low_cholesterol: false,
  avoid_sweeteners: false,
  prefer_simple_ingredients: false,
};

function pickPrefs(body: any) {
  const safeBool = (v: any) => v === true;
  return {
    low_sodium: safeBool(body?.low_sodium),
    low_sugar: safeBool(body?.low_sugar),
    low_cholesterol: safeBool(body?.low_cholesterol),
    avoid_sweeteners: safeBool(body?.avoid_sweeteners),
    prefer_simple_ingredients: safeBool(body?.prefer_simple_ingredients),
  };
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 读
  const { data, error } = await supabase
    .from("user_preferences")
    .select("low_sodium, low_sugar, low_cholesterol, avoid_sweeteners, prefer_simple_ingredients")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 如果没有就创建默认
  if (!data) {
    const { error: upsertErr } = await supabase
      .from("user_preferences")
      .upsert({ user_id: user.id, ...DEFAULT_PREFS, updated_at: new Date().toISOString() });

    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

    return NextResponse.json({ preferences: DEFAULT_PREFS });
  }

  return NextResponse.json({ preferences: data });
}

export async function PUT(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const prefs = pickPrefs(body);

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: user.id, ...prefs, updated_at: new Date().toISOString() })
    .select("low_sodium, low_sugar, low_cholesterol, avoid_sweeteners, prefer_simple_ingredients")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ preferences: data });
}
