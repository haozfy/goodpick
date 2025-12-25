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
  sodium_mg?: number | null;
  added_sugar_g?: number | null;
  cholesterol_mg?: number | null;
  ingredient_count?: number | null;
  has_sweeteners?: boolean | null;
  source?: "ai" | "off";
};

const DEFAULT_PREFS: Prefs = {
  low_sodium: false,
  low_sugar: false,
  low_cholesterol: false,
  avoid_sweeteners: false,
  prefer_simple_ingredients: false,
};

// ✅ OFF 只在 aisle 明确时启用
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

// 控制 OFF 外部请求上限：避免拖慢 API
const OFF_FETCH_TIMEOUT_MS = 1800;
const OFF_MAX_TOTAL_PRODUCTS = 24; // 外部拉取后最多用多少条做候选
const MIN_ALTS_BEFORE_OFF = 5;

// ---------- basic helpers ----------
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

function normalizeAlt(raw: any, source: "ai" | "off" = "ai"): Alt | null {
  const name = String(raw?.name ?? raw?.product_name ?? "").trim().slice(0, 80);
  if (!name) return null;

  return {
    name,
    reason: String(raw?.reason ?? "Cleaner option from same category.").trim().slice(0, 140),
    price: isPrice(raw?.price) ? raw.price : undefined,
    sodium_mg: raw?.sodium_mg === null ? null : clampNum(raw?.sodium_mg, 0, 5000),
    added_sugar_g: raw?.added_sugar_g === null ? null : clampNum(raw?.added_sugar_g, 0, 200),
    cholesterol_mg: raw?.cholesterol_mg === null ? null : clampNum(raw?.cholesterol_mg, 0, 2000),
    ingredient_count: raw?.ingredient_count === null ? null : clampNum(raw?.ingredient_count, 0, 200),
    has_sweeteners:
      typeof raw?.has_sweeteners === "boolean"
        ? raw.has_sweeteners
        : raw?.has_sweeteners === null
        ? null
        : null,
    source,
  };
}

