// src/app/api/better/route.ts
import { NextResponse } from "next/server";
import { getSessionKey } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const POOL = [
  // MVP：每类 5-10 个，先写 30-80 个就够用
  { category: "crackers", name: "Simple Mills Almond Flour Crackers", score: 88, tags: ["low_sodium", "no_sweetener"] },
  { category: "crackers", name: "Mary's Gone Crackers (Original)", score: 84, tags: ["no_sweetener"] },
  { category: "snack_bar", name: "RXBAR (No B.S.)", score: 82, tags: ["no_sweetener"] },
];

export async function GET() {
  const sessionId = getSessionKey();

  // 先占位：后续接 Stripe 变 true
  const isPro = false;

  if (!isPro) return NextResponse.json({ isPro, picks: [] });

  const { data } = await supabaseAdmin
    .from("gp_analyses")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1);

  const last = data?.[0];
  if (!last) return NextResponse.json({ isPro, picks: [] });

  const cat = (last.category_hint ?? "crackers").toString();
  const s = last.signals ?? {};

  // 致命问题优先：sweetener > sugar > sodium
  const fatal =
    s.artificial_sweeteners === "present" ? "no_sweetener" :
    s.added_sugar === "high" ? "low_sugar" :
    s.sodium === "high" ? "low_sodium" : null;

  const picks = POOL
    .filter((p) => p.category === cat)
    .filter((p) => (fatal ? p.tags.includes(fatal) : true))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((p) => ({
      name: p.name,
      score: p.score,
      why: fatal === "no_sweetener" ? "No artificial sweeteners." :
           fatal === "low_sugar" ? "Lower added sugar." :
           fatal === "low_sodium" ? "Lower sodium." : "A better balance overall.",
    }));

  return NextResponse.json({ isPro, picks });
}