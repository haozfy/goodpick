// app/api/analyze/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

type Verdict = "good" | "caution" | "avoid";

type Prefs = {
  low_sodium: boolean;
  low_sugar: boolean;
  low_cholesterol: boolean;
  avoid_sweeteners: boolean;
  prefer_simple_ingredients: boolean;
};

type Alternative = {
  name: string;
  reason: string;
  price: "$" | "$$" | "$$$";
  sodium_mg?: number | null;
  added_sugar_g?: number | null;
  cholesterol_mg?: number | null;
  ingredient_count?: number | null;
  has_sweeteners?: boolean | null;
};

type AIResult = {
  product_name: string;
  score: number; // 0-100
  verdict: Verdict;
  risk_tags: string[];
  analysis: string;
  triggers: string[];
  alternatives: Alternative[];
};

const LOGGED_IN_FREE_LIMIT = 5; // 你要的：登录免费 5 次（非 Pro）
const ANON_FREE_LIMIT = 5;      // 未登录免费 5 次

const ALLOWED_TAGS = new Set([
  "added_sugar",
  "high_sodium",
  "refined_oils",
  "refined_carbs",
  "many_additives",
  "ultra_processed",
  "low_fiber",
  "low_protein",
  "sweeteners",
  "high_cholesterol",
  "simple_ingredients",
]);

const DEFAULT_PREFS: Prefs = {
  low_sodium: false,
  low_sugar: false,
  low_cholesterol: false,
  avoid_sweeteners: false,
  prefer_simple_ingredients: false,
};

function clampInt(n: any, min: number, max: number) {
  const x = Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : min;
  return Math.min(max, Math.max(min, x));
}

function clampNum(n: any, min: number, max: number) {
  const x = Number.isFinite(Number(n)) ? Number(n) : min;
  return Math.min(max, Math.max(min, x));
}

function verdictFromScore(score: number): Verdict {
  if (score >= 80) return "good";
  if (score >= 50) return "caution";
  return "avoid";
}

function safeJsonParse(content: string) {
  const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned);
}

function normalizeAlternative(a: any): Alternative {
  const name = String(a?.name ?? "").trim().slice(0, 80);
  const reason = String(a?.reason ?? "").trim().slice(0, 140);
  const price = (["$", "$$", "$$$"].includes(a?.price) ? a.price : "$$") as "$" | "$$" | "$$$";

  const sodium_mg =
    a?.sodium_mg === null ? null : Number.isFinite(Number(a?.sodium_mg)) ? clampInt(a.sodium_mg, 0, 5000) : null;

  const added_sugar_g =
    a?.added_sugar_g === null ? null : Number.isFinite(Number(a?.added_sugar_g)) ? clampNum(a.added_sugar_g, 0, 200) : null;

  const cholesterol_mg =
    a?.cholesterol_mg === null ? null : Number.isFinite(Number(a?.cholesterol_mg)) ? clampInt(a.cholesterol_mg, 0, 2000) : null;

  const ingredient_count =
    a?.ingredient_count === null ? null : Number.isFinite(Number(a?.ingredient_count)) ? clampInt(a.ingredient_count, 0, 200) : null;

  const has_sweeteners =
    typeof a?.has_sweeteners === "boolean" ? a.has_sweeteners : null;

  return {
    name,
    reason,
    price,
    sodium_mg,
    added_sugar_g,
    cholesterol_mg,
    ingredient_count,
    has_sweeteners,
  };
}

function normalizeAI(raw: any): AIResult {
  const product_name = String(raw?.product_name ?? "").trim() || "Unknown product";
  const score = clampInt(raw?.score, 0, 100);

  const vRaw = String(raw?.verdict ?? "").toLowerCase();
  const verdict: Verdict =
    vRaw === "good" || vRaw === "caution" || vRaw === "avoid" ? vRaw : verdictFromScore(score);

  const analysis = String(raw?.analysis ?? "").trim().slice(0, 160);

  const risk_tags = Array.isArray(raw?.risk_tags)
    ? raw.risk_tags
        .map((t: any) => String(t).trim().toLowerCase())
        .filter((t: string) => ALLOWED_TAGS.has(t))
        .slice(0, 8)
    : [];

  const triggers = Array.isArray(raw?.triggers)
    ? raw.triggers.map((x: any) => String(x).trim().slice(0, 90)).filter(Boolean).slice(0, 3)
    : [];

  let alternatives: Alternative[] = [];
  if (verdict !== "good" && Array.isArray(raw?.alternatives)) {
    alternatives = raw.alternatives
      .slice(0, 3)
      .map(normalizeAlternative)
      .filter((a: Alternative) => a.name.length > 0);
  }

  // good => alternatives 必须空
  if (verdict === "good") alternatives = [];

  return { product_name, score, verdict, risk_tags, analysis, triggers, alternatives };
}

function prefsToPrompt(p: Prefs) {
  const on: string[] = [];
  if (p.low_sodium) on.push("low_sodium");
  if (p.low_sugar) on.push("low_sugar");
  if (p.low_cholesterol) on.push("low_cholesterol");
  if (p.avoid_sweeteners) on.push("avoid_sweeteners");
  if (p.prefer_simple_ingredients) on.push("prefer_simple_ingredients");
  return on.length ? on.join(", ") : "none";
}

