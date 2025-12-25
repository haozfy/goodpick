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

  // meta
  sodium_mg?: number | null;
  added_sugar_g?: number | null;
  cholesterol_mg?: number | null;
  ingredient_count?: number | null;
  has_sweeteners?: boolean | null;

  // optional debug/meta
  source?: "scan" | "off" | "fallback";
  barcode?: string;
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

function safeArray<T = any>(x: any): T[] {
  return Array.isArray(x) ? x : [];
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
  };
}

/** ---------- Preference filtering/sorting (keep your logic) ---------- */

function hardFilter(alts: Alt[], prefs: Prefs) {
  let out = [...alts];

  if (prefs.avoid_sweeteners) out = out.filter((a) => a.has_sweeteners !== true);

  if (prefs.low_sodium) out = out.filter((a) => a.sodium_mg == null || a.sodium_mg <= 450);

  if (prefs.low_sugar) out = out.filter((a) => a.added_sugar_g == null || a.added_sugar_g <= 6);

  if (prefs.low_cholesterol) out = out.filter((a) => a.cholesterol_mg == null || a.cholesterol_mg <= 60);

  if (prefs.prefer_simple_ingredients) out = out.filter((a) => a.ingredient_count == null || a.ingredient_count <= 12);

  if (out.length === 0) {
    // loosen gently but never violate avoid_sweeteners
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

  return s;
}

function fallbackRecs(verdict: Verdict): Alt[] {
  if (verdict === "avoid") {
    return [
      { name: "Plain Greek yogurt + fruit", reason: "Lower sugar, higher protein, fewer additives.", price: "$$", source: "fallback" },
      { name: "Unsalted nuts / nut butter", reason: "Better fats, more satiety, less processed.", price: "$$", source: "fallback" },
      { name: "Whole-food snack (banana / apple)", reason: "Natural ingredients, predictable impact.", price: "$", source: "fallback" },
    ];
  }
  return [
    { name: "Lower-sugar option (same category)", reason: "Same vibe, less sugar spike.", price: "$", source: "fallback" },
    { name: "Short ingredient list option", reason: "Fewer additives and flavorings.", price: "$$", source: "fallback" },
    { name: "Whole grain / higher fiber pick", reason: "More stable energy and fullness.", price: "$$", source: "fallback" },
  ];
}

/** ---------- OFF integration ---------- */

type OffRow = {
  barcode: string;
  name: string | null;
  brand: string | null;
  image_url: string | null;
  ingredients_text: string | null;
  nutriments: any | null;
  categories_tags: string[] | null;
  additives_tags: string[] | null;
  nova_group: number | null;
  nutriscore_grade: string | null;
};

function textIncludesAny(haystack: string, needles: string[]) {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n.toLowerCase()));
}

function detectSweeteners(ingredientsText?: string | null, additivesTags?: string[] | null) {
  const t = (ingredientsText || "").toLowerCase();

  // you can extend this list later
  const sweetenerKeywords = [
    "sucralose",
    "aspartame",
    "acesulfame",
    "acesulfame-k",
    "stevia",
    "erythritol",
    "xylitol",
    "maltitol",
    "sorbitol",
    "saccharin",
  ];

  const hasKw = sweetenerKeywords.some((k) => t.includes(k));
  const hasTag = (additivesTags || []).some((x) => String(x).includes("en:sweeteners"));
  return hasKw || hasTag;
}

function ingredientCount(ingredientsText?: string | null) {
  if (!ingredientsText) return null;
  const parts = ingredientsText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? Math.min(200, parts.length) : null;
}

// OFF nutriments are often in grams per 100g (sodium_100g in g). Convert to mg-ish.
function sodiumMgFromOff(nutriments: any) {
  const v = nutriments?.sodium_100g;
  if (v == null) return null;
  const g = Number(v);
  if (!Number.isFinite(g)) return null;
  return Math.round(g * 1000); // g -> mg
}

function sugarGFromOff(nutriments: any) {
  const v = nutriments?.sugars_100g;
  if (v == null) return null;
  const g = Number(v);
  if (!Number.isFinite(g)) return null;
  return Math.round(g * 10) / 10; // keep 0.1
}

