import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function scoreToVerdict(score: number | null | undefined) {
  const s = typeof score === "number" ? score : 0;
  if (s >= 80) return "good";
  if (s >= 50) return "caution";
  return "avoid";
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
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

    // 保底：alternatives 可能不是数组
    const alternatives = Array.isArray(scan.alternatives) ? scan.alternatives : [];

    return NextResponse.json({
      scanId: scan.id,
      productName: scan.product_name || "Unknown",
      analysis: scan.analysis || "",
      score: scan.score ?? null,
      verdict,
      alternatives,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}