// ✅ If meta exists, use it. (riskTags 这里先保留参数位，未来可扩展)
function hardFilter(alts: Alt[], prefs: Prefs) {
  let out = [...alts];

  if (prefs.avoid_sweeteners) out = out.filter((a) => a.has_sweeteners !== true);
  if (prefs.low_sodium) out = out.filter((a) => a.sodium_mg == null || a.sodium_mg <= 450);
  if (prefs.low_sugar) out = out.filter((a) => a.added_sugar_g == null || a.added_sugar_g <= 6);
  if (prefs.low_cholesterol) out = out.filter((a) => a.cholesterol_mg == null || a.cholesterol_mg <= 60);
  if (prefs.prefer_simple_ingredients) out = out.filter((a) => a.ingredient_count == null || a.ingredient_count <= 12);

  // 如果全被过滤掉：放松（但绝不违反 avoid_sweeteners）
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

  // 同分轻微偏好 OFF
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

function sameAisleFallback(aisle: string): Alt[] {
  switch (aisle) {
    case "chocolate":
      return [{ name: "70% dark chocolate", reason: "Lower sugar, higher cocoa.", price: "$$", source: "ai" }];
    case "cookies":
      return [{ name: "Oat cookies (short ingredient list)", reason: "Same vibe, fewer additives.", price: "$$", source: "ai" }];
    default:
      return [{ name: "Cleaner option (same category)", reason: "Same category, simpler ingredients.", price: "$$", source: "ai" }];
  }
}

// ---------- OFF external (with timeout + parallel) ----------
async function fetchWithTimeout(url: string, ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
    return res;
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
  for (const s of settled) {
    if (s.status === "fulfilled") all.push(...s.value);
  }

  // 去重（按 code/id）
  const seen = new Set<string>();
  const out: any[] = [];
  for (const p of all) {
    const k = String(p?.code ?? p?.id ?? "").trim();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }

  return out.slice(0, OFF_MAX_TOTAL_PRODUCTS);
}

function offToAlt(p: any): Alt | null {
  const name = String(p?.product_name ?? "").trim();
  if (!name) return null;

  const nutr = p?.nutriments || {};
  const additives = Array.isArray(p?.additives_tags) ? p.additives_tags : [];
  const ingredientsText = typeof p?.ingredients_text === "string" ? p.ingredients_text : "";

  // ⚠️ OFF 数据单位不总一致，这里按常见字段处理，未知就 null
  const sodium_mg =
    nutr.sodium_100g != null && Number.isFinite(Number(nutr.sodium_100g))
      ? Math.round(Number(nutr.sodium_100g) * 1000)
      : null;

  const added_sugar_g =
    nutr.sugars_100g != null && Number.isFinite(Number(nutr.sugars_100g))
      ? Number(nutr.sugars_100g)
      : null;

  const cholesterol_mg =
    nutr.cholesterol_100g != null && Number.isFinite(Number(nutr.cholesterol_100g))
      ? Math.round(Number(nutr.cholesterol_100g) * 100)
      : null;

  const ingredient_count = ingredientsText ? ingredientsText.split(",").map((x) => x.trim()).filter(Boolean).length : null;

  const has_sweeteners =
    additives.some((t: string) => String(t).toLowerCase().includes("sweetener")) ||
    /sucralose|aspartame|acesulfame|stevia|erythritol|xylitol|sorbitol/i.test(ingredientsText);

  return {
    name: name.slice(0, 80),
    reason: "Cleaner option from same category (OFF).",
    price: "$$",
    sodium_mg,
    added_sugar_g,
    cholesterol_mg,
    ingredient_count,
    has_sweeteners,
    source: "off",
  };
}

// ---------- OFF cache (容错：表/列不存在也不炸) ----------
async function readOFFCache(supabase: any, aisle: string, take = 30) {
  try {
    const { data, error } = await supabase
      .from("off_products")
      .select("off_id, aisle_key, product_name, ingredients_text, nutriments, additives_tags, nova_group, updated_at")
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
          nova_group: Number.isFinite(Number(p?.nova_group)) ? Number(p.nova_group) : null,
          updated_at: new Date().toISOString(),
        };
      })
      .filter(Boolean) as any[];

    if (rows.length === 0) return;

    const { error } = await supabase.from("off_products").upsert(rows, { onConflict: "off_id" });
    if (error) {
      // 不影响主流程
      console.warn("OFF_CACHE_UPSERT_ERROR:", error?.message);
    }
  } catch (e: any) {
    console.warn("OFF_CACHE_UPSERT_FATAL:", e?.message ?? e);
  }
}

// ---------- scans select: 兼容旧库没有 aisle 字段 ----------
async function readScanSafe(supabase: any, scanId: string, userId: string) {
  // 先尝试带 aisle 字段 + 旧版需要字段
  const try1 = await supabase
    .from("scans")
    .select("id, product_name, analysis, alternatives, score, verdict, risk_tags, triggers, aisle_key, aisle_confidence, created_at")
    .eq("id", scanId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!try1.error) return try1;

  // 老库降级
  const try2 = await supabase
    .from("scans")
    .select("id, product_name, analysis, alternatives, score, verdict, risk_tags, triggers, created_at")
    .eq("id", scanId)
    .eq("user_id", userId)
    .maybeSingle();

  return try2;
}

