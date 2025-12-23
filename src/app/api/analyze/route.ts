// ✅ 建议强制 node runtime（需要 Buffer / arrayBuffer 更稳）
export const runtime = "nodejs";

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

// ✅ 免费次数（非 Pro）：统一 3 次
const TRIAL_LIMIT = 3;

// ✅ 未登录原图限制大小：建议 12MB（iPhone 照片一般 2–6MB，偶尔更大）
const ANON_MAX_IMAGE_BYTES = 12 * 1024 * 1024;

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

  return { name, reason, price, sodium_mg, added_sugar_g, cholesterol_mg, ingredient_count, has_sweeteners };
}

function normalizeAI(raw: any): AIResult {
  const product_name = String(raw?.product_name ?? "").trim() || "Unknown product";
  const score = clampInt(raw?.score, 0, 100);

  const vRaw = String(raw?.verdict ?? "").toLowerCase();
  const verdict: Verdict = vRaw === "good" || vRaw === "caution" || vRaw === "avoid" ? vRaw : verdictFromScore(score);

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
    alternatives = raw.alternatives.slice(0, 3).map(normalizeAlternative).filter((a: Alternative) => a.name.length > 0);
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

function genAnonId() {
  return crypto.randomUUID();
}

function getAnonIdFromCookie(cookieHeader: string) {
  const match = cookieHeader.match(/(?:^|;\s*)gp_anon=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function fileToDataUrl(buf: Buffer, mimeType?: string) {
  const mt = (mimeType || "").startsWith("image/") ? mimeType : "image/jpeg";
  return `data:${mt};base64,${buf.toString("base64")}`;
}

async function readJsonBody(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function withAnonCookie(
  res: NextResponse,
  shouldSetAnonCookie: boolean,
  anonId: string | null
) {
  if (!shouldSetAnonCookie || !anonId) return res;

  // ✅ 本地 http 不要 secure，否则 cookie 写不进去（导致 anonId 不稳定）
  const secure = process.env.NODE_ENV === "production";

  res.cookies.set("gp_anon", anonId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // ✅ anon cookie：用于统一免费计数（不管登录不登录）
    const cookieHeader = req.headers.get("cookie") || "";
    let anonId = getAnonIdFromCookie(cookieHeader);
    let shouldSetAnonCookie = false;
    if (!anonId) {
      anonId = genAnonId();
      shouldSetAnonCookie = true;
    }

    // ✅ 偏好：登录才读取
    let prefs: Prefs = { ...DEFAULT_PREFS };
    if (user) {
      const { data: prefRow } = await supabase
        .from("user_preferences")
        .select("low_sodium, low_sugar, low_cholesterol, avoid_sweeteners, prefer_simple_ingredients")
        .eq("user_id", user.id)
        .maybeSingle();
      prefs = { ...DEFAULT_PREFS, ...(prefRow || {}) };
    }

    // ✅ 是否 Pro：登录才读取
    let isPro = false;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_pro")
        .eq("id", user.id)
        .single();
      isPro = !!profile?.is_pro;
    }

    // ✅ 统一免费次数（非 Pro）：按 anon_scans 计数
    if (!isPro) {
      const { count, error: countError } = await supabase
        .from("anon_scans")
        .select("*", { count: "exact", head: true })
        .eq("anon_id", anonId);

      if (countError) throw new Error("Failed to check quota");

      if (count !== null && count >= TRIAL_LIMIT) {
        const res = NextResponse.json(
          { error: "Free limit reached", code: "LIMIT_REACHED" },
          { status: 403 }
        );
        return withAnonCookie(res, shouldSetAnonCookie, anonId);
      }
    }

    // =========================
    // ✅ 读取图片：按 Content-Type 自动识别（最稳）
    // - multipart/form-data：读 file（未登录原图）
    // - application/json：读 imageBase64（登录老方案）
    // =========================
    const contentType = req.headers.get("content-type") || "";
    let imageForOpenAI: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("image") as File | null;

      if (!file) {
        const res = NextResponse.json(
          { error: "No image file provided", code: "NO_IMAGE_FILE" },
          { status: 400 }
        );
        return withAnonCookie(res, shouldSetAnonCookie, anonId);
      }

      if (!user && file.size > ANON_MAX_IMAGE_BYTES) {
        const res = NextResponse.json(
          { error: "Image too large", code: "IMAGE_TOO_LARGE" },
          { status: 413 }
        );
        return withAnonCookie(res, shouldSetAnonCookie, anonId);
      }

      const buf = Buffer.from(await file.arrayBuffer());
      imageForOpenAI = fileToDataUrl(buf, file.type);
    } else if (contentType.includes("application/json")) {
      const body = await readJsonBody(req);
      const imageBase64 = body?.imageBase64;
      if (!imageBase64) {
        const res = NextResponse.json(
          { error: "No image provided", code: "NO_IMAGE_BASE64" },
          { status: 400 }
        );
        return withAnonCookie(res, shouldSetAnonCookie, anonId);
      }
      imageForOpenAI = String(imageBase64);
    } else {
      const res = NextResponse.json(
        { error: "Unsupported Content-Type", code: "UNSUPPORTED_CONTENT_TYPE", contentType },
        { status: 400 }
      );
      return withAnonCookie(res, shouldSetAnonCookie, anonId);
    }

    // =========================
    // ✅ OpenAI 调用（保持你原来的 chat/completions 结构）
    // =========================
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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

analysis must be punchy, user-friendly, max 15 words.
triggers must be verifiable (numbers if visible).

alternatives rule:
- If verdict is "good", alternatives must be []
- Otherwise provide 2-3 realistic cleaner alternatives (same category).
- Fill meta fields when you can infer; otherwise set them to null.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this food label/product. Extract numbers if visible." },
              { type: "image_url", image_url: { url: imageForOpenAI } },
            ],
          },
        ],
        max_tokens: 650,
        temperature: 0.2,
      }),
    });

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      const res = NextResponse.json({ error: "Invalid AI response" }, { status: 500 });
      return withAnonCookie(res, shouldSetAnonCookie, anonId);
    }

    let aiResult: AIResult;
    try {
      aiResult = normalizeAI(safeJsonParse(content));
    } catch {
      const res = NextResponse.json({ error: "AI failed to analyze" }, { status: 500 });
      return withAnonCookie(res, shouldSetAnonCookie, anonId);
    }

    // =========================
    // ✅ 写入：非 Pro 统一写 anon_scans（计数真源）
    // =========================
    if (!isPro) {
      const { error: anonErr } = await supabase.from("anon_scans").insert({
        anon_id: anonId,
        product_name: aiResult.product_name,
        score: aiResult.score,
        verdict: aiResult.verdict,
        analysis: aiResult.analysis,
        risk_tags: aiResult.risk_tags,
        triggers: aiResult.triggers,
        alternatives: aiResult.alternatives,
      });
      if (anonErr) throw new Error(anonErr.message);
    }

    // ✅ 登录用户：照旧写 scans（你的原逻辑）
    let saved: any = null;

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
        .select("id, created_at, product_name, score, verdict, analysis, risk_tags, triggers, alternatives")
        .single();

      if (dbError) throw new Error(dbError.message);
      saved = scanData;
    } else {
      saved = {
        id: null,
        created_at: new Date().toISOString(),
        product_name: aiResult.product_name,
        score: aiResult.score,
        verdict: aiResult.verdict,
        analysis: aiResult.analysis,
        risk_tags: aiResult.risk_tags,
        triggers: aiResult.triggers,
        alternatives: aiResult.alternatives,
      };
    }

    const res = NextResponse.json({
      id: saved?.id ? String(saved.id) : null,
      scan: saved,
    });

    return withAnonCookie(res, shouldSetAnonCookie, anonId);
  } catch (error: any) {
    console.error("Analyze API Error:", error);
    const res = NextResponse.json({ error: error.message ?? "Server error" }, { status: 500 });
    return res;
  }
}