// src/app/api/recs/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Verdict = "good" | "caution" | "avoid";
type Price = "$" | "$$" | "$$$";

type Prefs = {
  low_sodium: boolean;
  low_sugar: boolean;
  low_cholesterol: boolean;
  avoid_sweeteners: boolean;
  prefer_simple_ingredients: boolean;
};

type Alt = {
  name: string;
  reason: string;
  price?: Price;

  // meta (may exist if you upgraded analyze)
  sodium_mg?: number | null;
  added_sugar_g?: number | null;
  cholesterol_mg?: number | null;
  ingredient_count?: number | null;
  has_sweeteners?: boolean | null;
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

function isPrice(x: any): x is Price {
  return x === "$" || x === "$$" || x === "$$$";
}

function clampNum(x: any, min: number, max: number) {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

function normalizeAlt(raw: any): Alt | null {
  const name = String(raw?.name ?? "").trim().slice(0, 80);
  if (!name) return null;

  const reason = String(raw?.reason ?? "").trim().slice(0, 140);
  const price = isPrice(raw?.price) ? raw.price : undefined;

  // allow null / undefined
  const sodium_mg = raw?.sodium_mg === null ? null : clampNum(raw?.sodium_mg, 0, 5000);
  const added_sugar_g = raw?.added_sugar_g === null ? null : clampNum(raw?.added_sugar_g, 0, 200);
  const cholesterol_mg = raw?.cholesterol_mg === null ? null : clampNum(raw?.cholesterol_mg, 0, 2000);
  const ingredient_count = raw?.ingredient_count === null ? null : clampNum(raw?.ingredient_count, 0, 200);
  const has_sweeteners =
    typeof raw?.has_sweeteners === "boolean" ? raw.has_sweeteners : raw?.has_sweeteners === null ? null : null;

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

function safeArray<T = any>(x: any): T[] {
  return Array.isArray(x) ? x : [];
}

// ✅ If meta exists, use it. If not, fall back to risk_tags heuristics.
function hardFilter(alts: Alt[], prefs: Prefs, riskTags: string[]) {
  let out = [...alts];

  // 1) avoid sweeteners (your hard rule)
  if (prefs.avoid_sweeteners) {
    out = out.filter((a) => a.has_sweeteners !== true);
  }

  // 2) low sodium
  if (prefs.low_sodium) {
    // If sodium known, keep those <= 450mg, else keep (unknown) but deprioritize later
    out = out.filter((a) => a.sodium_mg === null || a.sodium_mg === undefined || a.sodium_mg <= 450);
  }

  // 3) low sugar
  if (prefs.low_sugar) {
    // If added sugar known, keep <= 6g; unknown passes but deprioritize later
    out = out.filter((a) => a.added_sugar_g === null || a.added_sugar_g === undefined || a.added_sugar_g <= 6);
  }

  // 4) low cholesterol (only acts when cholesterol meta exists)
  if (prefs.low_cholesterol) {
    out = out.filter((a) => a.cholesterol_mg === null || a.cholesterol_mg === undefined || a.cholesterol_mg <= 60);
  }

  // 5) prefer simple ingredients
  if (prefs.prefer_simple_ingredients) {
    out = out.filter(
      (a) => a.ingredient_count === null || a.ingredient_count === undefined || a.ingredient_count <= 12
    );
  }

  // If filters remove everything, loosen gently (never violate avoid_sweeteners)
  if (out.length === 0) {
    out = [...alts].filter((a) => (prefs.avoid_sweeteners ? a.has_sweeteners !== true : true));

    // still empty? return original alts
    if (out.length === 0) out = [...alts];
  }

  return out;
}

// Sort to match preferences: known good meta first, unknown later.
function prefScore(a: Alt, prefs: Prefs) {
  let s = 0;

  // lower is better for these; unknown = small penalty
  if (prefs.low_sodium) {
    s += a.sodium_mg == null ? 3 : a.sodium_mg <= 250 ? 0 : a.sodium_mg <= 450 ? 1 : 4;
  }
  if (prefs.low_sugar) {
    s += a.added_sugar_g == null ? 3 : a.added_sugar_g <= 2 ? 0 : a.added_sugar_g <= 6 ? 1 : 4;
  }
  if (prefs.low_cholesterol) {
    s += a.cholesterol_mg == null ? 2 : a.cholesterol_mg <= 20 ? 0 : a.cholesterol_mg <= 60 ? 1 : 3;
  }
  if (prefs.prefer_simple_ingredients) {
    s += a.ingredient_count == null ? 2 : a.ingredient_count <= 8 ? 0 : a.ingredient_count <= 12 ? 1 : 3;
  }
  if (prefs.avoid_sweeteners) {
    s += a.has_sweeteners == null ? 1 : a.has_sweeteners ? 6 : 0;
  }

  return s;
}

function fallbackRecs(verdict: Verdict): Alt[] {
  if (verdict === "avoid") {
    return [
      { name: "Plain Greek yogurt + fruit", reason: "Lower sugar, higher protein, fewer additives.", price: "$$" },
      { name: "Unsalted nuts / nut butter", reason: "Better fats, more satiety, less processed.", price: "$$" },
      { name: "Whole-food snack (banana / apple)", reason: "Natural ingredients, predictable impact.", price: "$" },
    ];
  }
  return [
    { name: "Lower-sugar option (same category)", reason: "Same vibe, less sugar spike.", price: "$" },
    { name: "Short ingredient list option", reason: "Fewer additives and flavorings.", price: "$$" },
    { name: "Whole grain / higher fiber pick", reason: "More stable energy and fullness.", price: "$$" },
  ];
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const scanId = searchParams.get("scanId") || searchParams.get("scan");
    if (!scanId) return NextResponse.json({ error: "Missing scanId" }, { status: 400 });

    // 1) read scan
    const { data: scan, error: scanErr } = await supabase
      .from("scans")
      .select("id, product_name, analysis, alternatives, score, verdict, risk_tags, triggers, created_at")
      .eq("id", scanId)
      .eq("user_id", user.id)
      .single();

    if (scanErr || !scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

    // 2) read user prefs (optional table)
    const { data: prefRow } = await supabase
      .from("user_preferences")
      .select("low_sodium, low_sugar, low_cholesterol, avoid_sweeteners, prefer_simple_ingredients")
      .eq("user_id", user.id)
      .maybeSingle();

    const prefs: Prefs = { ...DEFAULT_PREFS, ...(prefRow || {}) };

    const verdict: Verdict =
      (scan.verdict as Verdict) || scoreToVerdict(scan.score);

    const rawAlts = safeArray(scan.alternatives);
    const alts = rawAlts.map(normalizeAlt).filter(Boolean) as Alt[];

    const riskTags = Array.isArray(scan.risk_tags) ? scan.risk_tags.map((x: any) => String(x)) : [];

    // 3) apply preferences to alternatives
    let finalAlts: Alt[] = [];
    if (verdict === "good") {
      finalAlts = [];
    } else {
      const filtered = hardFilter(alts, prefs, riskTags);
      finalAlts = filtered
        .sort((a, b) => prefScore(a, prefs) - prefScore(b, prefs))
        .slice(0, 3);

      if (finalAlts.length === 0) finalAlts = fallbackRecs(verdict);
    }

    // ✅ If scan.analysis empty, compose from triggers (if you store them)
    const triggers = Array.isArray(scan.triggers) ? scan.triggers : [];
    const analysis =
      (scan.analysis && String(scan.analysis).trim()) ||
      (triggers.length ? String(triggers[0]) : "");

    return NextResponse.json({
      scanId: scan.id,
      productName: scan.product_name || "Unknown",
      analysis,
      score: typeof scan.score === "number" ? scan.score : null,
      verdict,
      alternatives: finalAlts,
      // keep for future UI upgrades (safe to ignore in current client)
      prefs,
      triggers,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