/* =====================================================
   Handler
===================================================== */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const scanId = searchParams.get("scanId") || searchParams.get("scan");
    if (!scanId) return NextResponse.json({ error: "Missing scanId" }, { status: 400 });

    // 1) scan（安全读取）
    const { data: scan, error: scanErr } = await readScanSafe(supabase, scanId, user.id);
    if (scanErr || !scan) {
      return NextResponse.json({ error: "Scan not found", detail: scanErr?.message }, { status: 404 });
    }

    // aisle (optional)
    const aisle = typeof (scan as any)?.aisle_key === "string" ? (scan as any).aisle_key : "unknown";
    const conf = typeof (scan as any)?.aisle_confidence === "number" ? (scan as any).aisle_confidence : 0;

    // 2) prefs
    const { data: prefRow } = await supabase
      .from("user_preferences")
      .select("low_sodium, low_sugar, low_cholesterol, avoid_sweeteners, prefer_simple_ingredients")
      .eq("user_id", user.id)
      .maybeSingle();

    const prefs: Prefs = { ...DEFAULT_PREFS, ...(prefRow || {}) };

    // 3) verdict/score/triggers/analysis（旧版字段保留 + 兜底）
    const score = typeof (scan as any)?.score === "number" ? (scan as any).score : null;
    const verdict: Verdict =
      ((scan as any)?.verdict as Verdict) || scoreToVerdict(score);

    const triggers = safeArray((scan as any)?.triggers);
    const analysis =
      ((scan as any)?.analysis && String((scan as any)?.analysis).trim()) ||
      (triggers.length ? String(triggers[0]) : "");

    const riskTags = safeArray((scan as any)?.risk_tags).map((x: any) => String(x));

    // good → 不推荐（但仍返回旧字段，避免前端空字段）
    if (verdict === "good") {
      return NextResponse.json({
        scanId: (scan as any).id,
        productName: (scan as any).product_name || "Unknown",
        analysis,
        score,
        verdict,
        alternatives: [],
        prefs,
        triggers,
        aisle,
        aisle_confidence: conf,
        debug: { off_mode: "disabled", off_enabled: false, reason: "verdict_good" },
      });
    }

    // 4) AI 候选池
    const rawAlts = safeArray((scan as any)?.alternatives);
    let alts: Alt[] = rawAlts.map((x) => normalizeAlt(x, "ai")).filter(Boolean) as Alt[];

    // 5) OFF 扩容（缓存优先）
    let offMode: "disabled" | "cache" | "external" = "disabled";
    const canUseOFF =
      aisle !== "unknown" &&
      !!AISLE_TO_OFF_TAGS[aisle]?.length &&
      conf >= OFF_MIN_CONFIDENCE;

    if (alts.length < MIN_ALTS_BEFORE_OFF && canUseOFF) {
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
          const key = a.name.toLowerCase();
          if (!seen.has(key)) {
            alts.push(a);
            seen.add(key);
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
            const key = a.name.toLowerCase();
            if (!seen.has(key)) {
              alts.push(a);
              seen.add(key);
            }
          }
          offMode = "external";
        }
      }
    }

    // 6) 健康过滤 + 排序（保留旧逻辑）
    let final = hardFilter(alts, prefs)
      .sort((a, b) => prefScore(a, prefs) - prefScore(b, prefs))
      .slice(0, 3);

    if (final.length === 0) {
      // 旧版 fallback 优先，其次同 aisle fallback
      final = fallbackRecs(verdict);
      if (!final?.length) final = sameAisleFallback(aisle);
    }

    return NextResponse.json({
      scanId: (scan as any).id,
      productName: (scan as any).product_name || "Unknown",
      analysis,
      score,
      verdict,
      alternatives: final,
      prefs,
      triggers,
      aisle,
      aisle_confidence: conf,
      // 先保留 riskTags，未来你想把它用于 hardFilter 的 heuristics 也方便
      risk_tags: riskTags,
      debug: {
        ai_alts: rawAlts.length,
        off_mode: offMode,
        off_enabled: canUseOFF,
        cache_ttl_days: OFF_TTL_DAYS,
        min_confidence: OFF_MIN_CONFIDENCE,
        off_timeout_ms: OFF_FETCH_TIMEOUT_MS,
      },
    });
  } catch (e: any) {
    console.error("RECS_FATAL:", e);
    return NextResponse.json(
      { error: "Failed to load recommendations", reason: e?.message ?? "unknown" },
      { status: 500 }
    );
  }
}