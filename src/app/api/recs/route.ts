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

  // meta (optional)
  sodium_mg?: number | null;
  added_sugar_g?: number | null;
  cholesterol_mg?: number | null;
  ingredient_count?: number | null;
  has_sweeteners?: boolean | null;

  // optional (future)
  source?: "ai" | "off";
};

const DEFAULT_PREFS: Prefs = {
  low_sodium: false,
  low_sugar: false,
  low_cholesterol: false,
  avoid_sweeteners: false,
  prefer_simple_ingredients: false,
};

/** =========================
 *  ✅ OFF integration switch
 *  - Keep OFF OFF by default for stability
 *  ========================= */
const ENABLE_OFF = false;

// (If you later enable OFF)
const AISLE_TO_OFF_TAGS: Record<string, string[]> = {
  instant_noodles: ["en:instant-noodles", "en:noodles"],
  chocolate: ["en:chocolates", "en:chocolate-bars"],
  cookies: ["en:cookies", "en:biscuits"],
  chips: ["en:crisps", "en:chips"],
  soda: ["en:sodas", "en:carbonated-drinks"],
  cereal: ["en:breakfast-cereals"],
  protein_bar: ["en:protein-bars"],
  yogurt: ["en:yogurts"],
  ice_cream: ["en:ice-creams"],
  bread: ["en:breads"],
  sauce: ["en:sauces"],
  juice: ["en:fruit-juices"],
  snack: ["en:snacks"],
};

const OFF_TTL_DAYS = 7;
const OFF_MIN_CONFIDENCE = 0.6;
const OFF_FETCH_TIMEOUT_MS = 1500;
const MIN_ALTS_BEFORE_OFF = 5;

/** =========================
 *  helpers
 *  ========================= */
function scoreToVerdict(score: number | null | undefined): Verdict {
  const s = typeof score === "number" ? score : 0;
  if (s >= 80) return "good";
  if (s >= 50) return "caution";
  return "avoid";
}

function isPrice(x: unknown): x is Price {
  return x === "$" || x === "$$" || x === "$$$";
}

