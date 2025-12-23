import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Verdict = "good" | "caution" | "avoid";
type RecItem = { name: string; reason: string; price?: string };

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
    .map((x) => ({
      name: String(x?.name || x?.title || x?.productName || "").trim(),
      reason: String(x?.reason || x?.why || x?.note || "").trim(),
      price: x?.price ? String(x.price) : undefined,
    }))
    .filter((x) => x.name.length > 0 && x.reason.length > 0)
    .slice(0, 10);
}

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

    const { data: scan, error } = await supabase
      .from("scans")
      .select("id, product_name, analysis, alternatives, score, grade, created_at")
      .eq("id", scanId)
      .eq("user_id", user.id)
      .single();

    if (error || !scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

    const verdict = scoreToVerdict(scan.score);

    const alternatives = sanitizeAlternatives(normalizeAlternatives(scan.alternatives));

    return NextResponse.json({
      scanId: scan.id,
      productName: scan.product_name || "Unknown",
      analysis: scan.analysis || "",
      score: typeof scan.score === "number" ? scan.score : null,
      verdict,
      alternatives,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}