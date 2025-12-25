// src/app/api/recs/route.ts
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
  source?: "ai" | "off";
};

const DEFAULT_PREFS: Prefs = {
  low_sodium: false,
  low_sugar: false,
  low_cholesterol: false,
  avoid_sweeteners: false,
  prefer_simple_ingredients: false,
};

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

// ---------- helpers ----------
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

  // 同分轻微偏好 OFF
  if (a.source === "off") s -= 0.1;

  return s;
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

// ---------- OFF external ----------
async function fetchOFFCandidatesExternal(aisle: string, limit = 12) {
  const tags = AISLE_TO_OFF_TAGS[aisle];
  if (!tags || tags.length === 0) return [];

  // ✅ OFF 支持多个 category filter：用 OR-like 的查询更稳（一个 query 里只放一个 tag，取并集）
  // 这里简单做：逐个 tag 拉取后合并去重（避免 OFF 参数怪异导致 0 结果）
  const all: any[] = [];
  for (const tag of tags) {
    const url =
      `https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&json=1` +
      `&page_size=${limit}` +
      `&categories_tags=${encodeURIComponent(tag)}` +
      `&fields=id,code,product_name,nutriments,ingredients_text,additives_tags,nova_group`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) continue;

    const data = await res.json();
    const products = Array.isArray(data?.products) ? data.products : [];
    for (const p of products) all.push(p);
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
  return out.slice(0, Math.max(limit, 12));
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
    ingredient_count: ingredientsText ? ingredientsText.split(",").filter(Boolean).length : null,
    has_sweeteners: additives.some((t: string) => String(t).toLowerCase().includes("sweetener")),
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
        // ⚠️ raw 字段：如果你表里没有 raw，这行会导致写入 error
        // raw: p,
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean) as any[];

  if (rows.length === 0) return;

  // 容错：不 throw
  await supabase.from("off_products").upsert(rows, { onConflict: "off_id" });
}

// ---------- scans select: 兼容旧库没有 aisle 字段 ----------
async function readScanSafe(supabase: any, scanId: string, userId: string) {
  // 先尝试带 aisle 字段
  const try1 = await supabase
    .from("scans")
    .select("id, product_name, verdict, alternatives, aisle_key, aisle_confidence")
    .eq("id", scanId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!try1.error) return try1;

  // 如果列不存在/老库：降级不选 aisle
  const try2 = await supabase
    .from("scans")
    .select("id, product_name, verdict, alternatives")
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const scanId = searchParams.get("scanId") || searchParams.get("scan");
    if (!scanId) return NextResponse.json({ error: "Missing scanId" }, { status: 400 });

    // 1) scan（安全读取）
    const { data: scan, error: scanErr } = await readScanSafe(supabase, scanId, user.id);
    if (scanErr || !scan) {
      return NextResponse.json({ error: "Scan not found", detail: scanErr?.message }, { status: 404 });
    }

    const aisle = typeof (scan as any)?.aisle_key === "string" ? (scan as any).aisle_key : "unknown";
    const conf = typeof (scan as any)?.aisle_confidence === "number" ? (scan as any).aisle_confidence : 0;

    // good → 不推荐
    if (scan.verdict === "good") {
      return NextResponse.json({
        scanId,
        productName: scan.product_name || "Unknown",
        aisle,
        aisle_confidence: conf,
        alternatives: [],
        debug: { off_mode: "disabled", off_enabled: false, reason: "verdict_good" },
      });
    }

    // 2) prefs
    const { data: prefRow } = await supabase
      .from("user_preferences")
      .select("low_sodium, low_sugar, low_cholesterol, avoid_sweeteners, prefer_simple_ingredients")
      .eq("user_id", user.id)
      .maybeSingle();

    const prefs: Prefs = { ...DEFAULT_PREFS, ...(prefRow || {}) };

    // 3) AI 候选池
    const rawAlts = Array.isArray(scan.alternatives) ? scan.alternatives : [];
    let alts = rawAlts.map(normalizeAlt).filter(Boolean) as Alt[];

    // 4) OFF 扩容（缓存优先）
    let offMode: "disabled" | "cache" | "external" = "disabled";

    const canUseOFF =
      aisle !== "unknown" &&
      !!AISLE_TO_OFF_TAGS[aisle]?.length &&
      conf >= OFF_MIN_CONFIDENCE;

    if (alts.length < 5 && canUseOFF) {
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

    // 5) 健康过滤 + 排序
    let final = hardFilter(alts, prefs)
      .sort((a, b) => prefScore(a, prefs) - prefScore(b, prefs))
      .slice(0, 3);

    if (final.length === 0) final = sameAisleFallback(aisle);

    return NextResponse.json({
      scanId,
      productName: scan.product_name || "Unknown",
      aisle,
      aisle_confidence: conf,
      alternatives: final,
      debug: {
        ai_alts: rawAlts.length,
        off_mode: offMode,
        off_enabled: canUseOFF,
        cache_ttl_days: OFF_TTL_DAYS,
        min_confidence: OFF_MIN_CONFIDENCE,
      },
    });
  } catch (e: any) {
    // ✅ 关键：永远返回 JSON，前端不会再 parse 到 "<"
    console.error("RECS_FATAL:", e);
    return NextResponse.json(
      { error: "Failed to load recommendations", reason: e?.message ?? "unknown" },
      { status: 500 }
    );
  }
}