import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
  source?: "ai" | "off"; // ✅ 方便 UI 标注来源
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

// ✅ 过期时间（缓存 7 天）
const OFF_TTL_DAYS = 7;

// ✅ 更稳：confidence < 0.6 不启用 OFF
const OFF_MIN_CONFIDENCE = 0.6;

// ========== helpers ==========
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

  return {
    name,
    reason: String(raw?.reason ?? "").trim().slice(0, 140),
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
    source: "ai",
  };
}

// 硬过滤（不跨类，只做健康硬规则）
function hardFilter(alts: Alt[], prefs: Prefs) {
  let out = [...alts];

  if (prefs.avoid_sweeteners) out = out.filter((a) => a.has_sweeteners !== true);
  if (prefs.low_sodium) out = out.filter((a) => a.sodium_mg == null || a.sodium_mg <= 450);
  if (prefs.low_sugar) out = out.filter((a) => a.added_sugar_g == null || a.added_sugar_g <= 6);
  if (prefs.low_cholesterol) out = out.filter((a) => a.cholesterol_mg == null || a.cholesterol_mg <= 60);
  if (prefs.prefer_simple_ingredients) out = out.filter((a) => a.ingredient_count == null || a.ingredient_count <= 12);

  // 放宽（但不违反 avoid_sweeteners）
  if (out.length === 0) {
    out = [...alts].filter((a) => (prefs.avoid_sweeteners ? a.has_sweeteners !== true : true));
    if (out.length === 0) out = [...alts];
  }
  return out;
}

// 排序（越低越好）
function prefScore(a: Alt, prefs: Prefs) {
  let s = 0;

  if (prefs.low_sodium) s += a.sodium_mg == null ? 3 : a.sodium_mg <= 250 ? 0 : a.sodium_mg <= 450 ? 1 : 4;
  if (prefs.low_sugar) s += a.added_sugar_g == null ? 3 : a.added_sugar_g <= 2 ? 0 : a.added_sugar_g <= 6 ? 1 : 4;
  if (prefs.low_cholesterol) s += a.cholesterol_mg == null ? 2 : a.cholesterol_mg <= 20 ? 0 : a.cholesterol_mg <= 60 ? 1 : 3;
  if (prefs.prefer_simple_ingredients) s += a.ingredient_count == null ? 2 : a.ingredient_count <= 8 ? 0 : a.ingredient_count <= 12 ? 1 : 3;
  if (prefs.avoid_sweeteners) s += a.has_sweeteners == null ? 1 : a.has_sweeteners ? 6 : 0;

  // ✅ 轻微偏好 OFF（同分时更稳定）
  if (a.source === "off") s -= 0.1;

  return s;
}

// 同类兜底
function sameAisleFallback(aisle: string): Alt[] {
  switch (aisle) {
    case "instant_noodles":
      return [{ name: "Air-dried ramen (lower sodium)", reason: "Same noodles, less sodium.", price: "$$", source: "ai" }];
    case "chocolate":
      return [{ name: "70% dark chocolate", reason: "Lower sugar, higher cocoa.", price: "$$", source: "ai" }];
    default:
      return [{ name: "Cleaner option (same category)", reason: "Same category, simpler ingredients.", price: "$$", source: "ai" }];
  }
}

