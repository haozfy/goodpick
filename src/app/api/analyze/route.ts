import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Verdict = "good" | "caution" | "avoid";

type AIResult = {
  product_name: string;
  score: number; // 0-100
  verdict: Verdict; // good/caution/avoid
  risk_tags: string[]; // fixed set
  analysis: string; // max 15 words
  alternatives: { name: string; reason: string; price: "$" | "$$" | "$$$" }[];
};

const FREE_LIMIT = 3;

// 只允许这些 tag，避免模型乱输出污染 Insights
const ALLOWED_TAGS = new Set([
  "added_sugar",
  "high_sodium",
  "refined_oils",
  "refined_carbs",
  "many_additives",
  "ultra_processed",
  "low_fiber",
  "low_protein",
]);

function clampInt(n: any, min: number, max: number) {
  const x = Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : min;
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

function normalizeAI(raw: any): AIResult {
  const product_name = String(raw?.product_name ?? "").trim() || "Unknown product";
  const score = clampInt(raw?.score, 0, 100);

  const vRaw = String(raw?.verdict ?? "").toLowerCase();
  const verdict: Verdict =
    vRaw === "good" || vRaw === "caution" || vRaw === "avoid"
      ? vRaw
      : verdictFromScore(score);

  const analysis = String(raw?.analysis ?? "").trim().slice(0, 120);

  const risk_tags = Array.isArray(raw?.risk_tags)
    ? raw.risk_tags
        .map((t: any) => String(t).trim().toLowerCase())
        .filter((t: string) => ALLOWED_TAGS.has(t))
        .slice(0, 6)
    : [];

  let alternatives: AIResult["alternatives"] = [];
  if (verdict !== "good" && Array.isArray(raw?.alternatives)) {
    alternatives = raw.alternatives
      .slice(0, 3)
      .map((a: any) => ({
        name: String(a?.name ?? "").trim().slice(0, 80),
        reason: String(a?.reason ?? "").trim().slice(0, 80),
        price: (["$", "$$", "$$$"].includes(a?.price) ? a.price : "$$") as "$" | "$$" | "$$$",
      }))
      .filter((a: any) => a.name);
  }

  return { product_name, score, verdict, risk_tags, analysis, alternatives };
}

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    // 3) 调 OpenAI
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
  "analysis": string,
  "alternatives": [
    {"name": string, "reason": string, "price": "$" | "$$" | "$$$"}
  ]
}

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
["added_sugar","high_sodium","refined_oils","refined_carbs","many_additives","ultra_processed","low_fiber","low_protein"]

analysis must be punchy, user-friendly, max 15 words.

alternatives rule:
- If verdict is "good", alternatives must be []
- Otherwise provide 2-3 realistic cleaner alternatives (same category).`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this food label/product." },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        max_tokens: 500,
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

    // 4) 写入 scans（你原来的 grade 仍可保留，但我建议最终只用 verdict）
    const { data: scanData, error: dbError } = await supabase
      .from("scans")
      .insert({
        user_id: user.id,
        image_url: "",
        product_name: aiResult.product_name,
        score: aiResult.score,
        verdict: aiResult.verdict,
        grade: aiResult.verdict === "good" ? "green" : "black", // 兼容旧字段（可选）
        analysis: aiResult.analysis,
        risk_tags: aiResult.risk_tags,
        alternatives: aiResult.alternatives,
      })
      .select("id, created_at, product_name, score, verdict, analysis, risk_tags, alternatives")
      .single();

    if (dbError) throw new Error(dbError.message);

    // 5) 返回给前端：不仅 id，还返回结果（前端不用再查一次）
    return NextResponse.json({
      id: scanData.id,
      scan: scanData,
    });
  } catch (error: any) {
    console.error("Analyze API Error:", error);
    return NextResponse.json({ error: error.message ?? "Server error" }, { status: 500 });
  }
}
