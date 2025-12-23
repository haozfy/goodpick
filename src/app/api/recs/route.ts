import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Verdict = "good" | "caution" | "avoid";

type Prefs = {
  low_sodium: boolean;
  low_sugar: boolean;
  low_cholesterol: boolean;
  avoid_sweeteners: boolean;
  prefer_simple_ingredients: boolean;
};

type RecItem = {
  name: string;
  reason: string;
  price?: string;
  // ✅ 未来你可以逐步补这些字段（有就用，没有也不报错）
  sodium_mg?: number;
  added_sugar_g?: number;
  cholesterol_mg?: number;
  ingredient_count?: number;
  has_sweeteners?: boolean;
  has_processed_meat?: boolean;
};

const DEFAULT_PREFS: Prefs = {
  low_sodium: false,
  low_sugar: false,
  low_cholesterol: false,
  avoid_sweeteners: false,
  prefer_simple_ingredients: false,
};

function scoreToVerdict(score: number | null | undefined): Verdict {
  const s = typeof score === "number" ? score : 0;
  if (s >= 80) return "good";
  if (s >= 50) return "caution";
  return "avoid";
}

function normalizeAlternatives(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  if (raw?.items && Array.isArray(raw.items)) return raw.items;
  return [];
}

function sanitizeAlternatives(items: any[]): RecItem[] {
  return items
    .map((x) => {
      const name = String(x?.name || x?.title || x?.productName || "").trim();
      const reason = String(x?.reason || x?.why || x?.note || "").trim();
      const price = x?.price ? String(x.price) : undefined;

      // 可选 meta（没有也没关系）
      const sodium_mg = typeof x?.sodium_mg === "number" ? x.sodium_mg : undefined;
      const added_sugar_g = typeof x?.added_sugar_g === "number" ? x.added_sugar_g : undefined;
      const cholesterol_mg = typeof x?.cholesterol_mg === "number" ? x.cholesterol_mg : undefined;
      const ingredient_count = typeof x?.ingredient_count === "number" ? x.ingredient_count : undefined;
      const has_sweeteners = typeof x?.has_sweeteners === "boolean" ? x.has_sweeteners : undefined;

      return {
        name,
        reason,
        price,
        sodium_mg,
        added_sugar_g,
        cholesterol_mg,
        ingredient_count,
        has_sweeteners,
        has_processed_meat: typeof x?.has_processed_meat === "boolean" ? x.has_processed_meat : undefined,
      } as RecItem;
    })
    .filter((x) => x.name.length > 0 && x.reason.length > 0)
    .slice(0, 30);
}

function preferenceLabels(prefs: Prefs): string[] {
  const labels: string[] = [];
  if (prefs.low_sodium) labels.push("Low sodium");
  if (prefs.low_sugar) labels.push("Low sugar");
  if (prefs.low_cholesterol) labels.push("Low cholesterol");
  if (prefs.avoid_sweeteners) labels.push("No sweeteners");
  if (prefs.prefer_simple_ingredients) labels.push("Simple ingredients");
  return labels;
}

// ---------- 关键词启发（当没有 meta 时用） ----------
const SWEETENER_WORDS = [
  "sucralose",
  "aspartame",
  "acesulfame",
  "ace-k",
  "stevia",
  "monk fruit",
  "erythritol",
  "xylitol",
  "sorbitol",
  "maltitol",
  "sweetener",
];

const HIGH_SODIUM_WORDS = ["high sodium", "salty", "salt", "sodium"];
const HIGH_SUGAR_WORDS = ["high sugar", "added sugar", "sugary", "sweet"];
const CHOLESTEROL_WORDS = ["cholesterol", "egg", "yolk", "bacon", "sausage", "processed meat", "pork"];

function textHaystack(it: RecItem) {
  return `${it.name} ${it.reason}`.toLowerCase();
}

function likelyHasSweeteners(it: RecItem): boolean {
  if (typeof it.has_sweeteners === "boolean") return it.has_sweeteners;
  const h = textHaystack(it);
  return SWEETENER_WORDS.some((w) => h.includes(w));
}