function clampNum(x: unknown, min: number, max: number) {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

function safeArray<T>(x: unknown): T[] {
  return Array.isArray(x) ? (x as T[]) : [];
}

function normalizeAlt(raw: any): Alt | null {
  const name = String(raw?.name ?? "").trim().slice(0, 80);
  if (!name) return null;

  const reason = String(raw?.reason ?? "").trim().slice(0, 140);
  const price = isPrice(raw?.price) ? raw.price : undefined;

  const sodium_mg = raw?.sodium_mg === null ? null : clampNum(raw?.sodium_mg, 0, 5000);
  const added_sugar_g = raw?.added_sugar_g === null ? null : clampNum(raw?.added_sugar_g, 0, 200);
  const cholesterol_mg = raw?.cholesterol_mg === null ? null : clampNum(raw?.cholesterol_mg, 0, 2000);
  const ingredient_count = raw?.ingredient_count === null ? null : clampNum(raw?.ingredient_count, 0, 200);

  const has_sweeteners =
    typeof raw?.has_sweeteners === "boolean"
      ? raw.has_sweeteners
      : raw?.has_sweeteners === null
      ? null
      : null;

  return {
    name,
    reason,
    price,
    sodium_mg,
    added_sugar_g,
    cholesterol_mg,
    ingredient_count,
    has_sweeteners,
    source: "ai",
  };
}

function hardFilter(alts: Alt[], prefs: Prefs) {
  let out = [...alts];

  if (prefs.avoid_sweeteners) out = out.filter((a) => a.has_sweeteners !== true);
  if (prefs.low_sodium) out = out.filter((a) => a.sodium_mg == null || a.sodium_mg <= 450);
  if (prefs.low_sugar) out = out.filter((a) => a.added_sugar_g == null || a.added_sugar_g <= 6);
  if (prefs.low_cholesterol) out = out.filter((a) => a.cholesterol_mg == null || a.cholesterol_mg <= 60);
  if (prefs.prefer_simple_ingredients) out = out.filter((a) => a.ingredient_count == null || a.ingredient_count <= 12);

  if (out.length === 0) {
    out = [...alts].filter((a) => (prefs.avoid_sweeteners ? a.has_sweeteners !== true : true));
    if (out.length === 0) out = [...alts];
  }
  return out;
}

function prefScore(a: Alt, prefs: Prefs) {
  let s = 0;

  if (prefs.low_sodium) s += a.sodium_mg == null ? 3 : a.sodium_mg <= 250 ? 0 : a.sodium_mg <= 450 ? 1 : 4;
  if (prefs.low_sugar) s += a.added_sugar_g == null ? 3 : a.added_sugar_g <= 2 ? 0 : a.added_sugar_g <= 6 ? 1 : 4;
  if (prefs.low_cholesterol) s += a.cholesterol_mg == null ? 2 : a.cholesterol_mg <= 20 ? 0 : a.cholesterol_mg <= 60 ? 1 : 3;
  if (prefs.prefer_simple_ingredients) s += a.ingredient_count == null ? 2 : a.ingredient_count <= 8 ? 0 : a.ingredient_count <= 12 ? 1 : 3;
  if (prefs.avoid_sweeteners) s += a.has_sweeteners == null ? 1 : a.has_sweeteners ? 6 : 0;

  // tie-break: slightly prefer OFF if exists
  if (a.source === "off") s -= 0.1;

  return s;
}

function fallbackRecs(verdict: Verdict): Alt[] {
  if (verdict === "avoid") {
    return [
      { name: "Plain Greek yogurt + fruit", reason: "Lower sugar, higher protein, fewer additives.", price: "$$", source: "ai" },
      { name: "Unsalted nuts / nut butter", reason: "Better fats, more satiety, less processed.", price: "$$", source: "ai" },
      { name: "Whole-food snack (banana / apple)", reason: "Natural ingredients, predictable impact.", price: "$", source: "ai" },
    ];
  }
  return [
    { name: "Lower-sugar option (same category)", reason: "Same vibe, less sugar spike.", price: "$", source: "ai" },
    { name: "Short ingredient list option", reason: "Fewer additives and flavorings.", price: "$$", source: "ai" },
    { name: "Whole grain / higher fiber pick", reason: "More stable energy and fullness.", price: "$$", source: "ai" },
  ];
}

/** =========================
 *  OFF (optional, disabled by default)
 *  ========================= */
async function fetchWithTimeout(url: string, ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { cache: "no-store", signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function fetchOFFCandidatesExternal(aisle: string, limitPerTag = 12) {
  const tags = AISLE_TO_OFF_TAGS[aisle];
  if (!tags || tags.length === 0) return [];

  const urls = tags.map(
    (tag) =>
      `https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&json=1` +
      `&page_size=${limitPerTag}` +
      `&categories_tags=${encodeURIComponent(tag)}` +
      `&fields=id,code,product_name,nutriments,ingredients_text,additives_tags,nova_group`
  );

  const settled = await Promise.allSettled(
    urls.map(async (u) => {
      const res = await fetchWithTimeout(u, OFF_FETCH_TIMEOUT_MS);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data?.products) ? data.products : [];
    })
  );

  const all: any[] = [];
  for (const s of settled) if (s.status === "fulfilled") all.push(...s.value);

  // dedupe by code/id
  const seen = new Set<string>();
  const out: any[] = [];
  for (const p of all) {
    const k = String(p?.code ?? p?.id ?? "").trim();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

function offToAlt(p: any): Alt | null {
  const name = String(p?.product_name ?? "").trim();
  if (!name) return null;

  const nutr = p?.nutriments || {};
  const additives = Array.isArray(p?.additives_tags) ? p.additives_tags : [];
  const ingredientsText = typeof p?.ingredients_text === "string" ? p.ingredients_text : "";

  const ingredient_count = ingredientsText
    ? ingredientsText
        .split(",")
        .map((x: string) => x.trim())
        .filter((x: string) => x.length > 0)
        .length
    : null;

  const has_sweeteners =
    additives.some((t: unknown) => String(t).toLowerCase().includes("sweetener")) ||
    /sucralose|aspartame|acesulfame|stevia|erythritol|xylitol|sorbitol/i.test(ingredientsText);

  return {
    name: name.slice(0, 80),
    reason: "Cleaner option from same category (OFF).",
    price: "$$",
    sodium_mg: nutr.sodium_100g != null ? Math.round(Number(nutr.sodium_100g) * 1000) : null,
    added_sugar_g: nutr.sugars_100g != null ? Number(nutr.sugars_100g) : null,
    cholesterol_mg: nutr.cholesterol_100g != null ? Math.round(Number(nutr.cholesterol_100g) * 100) : null,
    ingredient_count,
    has_sweeteners,
    source: "off",
  };
}

async function readOFFCache(supabase: any, aisle: string, take = 30) {
  try {
    const { data, error } = await supabase
      .from("off_products")
      .select("off_id, aisle_key, product_name, ingredients_text, nutriments, additives_tags, updated_at")
      .eq("aisle_key", aisle)
      .order("updated_at", { ascending: false })
      .limit(take);

    if (error) return [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function isCacheFresh(rows: any[]) {
  if (!rows || rows.length === 0) return false;
  const newest = rows[0]?.updated_at ? new Date(rows[0].updated_at).getTime() : 0;
  if (!newest) return false;
  const ttlMs = OFF_TTL_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - newest < ttlMs;
}

async function upsertOFFCache(supabase: any, aisle: string, products: any[]) {
  try {
    if (!products || products.length === 0) return;

    const rows = products
      .map((p: any) => {
        const off_id = String(p?.id ?? p?.code ?? "").trim();
        if (!off_id) return null;

        const product_name = String(p?.product_name ?? "").trim().slice(0, 160);
        const ingredients_text = typeof p?.ingredients_text === "string" ? p.ingredients_text.slice(0, 2000) : null;

        return {
          off_id,
          aisle_key: aisle,
          product_name: product_name || null,
          ingredients_text,
          nutriments: p?.nutriments ?? null,
          additives_tags: Array.isArray(p?.additives_tags) ? p.additives_tags : null,
          updated_at: new Date().toISOString(),
        };
      })
      .filter(Boolean) as any[];

    if (rows.length === 0) return;

    const { error } = await supabase.from("off_products").upsert(rows, { onConflict: "off_id" });
    if (error) console.warn("OFF_CACHE_UPSERT_ERROR:", error.message);
  } catch (e: any) {
    console.warn("OFF_CACHE_UPSERT_FATAL:", e?.message ?? e);
  }
}

// ---------- scans read ----------
async function readScan(supabase: any, scanId: string, userId: string) {
  const { data, error } = await supabase
    .from("scans")
    .select("id, product_name, analysis, alternatives, score, verdict, risk_tags, triggers, aisle_key, aisle_confidence, created_at")
    .eq("id", scanId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!error) return { data, error };

  // old schema fallback (no aisle columns)
  return await supabase
    .from("scans")
    .select("id, product_name, analysis, alternatives, score, verdict, risk_tags, triggers, created_at")
    .eq("id", scanId)
    .eq("user_id", userId)
    .maybeSingle();
}

/** =========================
 *  Handler
 *  ========================= */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const scanId = searchParams.get("scanId") || searchParams.get("scan");
    if (!scanId) return NextResponse.json({ error: "Missing scanId" }, { status: 400 });

    // 1) scan
    const { data: scan, error: scanErr } = await readScan(supabase, scanId, user.id);
    if (scanErr || !scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

    // 2) prefs
    const { data: prefRow } = await supabase
      .from("user_preferences")
      .select("low_sodium, low_sugar, low_cholesterol, avoid_sweeteners, prefer_simple_ingredients")
      .eq("user_id", user.id)
      .maybeSingle();

    const prefs: Prefs = { ...DEFAULT_PREFS, ...(prefRow || {}) };

    // 3) verdict (兜底)
    const score = typeof (scan as any)?.score === "number" ? (scan as any).score : null;
    const verdict: Verdict = ((scan as any)?.verdict as Verdict) || scoreToVerdict(score);

    // 4) normalize AI alts
    const rawAlts = safeArray<any>((scan as any)?.alternatives);
    let alts: Alt[] = rawAlts.map(normalizeAlt).filter(Boolean) as Alt[];

    // 5) optional OFF expand (disabled by default)
    let offMode: "disabled" | "cache" | "external" = "disabled";
    const aisle = typeof (scan as any)?.aisle_key === "string" ? (scan as any).aisle_key : "unknown";
    const conf = typeof (scan as any)?.aisle_confidence === "number" ? (scan as any).aisle_confidence : 0;

    if (
      ENABLE_OFF &&
      verdict !== "good" &&
      alts.length < MIN_ALTS_BEFORE_OFF &&
      aisle !== "unknown" &&
      !!AISLE_TO_OFF_TAGS[aisle]?.length &&
      conf >= OFF_MIN_CONFIDENCE
    ) {
      const cacheRows = await readOFFCache(supabase, aisle, 30);
      const cacheFresh = isCacheFresh(cacheRows);

      if (cacheRows.length > 0) {
        const cacheAlts = cacheRows
          .map((r: any) =>
            offToAlt({
              product_name: r.product_name,
              nutriments: r.nutriments,
              ingredients_text: r.ingredients_text,
              additives_tags: r.additives_tags,
            })
          )
          .filter(Boolean) as Alt[];

        const seen = new Set(alts.map((a) => a.name.toLowerCase()));
        for (const a of cacheAlts) {
          const k = a.name.toLowerCase();
          if (!seen.has(k)) {
            alts.push(a);
            seen.add(k);
          }
        }
        offMode = "cache";
      }

      const needRefresh = !cacheFresh || cacheRows.length < 12;
      if (needRefresh) {
        const external = await fetchOFFCandidatesExternal(aisle, 12);
        if (external.length > 0) {
          await upsertOFFCache(supabase, aisle, external);
          const extAlts = external.map(offToAlt).filter(Boolean) as Alt[];

          const seen = new Set(alts.map((a) => a.name.toLowerCase()));
          for (const a of extAlts) {
            const k = a.name.toLowerCase();
            if (!seen.has(k)) {
              alts.push(a);
              seen.add(k);
            }
          }
          offMode = "external";
        }
      }
    }

    // 6) final alts
    let finalAlts: Alt[] = [];
    if (verdict === "good") {
      finalAlts = [];
    } else {
      const filtered = hardFilter(alts, prefs);
      finalAlts = filtered
        .sort((a, b) => prefScore(a, prefs) - prefScore(b, prefs))
        .slice(0, 3);

      if (finalAlts.length === 0) finalAlts = fallbackRecs(verdict);
    }

    // 7) analysis (旧版逻辑)
    const triggers = safeArray<any>((scan as any)?.triggers);
    const analysis =
      ((scan as any)?.analysis && String((scan as any)?.analysis).trim()) ||
      (triggers.length ? String(triggers[0]) : "");

    return NextResponse.json({
      scanId: (scan as any).id,
      productName: (scan as any).product_name || "Unknown",
      analysis,
      score,
      verdict,
      alternatives: finalAlts,
      prefs,
      triggers,
      // keep for future UI (safe to ignore)
      aisle,
      aisle_confidence: conf,
      debug: {
        off_mode: offMode,
        off_enabled: ENABLE_OFF,
      },
    });
  } catch (e: any) {
    console.error("RECS_FATAL:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}