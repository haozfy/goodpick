import { NextResponse } from "next/server";
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

  // ✅ 可复核 meta（有就用，没有也行）
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
  analysis: string; // max 15 words (主句)
  triggers: string[]; // ✅ 新增：可复核触发点（1-3条）
  alternatives: Alternative[];
};

const FREE_LIMIT = 3;

const ALLOWED_TAGS = new Set([
  "added_sugar",
  "high_sodium",
  "refined_oils",
  "refined_carbs",
  "many_additives",
  "ultra_processed",
  "low_fiber",
  "low_protein",
  "sweeteners", // ✅ 新增（用于你的“不吃甜味剂”）
  "high_cholesterol", // ✅ 新增（用于少胆固醇）
  "simple_ingredients", // ✅ 新增（用于配料简单）
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
  const reason = String(a?.reason ?? "").trim().slice(0, 120);

  const price = (["$", "$$", "$$$"].includes(a?.price) ? a.price : "$$") as "$" | "$$" | "$$$";

  const sodium_mg =
    a?.sodium_mg === null ? null : Number.isFinite(Number(a?.sodium_mg)) ? clampInt(a.sodium_mg, 0, 5000) : undefined;

  const added_sugar_g =
    a?.added_sugar_g === null ? null : Number.isFinite(Number(a?.added_sugar_g)) ? clampNum(a.added_sugar_g, 0, 200) : undefined;

  const cholesterol_mg =
    a?.cholesterol_mg === null ? null : Number.isFinite(Number(a?.cholesterol_mg)) ? clampInt(a.cholesterol_mg, 0, 2000) : undefined;

  const ingredient_count =
    a?.ingredient_count === null ? null : Number.isFinite(Number(a?.ingredient_count)) ? clampInt(a.ingredient_count, 0, 200) : undefined;

  const has_sweeteners =
    typeof a?.has_sweeteners === "boolean" ? a.has_sweeteners : a?.has_sweeteners === null ? null : undefined;

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

  const analysis = String(raw?.analysis ?? "").trim().slice(0, 120);

  const risk_tags = Array.isArray(raw?.risk_tags)
    ? raw.risk_tags
        .map((t: any) => String(t).trim().toLowerCase())
        .filter((t: string) => ALLOWED_TAGS.has(t))
        .slice(0, 8)
    : [];

  const triggers = Array.isArray(raw?.triggers)
    ? raw.triggers.map((x: any) => String(x).trim().slice(0, 80)).filter(Boolean).slice(0, 3)
    : [];

  let alternatives: Alternative[] = [];
  if (verdict !== "good" && Array.isArray(raw?.alternatives)) {
    alternatives = raw.alternatives
      .slice(0, 3)
      .map(normalizeAlternative)
      .filter((a: Alternative) => a.name.length > 0);
  }

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

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 0) 读偏好（没有就默认）
    const { data: prefRow } = await supabase
      .from("user_preferences")
      .select("low_sodium, low_sugar, low_cholesterol, avoid_sweeteners, prefer_simple_ingredients")
      .eq("user_id", user.id)
      .maybeSingle();

    const prefs: Prefs = { ...DEFAULT_PREFS, ...(prefRow || {}) };

    // 1) 配额：读取 profiles.is_pro
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_pro")
      .eq("id", user.id)
      .single();

    const isPro = !!profile?.is_pro;

    // 2) 免费用户限流：count scans
    if (!isPro) {
      const { count, error: countError } = await supabase
        .from("scans")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (countError) throw new Error("Failed to check quota");
      if (count !== null && count >= FREE_LIMIT) {
        return NextResponse.json({ error: "Free limit reached", code: "LIMIT_REACHED" }, { status: 403 });
      }
    }

    // 3) 调 OpenAI（让模型输出可复核 meta + triggers）
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
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
  "analysis": string,          // max 15 words
  "triggers": string[],        // 1-3 short, verifiable bullets
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

analysis must be punchy, user-friendly, max 15 words.
triggers must be verifiable (numbers if visible): e.g. "Sodium 620mg/serving" or "Contains sucralose".

alternatives rule:
- If verdict is "good", alternatives must be []
- Otherwise provide 2-3 realistic cleaner alternatives (same category).
- For each alternative, fill meta fields when you can infer; otherwise set them to null (NOT omitted).`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this food label/product. Extract numbers if visible." },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        max_tokens: 650,
        temperature: 0.2,
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

    // 4) 写入 scans
    const { data: scanData, error: dbError } = await supabase
      .from("scans")
      .insert({
        user_id: user.id,
        image_url: "",
        product_name: aiResult.product_name,
        score: aiResult.score,
        verdict: aiResult.verdict,
        grade: aiResult.verdict === "good" ? "green" : "black", // 兼容旧字段
        analysis: aiResult.analysis,
        risk_tags: aiResult.risk_tags,
        triggers: aiResult.triggers, // ✅ 新字段：你需要在表里加 triggers jsonb
        alternatives: aiResult.alternatives, // ✅ alternatives 现在带 meta
      })
      .select("id, created_at, product_name, score, verdict, analysis, risk_tags, triggers, alternatives")
      .single();

    if (dbError) throw new Error(dbError.message);

    return NextResponse.json({
      id: scanData.id,
      scan: scanData,
    });
  } catch (error: any) {
    console.error("Analyze API Error:", error);
    return NextResponse.json({ error: error.message ?? "Server error" }, { status: 500 });
  }
}