function getOrSetAnonId() {
  const jar = cookies();
  const key = "gp_anon";
  const existing = jar.get(key)?.value;

  if (existing) return existing;

  const anonId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

  jar.set(key, anonId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    // ✅ 本地测试不能 secure:true，否则 cookie 根本写不进去
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });

  return anonId;
}

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // ✅ 0) prefs：只有登录用户才读（匿名就默认）
    let prefs: Prefs = { ...DEFAULT_PREFS };
    if (user) {
      const { data: prefRow } = await supabase
        .from("user_preferences")
        .select("low_sodium, low_sugar, low_cholesterol, avoid_sweeteners, prefer_simple_ingredients")
        .eq("user_id", user.id)
        .maybeSingle();

      prefs = { ...DEFAULT_PREFS, ...(prefRow || {}) };
    }

    // ✅ 1) 配额逻辑：分登录 / 匿名
    let isPro = false;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_pro")
        .eq("id", user.id)
        .single();
      isPro = !!profile?.is_pro;

      if (!isPro) {
        const { count, error: countError } = await supabase
          .from("scans")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (countError) throw new Error("Failed to check quota");
        if (count !== null && count >= LOGGED_IN_FREE_LIMIT) {
          return NextResponse.json(
            { error: "Free limit reached", code: "LIMIT_REACHED" },
            { status: 403 }
          );
        }
      }
    } else {
      const anonId = getOrSetAnonId();

      const { count, error: countError } = await supabase
        .from("anon_scans")
        .select("*", { count: "exact", head: true })
        .eq("anon_id", anonId);

      if (countError) throw new Error("Failed to check anon quota");
      if (count !== null && count >= ANON_FREE_LIMIT) {
        return NextResponse.json(
          { error: "Anon free limit reached", code: "ANON_LIMIT_REACHED" },
          { status: 403 }
        );
      }
    }

    // ✅ 2) OpenAI 分析（保持你原标准）
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 650,
        messages: [
          {
            role: "system",
            content: `You are a strict, consistent nutrition scoring engine.

Return ONLY valid JSON (no markdown). Use this exact structure:
{
  "product_name": string,
  "score": integer 0-100,
  "verdict": "good" | "caution" | "avoid",
  "risk_tags": string[],
  "analysis": string,
  "triggers": string[],
  "alternatives": [
    {
      "name": string,
      "reason": string,
      "price": "$" | "$$" | "$$$",
      "sodium_mg": number | null,
      "added_sugar_g": number | null,
      "cholesterol_mg": number | null,
      "ingredient_count": number | null,
      "has_sweeteners": boolean | null
    }
  ]
}

User preferences (may tighten rules): ${prefsToPrompt(prefs)}.

Scoring rule:
Start from 100 and only subtract points based on health risks:
- added sugar: 0-35
- ultra processed: 0-25
- refined carbs: 0-20
- poor oils: 0-15
- high sodium: 0-10
- many additives: 0-15
Clamp to 0-100.

Verdict mapping:
- score >= 80 => "good"
- 50-79 => "caution"
- <= 49 => "avoid"

risk_tags must be from this fixed set only:
["added_sugar","high_sodium","refined_oils","refined_carbs","many_additives","ultra_processed","low_fiber","low_protein","sweeteners","high_cholesterol","simple_ingredients"]

analysis: short, punchy.
triggers: 1-3 verifiable bullets (numbers if visible).
alternatives:
- if verdict good => []
- else 2-3 cleaner realistic swaps (same category), meta fields null if unknown.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this food label/product. Extract numbers if visible." },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return NextResponse.json({ error: "Invalid AI response" }, { status: 500 });

    let aiResult: AIResult;
    try {
      aiResult = normalizeAI(safeJsonParse(content));
    } catch {
      return NextResponse.json({ error: "AI failed to analyze" }, { status: 500 });
    }

    // ✅ 3) 写入：登录写 scans；匿名写 anon_scans
    if (user) {
      const { data: scanData, error: dbError } = await supabase
        .from("scans")
        .insert({
          user_id: user.id,
          image_url: "",
          product_name: aiResult.product_name,
          score: aiResult.score,
          verdict: aiResult.verdict,
          grade: aiResult.verdict === "good" ? "green" : "black",
          analysis: aiResult.analysis,
          risk_tags: aiResult.risk_tags,
          triggers: aiResult.triggers,
          alternatives: aiResult.alternatives,
        })
        .select("id")
        .single();

      if (dbError) throw new Error(dbError.message);
      return NextResponse.json({ id: scanData.id, mode: "user" });
    } else {
      const anonId = getOrSetAnonId();

      const { data: row, error: dbError } = await supabase
        .from("anon_scans")
        .insert({
          anon_id: anonId,
          product_name: aiResult.product_name,
          score: aiResult.score,
          verdict: aiResult.verdict,
          analysis: aiResult.analysis,
          risk_tags: aiResult.risk_tags,
          triggers: aiResult.triggers,
          alternatives: aiResult.alternatives,
        })
        .select("id")
        .single();

      if (dbError) throw new Error(dbError.message);

      // ✅ 匿名也返回一个 id，前端照样跳转结果页
      return NextResponse.json({ id: row.id, mode: "anon" });
    }
  } catch (error: any) {
    console.error("Analyze API Error:", error);
    return NextResponse.json({ error: error.message ?? "Server error" }, { status: 500 });
  }
}