// cholesterol_100g sometimes exists in g
function cholesterolMgFromOff(nutriments: any) {
  const v = nutriments?.cholesterol_100g;
  if (v == null) return null;
  const g = Number(v);
  if (!Number.isFinite(g)) return null;
  return Math.round(g * 1000);
}

function offRowToAlt(p: OffRow, prefs: Prefs, aisleTitle: string): Alt | null {
  const name = String(p.name || "").trim();
  if (!name) return null;

  const hasSweeteners = detectSweeteners(p.ingredients_text, p.additives_tags);
  const ingCount = ingredientCount(p.ingredients_text);

  const sodium_mg = sodiumMgFromOff(p.nutriments);
  const added_sugar_g = sugarGFromOff(p.nutriments);
  const cholesterol_mg = cholesterolMgFromOff(p.nutriments);

  // reason: keep it short + “same aisle”
  const reasons: string[] = [];
  reasons.push(`Same category: ${aisleTitle}.`);

  if (prefs.avoid_sweeteners && !hasSweeteners) reasons.push("No sweeteners flagged.");
  if (prefs.prefer_simple_ingredients && ingCount != null) reasons.push(`~${ingCount} ingredients.`);
  if (prefs.low_sugar && added_sugar_g != null) reasons.push(`Sugars ~${added_sugar_g}g/100g.`);
  if (prefs.low_sodium && sodium_mg != null) reasons.push(`Sodium ~${sodium_mg}mg/100g.`);

  // if too empty, generic
  if (reasons.length < 2) reasons.push("Cleaner pick within the same aisle.");

  return {
    name: p.brand ? `${p.brand} — ${name}`.slice(0, 80) : name.slice(0, 80),
    reason: reasons.join(" "),
    price: undefined,
    sodium_mg,
    added_sugar_g,
    cholesterol_mg,
    ingredient_count: ingCount,
    has_sweeteners: hasSweeteners,
    source: "off",
    barcode: p.barcode,
  };
}

/** Aisle: prefer scan.aisle_key, fallback to taxonomy + product_name keyword match */
async function getAisle(supabase: any, scan: any): Promise<{ aisle_key: string; title: string; off_tags: string[]; confidence: number }> {
  // 1) if scan has aisle_key, use it
  const sk = String(scan?.aisle_key || "").trim();
  if (sk) {
    const { data } = await supabase.from("aisle_taxonomy").select("aisle_key,title,off_tags").eq("aisle_key", sk).maybeSingle();
    if (data?.aisle_key) {
      return { aisle_key: data.aisle_key, title: data.title, off_tags: data.off_tags || [], confidence: Number(scan?.aisle_confidence ?? 0.85) };
    }
  }

  // 2) fallback: match product_name against keywords
  const name = String(scan?.product_name || "").toLowerCase();
  const { data: rows } = await supabase.from("aisle_taxonomy").select("aisle_key,title,off_tags,keywords");
  const list = Array.isArray(rows) ? rows : [];

  let best = list[0];
  let bestScore = 0;

  for (const r of list) {
    const kws = Array.isArray(r.keywords) ? r.keywords : [];
    const hit = kws.filter((k: string) => name.includes(String(k).toLowerCase())).length;
    if (hit > bestScore) {
      bestScore = hit;
      best = r;
    }
  }

  if (best?.aisle_key && bestScore > 0) {
    return { aisle_key: best.aisle_key, title: best.title, off_tags: best.off_tags || [], confidence: Math.min(0.8, 0.55 + bestScore * 0.1) };
  }

  // 3) final fallback: generic “cookies” if nothing else
  return { aisle_key: "cookies", title: "Cookies", off_tags: ["en:cookies", "en:biscuits"], confidence: 0.4 };
}

