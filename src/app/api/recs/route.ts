// src/app/api/recs/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* ================== types ================== */

type RecItem = {
  name: string;
  reason: string;
  aisle_key: string;
  source: "ai" | "off";
};

type ScanLite = {
  id: string;
  aisle_key: string;
  aisle_confidence: number;
  verdict: "good" | "caution" | "avoid";
  risk_tags: string[];
};

/* ================== helpers ================== */

function safeJsonParse(text: string) {
  try {
    return JSON.parse(
      text.replace(/```json/g, "").replace(/```/g, "").trim()
    );
  } catch {
    return null;
  }
}

/* ================== OFF helpers ================== */

async function fetchOFFByAisle(aisle: string) {
  const url = `https://world.openfoodfacts.org/api/v2/search?categories_tags_en=${encodeURIComponent(
    aisle
  )}&page_size=5&fields=product_name,nova_group,additives_tags,nutriments`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];

  const json = await res.json();
  return Array.isArray(json?.products) ? json.products : [];
}

async function getOFFCandidates(
  supabase: any,
  aisle_key: string
): Promise<RecItem[]> {
  // 1️⃣ cache first
  const { data } = await supabase
    .from("off_products")
    .select("*")
    .eq("aisle_key", aisle_key)
    .order("updated_at", { ascending: false })
    .limit(3);

  if (data && data.length > 0) {
    return data.map((p: any) => ({
      name: p.product_name || "Cleaner alternative",
      reason: "Lower processing level (OFF data)",
      aisle_key,
      source: "off",
    }));
  }

  // 2️⃣ fetch OFF
  const fresh = await fetchOFFByAisle(aisle_key);

  if (fresh.length === 0) return [];

  // 3️⃣ store cache
  for (const p of fresh.slice(0, 3)) {
    await supabase.from("off_products").upsert({
      off_id: `${aisle_key}:${p.product_name}`,
      aisle_key,
      product_name: p.product_name,
      nova_group: p.nova_group ?? null,
      nutriments: p.nutriments ?? null,
      additives_tags: p.additives_tags ?? [],
      raw: p,
      updated_at: new Date().toISOString(),
    });
  }

  return fresh.slice(0, 3).map((p: any) => ({
    name: p.product_name || "Cleaner alternative",
    reason:
      p.nova_group && p.nova_group <= 3
        ? "Less processed (OFF NOVA)"
        : "Fewer additives (OFF data)",
    aisle_key,
    source: "off",
  }));
}

/* ================== handler ================== */

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const scanId = searchParams.get("scanId");

    if (!scanId) {
      return NextResponse.json(
        { error: "scanId required" },
        { status: 400 }
      );
    }

    // 1️⃣ load scan
    const { data: scan, error } = await supabase
      .from("scans")
      .select("id, aisle_key, aisle_confidence, verdict, risk_tags")
      .eq("id", scanId)
      .single();

    if (error || !scan) {
      return NextResponse.json(
        { error: "Scan not found" },
        { status: 404 }
      );
    }

    const scanLite = scan as ScanLite;

    // 2️⃣ If GOOD → no recs
    if (scanLite.verdict === "good") {
      return NextResponse.json({ recs: [] });
    }

    // 3️⃣ AI base recs (always)
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content: `You recommend cleaner alternatives.
Return ONLY JSON:
{
  "items":[
    {"name":string,"reason":string}
  ]
}
Rules:
- Same aisle only
- 2–3 items
- Short, human reasons`,
          },
          {
            role: "user",
            content: `Aisle: ${scanLite.aisle_key}
Issues: ${scanLite.risk_tags.join(", ")}`,
          },
        ],
      }),
    });

    const aiJson = safeJsonParse(
      aiRes?.json ? JSON.stringify(await aiRes.json()) : ""
    );

    let aiItems: RecItem[] = [];
    const content =
      (await aiRes.json())?.choices?.[0]?.message?.content;

    const parsed = safeJsonParse(content || "");
    if (parsed?.items) {
      aiItems = parsed.items.slice(0, 3).map((i: any) => ({
        name: String(i.name).slice(0, 80),
        reason: String(i.reason).slice(0, 120),
        aisle_key: scanLite.aisle_key,
        source: "ai",
      }));
    }

    // 4️⃣ OFF only if confidence >= 0.6
    let offItems: RecItem[] = [];
    if (
      scanLite.aisle_confidence !== null &&
      scanLite.aisle_confidence >= 0.6
    ) {
      offItems = await getOFFCandidates(
        supabase,
        scanLite.aisle_key
      );
    }

    // 5️⃣ merge (AI first, OFF as reinforcement)
    const merged = [...aiItems, ...offItems].slice(0, 3);

    return NextResponse.json({ recs: merged });
  } catch (e: any) {
    console.error("RECS_ERROR", e);
    return NextResponse.json(
      { error: "Failed to load recommendations" },
      { status: 500 }
    );
  }
}