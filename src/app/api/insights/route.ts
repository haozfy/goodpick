import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Verdict = "good" | "caution" | "avoid";

function humanizeTag(tag: string) {
  const map: Record<string, string> = {
    added_sugar: "Added sugar",
    high_sodium: "High sodium",
    refined_oils: "Refined oils",
    refined_carbs: "Refined carbs",
    many_additives: "Many additives",
    ultra_processed: "Ultra-processed",
    low_fiber: "Low fiber",
    low_protein: "Low protein",
  };
  return map[tag] ?? tag.replaceAll("_", " ");
}

function buildInsights(scans: any[]) {
  const counts: Record<Verdict, number> = { good: 0, caution: 0, avoid: 0 };
  const tagCount = new Map<string, number>();

  for (const s of scans) {
    const v = String(s.verdict ?? "").toLowerCase();
    if (v === "good" || v === "caution" || v === "avoid") counts[v]++;

    const tags: string[] = Array.isArray(s.risk_tags) ? s.risk_tags : [];
    for (const t of tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  }

  const mostly: Verdict =
    counts.good >= counts.caution && counts.good >= counts.avoid
      ? "good"
      : counts.caution >= counts.avoid
      ? "caution"
      : "avoid";

  const riskSignals = Array.from(tagCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, count]) => ({ tag, label: humanizeTag(tag), count }));

  let headline = "Mostly good choices 👍";
  let subline = "Keep it up — your recent scans look generally clean.";

  if (mostly === "caution") {
    headline = "Mostly okay — a few watch-outs";
    subline = "Some items show higher sugar/processing. Easy wins with swaps.";
  }
  if (mostly === "avoid") {
    headline = "Too many avoid items lately";
    subline = "You’re scanning more ultra-processed foods. Swaps will help fast.";
  }

  const patterns: string[] = [];
  patterns.push(mostly === "good" ? "Mostly Good" : mostly === "caution" ? "Mixed choices" : "More Avoid items");
  if (counts.avoid > 0) patterns.push("Avoid items show up sometimes");
  if (riskSignals[0]) patterns.push(`Top signal: ${riskSignals[0].label}`);

  const suggestions: string[] = [];
  const top = riskSignals[0]?.tag;

  if (!top) {
    suggestions.push("Scan a few more foods to unlock stronger patterns.");
    suggestions.push("Use Recs to swap one snack at a time.");
  } else {
    if (top.includes("sugar")) suggestions.push("Try choosing lower-sugar snacks more often.");
    else if (top.includes("oil")) suggestions.push("Look for better oils (less refined).");
    else if (top.includes("additive")) suggestions.push("Pick options with fewer additives and flavorings.");
    else if (top.includes("processed")) suggestions.push("Swap one ultra-processed item this week.");
    else suggestions.push("Use Recs to swap your most frequent snack category.");

    suggestions.push("One small swap per week is enough to improve trends.");
  }

  return {
    totals: { scans: scans.length, ...counts },
    headline,
    subline,
    mostly,
    patterns: patterns.slice(0, 3),
    riskSignals,
    suggestions: suggestions.slice(0, 2),
  };
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get("days") ?? "30"); // 7/30 默认 30
    const limit = Number(searchParams.get("limit") ?? "80");

    const now = new Date();
    const since = new Date(now.getTime() - Math.max(1, days) * 24 * 60 * 60 * 1000).toISOString();

    const { data: scans, error } = await supabase
      .from("scans")
      .select("id, created_at, product_name, score, verdict, risk_tags")
      .eq("user_id", user.id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 200));

    if (error) throw new Error(error.message);

    const insights = buildInsights(scans ?? []);

    return NextResponse.json({
      window: { days, since },
      insights,
      scans: scans ?? [], // 需要的话前端也能展示最近记录（但 Insights 页建议不展示单品）
    });
  } catch (error: any) {
    console.error("Insights API Error:", error);
    return NextResponse.json({ error: error.message ?? "Server error" }, { status: 500 });
  }
}