/** OFF search: use category tags from aisle_taxonomy (same-aisle constraint) */
async function offSearchSameAisle(offTags: string[], q: string, pageSize = 30) {
  // Pick the first tag as primary filter; it’s okay for MVP.
  const primary = offTags?.[0] || "";

  const params = new URLSearchParams({
    fields:
      "code,product_name,brands,image_front_url,ingredients_text,nutriments,categories_tags,additives_tags,nova_group,nutriscore_grade",
    page_size: String(pageSize),
  });

  // Use search_terms as a gentle hint; primary filter keeps it in aisle.
  if (q) params.set("search_terms", q);

  // OFF v2 supports tag filters via "categories_tags" in some setups; for compatibility,
  // we do a broad search and filter locally by categories_tags match.
  const url = `https://world.openfoodfacts.org/api/v2/search?${params.toString()}`;

  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("OFF search failed");
  const j = await r.json();

  const products = Array.isArray(j?.products) ? j.products : [];
  const filtered = products.filter((p: any) => {
    const cats = Array.isArray(p?.categories_tags) ? p.categories_tags : [];
    if (!primary) return true;
    return cats.includes(primary) || cats.some((x: string) => offTags.includes(x));
  });

  return filtered;
}

async function upsertOffProducts(supabase: any, products: any[]) {
  const rows = products
    .filter((p: any) => p?.code)
    .map((p: any) => ({
      barcode: String(p.code),
      name: p.product_name || null,
      brand: p.brands || null,
      image_url: p.image_front_url || null,
      ingredients_text: p.ingredients_text || null,
      nutriments: p.nutriments || null,
      categories_tags: Array.isArray(p.categories_tags) ? p.categories_tags : [],
      additives_tags: Array.isArray(p.additives_tags) ? p.additives_tags : [],
      nova_group: typeof p.nova_group === "number" ? p.nova_group : null,
      nutriscore_grade: p.nutriscore_grade || null,
      updated_at: new Date().toISOString(),
    }));

  if (!rows.length) return;
  await supabase.from("off_products").upsert(rows, { onConflict: "barcode" });
}