// ========== OFF: external fetch ==========
async function fetchOFFCandidatesExternal(aisle: string, limit = 12) {
  const tags = AISLE_TO_OFF_TAGS[aisle];
  if (!tags || tags.length === 0) return [];

  const tagQuery = tags.map((t) => `categories_tags=${encodeURIComponent(t)}`).join("&");

  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&json=1&page_size=${limit}&${tagQuery}&fields=id,code,product_name,nutriments,ingredients_text,additives_tags,nova_group`;

  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.products) ? data.products : [];
}

function offToAlt(p: any): Alt | null {
  const name = String(p?.product_name ?? "").trim();
  if (!name) return null;

  const nutr = p?.nutriments || {};
  const additives = Array.isArray(p?.additives_tags) ? p.additives_tags : [];
  const ingredientsText = typeof p?.ingredients_text === "string" ? p.ingredients_text : "";

  return {
    name: name.slice(0, 80),
    reason: "Cleaner option from same category.",
    price: "$$",
    sodium_mg: nutr.sodium_100g != null ? Math.round(Number(nutr.sodium_100g) * 1000) : null,
    added_sugar_g: nutr.sugars_100g != null ? Number(nutr.sugars_100g) : null,
    cholesterol_mg: nutr.cholesterol_100g != null ? Math.round(Number(nutr.cholesterol_100g) * 100) : null,
    ingredient_count: ingredientsText ? ingredientsText.split(",").length : null,
    has_sweeteners: additives.some((t: string) => String(t).toLowerCase().includes("sweetener")),
    source: "off",
  };
}

// ========== OFF: cache read/write ==========
async function readOFFCache(supabase: any, aisle: string, take = 30) {
  const { data, error } = await supabase
    .from("off_products")
    .select("off_id, aisle_key, product_name, ingredients_text, nutriments, additives_tags, nova_group, updated_at")
    .eq("aisle_key", aisle)
    .order("updated_at", { ascending: false })
    .limit(take);

  if (error) return [];
  return Array.isArray(data) ? data : [];
}

function isCacheFresh(rows: any[]) {
  if (!rows || rows.length === 0) return false;
  const newest = rows[0]?.updated_at ? new Date(rows[0].updated_at).getTime() : 0;
  if (!newest) return false;
  const ttlMs = OFF_TTL_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - newest < ttlMs;
}

async function upsertOFFCache(supabase: any, aisle: string, products: any[]) {
  if (!products || products.length === 0) return;

  const rows = products.map((p: any) => {
    const off_id =
      String(p?.id ?? p?.code ?? "").trim() ||
      String(p?._id ?? "").trim();

    const product_name = String(p?.product_name ?? "").trim().slice(0, 160);
    const ingredients_text =
      typeof p?.ingredients_text === "string"
        ? p.ingredients_text.slice(0, 2000)
        : null;

    return {
      off_id,
      aisle_key: aisle,
      product_name: product_name || null,
      ingredients_text,
      nutriments: p?.nutriments ?? null,
      additives_tags: Array.isArray(p?.additives_tags) ? p.additives_tags : null,
      nova_group: Number.isFinite(Number(p?.nova_group)) ? Number(p.nova_group) : null,
      raw: p,
      updated_at: new Date().toISOString(),
    };
  }).filter((r: any) => r.off_id);

  if (rows.length === 0) return;

  // ✅ onConflict: off_id（你 SQL 里 unique(off_id)）
  await supabase.from("off_products").upsert(rows, { onConflict: "off_id" });
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
    const scanId = searchParams.get("scanId");
    if (!scanId) return NextResponse.json({ error: "Missing scanId" }, { status: 400 });

    // 1) scan（要 aisle + confidence + alternatives）
    const { data: scan, error: scanErr } = await supabase
      .from("scans")
      .select("id, product_name, verdict, alternatives, aisle_key, aisle_confidence")
      .eq("id", scanId)
      .eq("user_id", user.id)
      .single();

    if (scanErr || !scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

    const aisle = scan.aisle_key || "unknown";
    const conf = typeof scan.aisle_confidence === "number" ? scan.aisle_confidence : 0;

    // verdict good → 不推荐
    if (scan.verdict === "good") {
      return NextResponse.json({
        scanId,
        productName: scan.product_name || "Unknown",
        aisle,
        alternatives: [],
      });
    }

    // 2) prefs
    const { data: prefRow } = await supabase
      .from("user_preferences")
      .select("low_sodium, low_sugar, low_cholesterol, avoid_sweeteners, prefer_simple_ingredients")
      .eq("user_id", user.id)
      .maybeSingle();
    const prefs: Prefs = { ...DEFAULT_PREFS, ...(prefRow || {}) };

    // 3) AI 候选池（同类）
    const rawAlts = Array.isArray(scan.alternatives) ? scan.alternatives : [];
    let alts = rawAlts.map(normalizeAlt).filter(Boolean) as Alt[];

    // 4) OFF 扩容（缓存优先）
    let offMode: "disabled" | "cache" | "external" = "disabled";

    const canUseOFF =
      aisle !== "unknown" &&
      AISLE_TO_OFF_TAGS[aisle]?.length &&
      conf >= OFF_MIN_CONFIDENCE;

    if (alts.length < 5 && canUseOFF) {
      // 4.1 读缓存
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

        // merge + 去重
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

      // 4.2 缓存不新鲜 / 过少 → 外网拉取并写回缓存
      const needRefresh = !cacheFresh || cacheRows.length < 12;
      if (needRefresh) {
        const external = await fetchOFFCandidatesExternal(aisle, 12);
        if (external.length > 0) {
          // 写回缓存
          await upsertOFFCache(supabase, aisle, external);

          // 同时把 external 也 merge 进来（让这次请求立即变好）
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

    // 5) 健康过滤 + 偏好排序
    alts = hardFilter(alts, prefs)
      .sort((a, b) => prefScore(a, prefs) - prefScore(b, prefs))
      .slice(0, 3);

    if (alts.length === 0) alts = sameAisleFallback(aisle);

    return NextResponse.json({
      scanId,
      productName: scan.product_name || "Unknown",
      aisle,
      aisle_confidence: conf,
      alternatives: alts,
      debug: {
        ai_alts: rawAlts.length,
        off_mode: offMode, // disabled | cache | external
        off_enabled: canUseOFF,
        cache_ttl_days: OFF_TTL_DAYS,
        min_confidence: OFF_MIN_CONFIDENCE,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}