// 这里的“likelyHighXXX”只用于排序/弱过滤（避免误杀）
function likelyHighSodium(it: RecItem): boolean {
  if (typeof it.sodium_mg === "number") return it.sodium_mg > 350; // 低盐阈值
  const h = textHaystack(it);
  return HIGH_SODIUM_WORDS.some((w) => h.includes(w));
}
function likelyHighSugar(it: RecItem): boolean {
  if (typeof it.added_sugar_g === "number") return it.added_sugar_g > 6;
  const h = textHaystack(it);
  return HIGH_SUGAR_WORDS.some((w) => h.includes(w));
}
function likelyHighCholesterol(it: RecItem): boolean {
  if (typeof it.cholesterol_mg === "number") return it.cholesterol_mg > 100;
  const h = textHaystack(it);
  return CHOLESTEROL_WORDS.some((w) => h.includes(w));
}

function preferencePenalty(it: RecItem, prefs: Prefs): number {
  let p = 0;

  // 1) 不吃甜味剂：强偏好 -> 高惩罚
  if (prefs.avoid_sweeteners && likelyHasSweeteners(it)) p += 1000;

  // 2) 少盐 / 少糖 / 少胆固醇：中等惩罚（用于排序 + 可选过滤）
  if (prefs.low_sodium && likelyHighSodium(it)) p += 80;
  if (prefs.low_sugar && likelyHighSugar(it)) p += 80;
  if (prefs.low_cholesterol && likelyHighCholesterol(it)) p += 50;

  // 3) 配料简单：有 ingredient_count 就按数值惩罚
  if (prefs.prefer_simple_ingredients) {
    if (typeof it.ingredient_count === "number") {
      if (it.ingredient_count > 12) p += 25;
      else if (it.ingredient_count > 8) p += 10;
    } else {
      // 没 meta 的时候不乱罚，避免误伤
      p += 0;
    }
  }

  return p;
}

function applyPreferences(items: RecItem[], prefs: Prefs): RecItem[] {
  // 强过滤：不吃甜味剂 -> 直接过滤掉“明确含甜味剂”的项
  let filtered = items;
  if (prefs.avoid_sweeteners) {
    filtered = filtered.filter((it) => !likelyHasSweeteners(it));
  }

  // 少盐/少糖/少胆固醇：默认不“硬过滤”（避免误杀），只排序
  // 如果你未来给 alternatives 补齐 meta，可以打开硬过滤（见下方注释）
  // if (prefs.low_sodium) filtered = filtered.filter(it => typeof it.sodium_mg !== "number" || it.sodium_mg <= 350);

  // 排序：惩罚越低越靠前；同惩罚情况下“更具体的理由”靠前（简单启发）
  const scored = filtered.map((it) => {
    const penalty = preferencePenalty(it, prefs);
    const reasonRichness = (it.reason || "").length; // 越长信息越多，暂作为次级排序
    return { it, penalty, reasonRichness };
  });

  scored.sort((a, b) => {
    if (a.penalty !== b.penalty) return a.penalty - b.penalty;
    return b.reasonRichness - a.reasonRichness;
  });

  return scored.map((x) => x.it);
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const scanId = searchParams.get("scanId") || searchParams.get("scan");
    if (!scanId) return NextResponse.json({ error: "Missing scanId" }, { status: 400 });

    // 1) 取 scan
    const { data: scan, error } = await supabase
      .from("scans")
      .select("id, product_name, analysis, alternatives, score, grade, created_at")
      .eq("id", scanId)
      .eq("user_id", user.id)
      .single();

    if (error || !scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

    const verdict = scoreToVerdict(scan.score);

    // 2) 取 preferences（没有就默认）
    const { data: prefRow } = await supabase
      .from("user_preferences")
      .select("low_sodium, low_sugar, low_cholesterol, avoid_sweeteners, prefer_simple_ingredients")
      .eq("user_id", user.id)
      .maybeSingle();

    const prefs: Prefs = { ...DEFAULT_PREFS, ...(prefRow || {}) };

    // 3) alternatives 解析 + sanitize
    const rawItems = normalizeAlternatives(scan.alternatives);
    const cleanItems = sanitizeAlternatives(rawItems);

    // 4) 应用偏好：过滤/排序
    const personalized = applyPreferences(cleanItems, prefs);

    return NextResponse.json({
      scanId: scan.id,
      productName: scan.product_name || "Unknown",
      analysis: scan.analysis || "",
      score: typeof scan.score === "number" ? scan.score : null,
      verdict,
      alternatives: personalized,
      preferences: preferenceLabels(prefs), // ✅ 前端可显示 “Personalized for: …”
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