function makePrefsKey(prefs: Prefs) {
  return [
    prefs.low_sodium ? "ls" : "",
    prefs.low_sugar ? "lsg" : "",
    prefs.low_cholesterol ? "lc" : "",
    prefs.avoid_sweeteners ? "asw" : "",
    prefs.prefer_simple_ingredients ? "psi" : "",
  ]
    .filter(Boolean)
    .join("_");
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const scanId = searchParams.get("scanId") || searchParams.get("scan");
    if (!scanId) return NextResponse.json({ error: "Missing scanId" }, { status: 400 });

    // 1) scan
    const { data: scan, error: scanErr } = await supabase
      .from("scans")
      .select("id, user_id, product_name, analysis, alternatives, score, verdict, risk_tags, triggers, created_at, aisle_key, aisle_confidence")
      .eq("id", scanId)
      .eq("user_id", user.id)
      .single();

    if (scanErr || !scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

    // 2) prefs
    const { data: prefRow } = await supabase
      .from("user_preferences")
      .select("low_sodium, low_sugar, low_cholesterol, avoid_sweeteners, prefer_simple_ingredients")
      .eq("user_id", user.id)
      .maybeSingle();

    const prefs: Prefs = { ...DEFAULT_PREFS, ...(prefRow || {}) };
    const prefsKey = makePrefsKey(prefs);

    const verdict: Verdict = (scan.verdict as Verdict) || scoreToVerdict(scan.score);

    // ✅ good verdict -> no recs
    if (verdict === "good") {
      return NextResponse.json({
        scanId: scan.id,
        productName: scan.product_name || "Unknown",
        analysis: String(scan.analysis || "").trim(),
        score: typeof scan.score === "number" ? scan.score : null,
        verdict,
        alternatives: [],
        prefs,
        triggers: Array.isArray(scan.triggers) ? scan.triggers : [],
      });
    }

    // 3) cache hit?
    const { data: cached } = await supabase
      .from("recs_cache")
      .select("items, aisle_key, aisle_confidence, strategy")
      .eq("scan_id", scan.id)
      .eq("user_id", user.id)
      .eq("strategy", `same-aisle-cleaner:${prefsKey}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached?.items) {
      return NextResponse.json({
        scanId: scan.id,
        productName: scan.product_name || "Unknown",
        analysis: String(scan.analysis || "").trim(),
        score: typeof scan.score === "number" ? scan.score : null,
        verdict,
        alternatives: safeArray(cached.items),
        prefs,
        triggers: Array.isArray(scan.triggers) ? scan.triggers : [],
        aisle_key: cached.aisle_key,
        aisle_confidence: cached.aisle_confidence,
      });
    }

    // 4) start with scan.alternatives
    const rawAlts = safeArray(scan.alternatives);
    const scanAlts = rawAlts.map(normalizeAlt).filter(Boolean) as Alt[];
    const scanAltsTagged = scanAlts.map((a) => ({ ...a, source: "scan" as const }));

    // 5) decide aisle
    const aisle = await getAisle(supabase, scan);

    // 6) If scan alts not enough, fetch OFF same-aisle candidates
    let combined: Alt[] = [...scanAltsTagged];

    if (combined.length < 6) {
      // try local cache first (off_products)
      // simplest: filter by any aisle off_tags match
      const { data: localOff } = await supabase
        .from("off_products")
        .select("barcode,name,brand,image_url,ingredients_text,nutriments,categories_tags,additives_tags,nova_group,nutriscore_grade")
        .overlaps("categories_tags", aisle.off_tags)
        .limit(80);

      const localRows = Array.isArray(localOff) ? (localOff as OffRow[]) : [];
      const localAlts = localRows
        .map((p) => offRowToAlt(p, prefs, aisle.title))
        .filter(Boolean) as Alt[];

      combined = combined.concat(localAlts);

      // still not enough -> hit OFF
      if (combined.length < 12) {
        const q = String(scan.product_name || "").slice(0, 40);
        const offProducts = await offSearchSameAisle(aisle.off_tags, q, 40);
        await upsertOffProducts(supabase, offProducts);

        const offAlts = offProducts
          .map((p: any) =>
            offRowToAlt(
              {
                barcode: String(p.code),
                name: p.product_name || null,
                brand: p.brands || null,
                image_url: p.image_front_url || null,
                ingredients_text: p.ingredients_text || null,
                nutriments: p.nutriments || null,
                categories_tags: Array.isArray(p.categories_tags) ? p.categories_tags : [],
                additives_tags: Array.isArray(p.additives_tags) ? p.additives_tags : [],
                nova_group: typeof p.nova_group === "number" ? p.nova_group : null,
                nutriscore_grade: p.nutriscore_grade || null,
                ecoscore_grade: null,
              },
              prefs,
              aisle.title
            )
          )
          .filter(Boolean) as Alt[];

        combined = combined.concat(offAlts);
      }
    }

    // 7) De-dup by name
    const seen = new Set<string>();
    combined = combined.filter((a) => {
      const k = a.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // 8) Apply prefs and pick top 3
    let finalAlts = hardFilter(combined, prefs)
      .sort((a, b) => prefScore(a, prefs) - prefScore(b, prefs))
      .slice(0, 3);

    if (finalAlts.length === 0) finalAlts = fallbackRecs(verdict);

    // 9) analysis fallback
    const triggers = Array.isArray(scan.triggers) ? scan.triggers : [];
    const analysis =
      (scan.analysis && String(scan.analysis).trim()) ||
      (triggers.length ? String(triggers[0]) : "");

    // 10) write recs_cache (best effort)
    await supabase.from("recs_cache").insert({
      scan_id: scan.id,
      user_id: user.id,
      aisle_key: aisle.aisle_key,
      aisle_confidence: aisle.confidence,
      strategy: `same-aisle-cleaner:${prefsKey}`,
      items: finalAlts,
    });

    return NextResponse.json({
      scanId: scan.id,
      productName: scan.product_name || "Unknown",
      analysis,
      score: typeof scan.score === "number" ? scan.score : null,
      verdict,
      alternatives: finalAlts,
      prefs,
      triggers,
      aisle_key: aisle.aisle_key,
      aisle_confidence: aisle.confidence,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}