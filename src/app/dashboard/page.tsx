"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { ChevronRight, Sparkles, TriangleAlert, RotateCw } from "lucide-react";

type ScanResult = "good" | "caution" | "avoid";

type ScanRecord = {
  id: string;
  createdAt: string; // ISO
  productName?: string;
  result: ScanResult;
  riskTags: string[]; // e.g. ["added_sugar","refined_oils"]
};

export default function DashboardPage() {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/insights?days=30&limit=80", {
        cache: "no-store",
      });

      // 401/403/500 都按空处理（页面会显示 empty state）
      if (!res.ok) {
        setScans([]);
        return;
      }

      const data = await res.json();
      const rows = Array.isArray(data?.scans) ? data.scans : [];

      const mapped: ScanRecord[] = rows.map((r: any) => ({
        id: r.id,
        createdAt: r.created_at,
        productName: r.product_name ?? undefined,
        // 你 analyze API 推荐写 verdict；为了兼容旧字段也兜底一下
        result: (r.verdict ?? r.result ?? "caution") as ScanResult,
        riskTags: Array.isArray(r.risk_tags) ? r.risk_tags : [],
      }));

      setScans(mapped);
    } catch {
      setScans([]);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const insights = useMemo(() => buildInsights(scans), [scans]);

  if (!loaded) {
    return <PageShell title="Insights" subtitle="Loading your insights..." />;
  }

  // Empty state
  if (scans.length === 0) {
    return (
      <PageShell title="Insights" subtitle="Your food choices, summarized.">
        <div className="mt-10 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-neutral-100 p-2">
              <Sparkles className="h-5 w-5 text-neutral-700" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold text-neutral-900">No insights yet</div>
              <div className="mt-1 text-sm text-neutral-600">
                Scan a few foods to see patterns in your choices.
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                >
                  Start scanning <ChevronRight className="ml-1 h-4 w-4" />
                </Link>

                <button
                  onClick={load}
                  className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 shadow-sm hover:bg-neutral-50"
                >
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              <div className="mt-3 text-xs text-neutral-500">
                If you just scanned something, tap Refresh.
              </div>
            </div>
          </div>
        </div>

        <div className="h-24" />
      </PageShell>
    );
  }

  // Data state
  return (
    <PageShell title="Insights" subtitle="Your food choices, summarized.">
      {/* Summary */}
      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-neutral-900">Summary</div>

          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow-sm hover:bg-neutral-50"
            aria-label="Refresh insights"
          >
            <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Refreshing" : "Refresh"}
          </button>
        </div>

        <div className="mt-2 text-xl font-bold text-neutral-900">{insights.headline}</div>
        <div className="mt-1 text-sm text-neutral-600">{insights.subline}</div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Scans" value={String(scans.length)} />
          <Stat label="Mostly" value={insights.mostlyLabel} />
          <Stat label="Top risk" value={insights.topRiskLabel ?? "—"} />
        </div>
      </div>

      {/* Patterns */}
      <Card title="Patterns">
        <ul className="space-y-2">
          {insights.patterns.map((p) => (
            <li key={p} className="text-sm text-neutral-800">
              • {p}
            </li>
          ))}
        </ul>
      </Card>

      {/* Risk signals */}
      <Card title="Risk signals">
        {insights.riskSignals.length === 0 ? (
          <div className="text-sm text-neutral-600">No major risk signals yet.</div>
        ) : (
          <ul className="space-y-2">
            {insights.riskSignals.map((r) => (
              <li key={r.tag} className="flex items-center justify-between text-sm">
                <span className="text-neutral-800">{humanizeRiskTag(r.tag)}</span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700">
                  {r.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Suggestions */}
      <Card title="Suggestions">
        <div className="space-y-2">
          {insights.suggestions.map((s) => (
            <div key={s} className="flex gap-2 text-sm text-neutral-800">
              <TriangleAlert className="mt-0.5 h-4 w-4 text-neutral-500" />
              <span>{s}</span>
            </div>
          ))}
        </div>

        {/* 轻量 Pro 提示（不油） */}
        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
          Pro shows longer-term trends (7/30 days) and what’s improving.
        </div>
      </Card>

      <div className="h-24" />
    </PageShell>
  );
}

function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-xl px-5 pb-10 pt-6">
      <div className="text-3xl font-extrabold text-neutral-900">{title}</div>
      {subtitle ? <div className="mt-1 text-sm text-neutral-600">{subtitle}</div> : null}
      {children}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="text-sm font-semibold text-neutral-900">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <div className="text-[11px] font-semibold text-neutral-500">{label}</div>
      <div className="mt-1 text-sm font-bold text-neutral-900">{value}</div>
    </div>
  );
}

/** 核心：把 scans 聚合成 Insights */
function buildInsights(scans: ScanRecord[]) {
  const counts = { good: 0, caution: 0, avoid: 0 } as Record<ScanResult, number>;
  const riskCount = new Map<string, number>();

  for (const s of scans) {
    counts[s.result] += 1;
    for (const tag of s.riskTags ?? []) {
      riskCount.set(tag, (riskCount.get(tag) ?? 0) + 1);
    }
  }

  const mostly: ScanResult =
    counts.good >= counts.caution && counts.good >= counts.avoid
      ? "good"
      : counts.caution >= counts.avoid
      ? "caution"
      : "avoid";

  const mostlyLabel =
    mostly === "good" ? "Good" : mostly === "caution" ? "Caution" : "Avoid";

  const riskSignals = Array.from(riskCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, count]) => ({ tag, count }));

  const topRiskLabel = riskSignals[0]?.tag ? shortRiskLabel(riskSignals[0].tag) : null;

  let headline = "Mostly good choices 👍";
  let subline = "Keep it up — your scans look generally clean.";

  if (mostly === "caution") {
    headline = "Mostly okay — a few watch-outs";
    subline = "Some items show higher sugar / processing. Easy to improve with swaps.";
  }
  if (mostly === "avoid") {
    headline = "Too many avoid items lately";
    subline = "You’re scanning more ultra-processed foods. Swaps will help fast.";
  }

  const patterns: string[] = [];
  patterns.push(
    mostly === "good" ? "Mostly Good" : mostly === "caution" ? "Mixed choices" : "More Avoid items"
  );
  if (counts.avoid > 0) patterns.push("Avoid items show up sometimes");
  if (counts.good > 0) patterns.push("You do pick clean options too");

  const suggestions: string[] = [];
  const top = riskSignals[0]?.tag;

  if (!top) {
    suggestions.push("Scan a few more foods to unlock stronger patterns.");
    suggestions.push("Use Recs to swap one snack at a time.");
  } else {
    if (top.includes("sugar")) suggestions.push("Try choosing lower-sugar snacks more often.");
    else if (top.includes("oil")) suggestions.push("Look for snacks with better oils (less refined).");
    else if (top.includes("additive")) suggestions.push("Pick options with fewer additives and flavorings.");
    else suggestions.push("Use Recs to swap your most frequent snack category.");

    suggestions.push("One small swap per week is enough to improve trends.");
  }

  return {
    headline,
    subline,
    mostlyLabel,
    topRiskLabel,
    patterns: dedupe(patterns).slice(0, 3),
    riskSignals,
    suggestions: suggestions.slice(0, 2),
  };
}

function dedupe(arr: string[]) {
  return Array.from(new Set(arr));
}

function humanizeRiskTag(tag: string) {
  const map: Record<string, string> = {
    added_sugar: "Added sugar",
    high_sugar: "High sugar",
    refined_oils: "Refined oils",
    artificial_flavors: "Artificial flavors",
    additives: "Additives",
    refined_carbs: "Refined carbs",
    ultra_processed: "Ultra-processed",
    high_sodium: "High sodium",
    many_additives: "Many additives",
    low_fiber: "Low fiber",
    low_protein: "Low protein",
  };
  return map[tag] ?? tag.replaceAll("_", " ");
}

function shortRiskLabel(tag: string) {
  const map: Record<string, string> = {
    added_sugar: "Sugar",
    high_sugar: "Sugar",
    refined_oils: "Oils",
    refined_carbs: "Carbs",
    additives: "Additives",
    many_additives: "Additives",
    ultra_processed: "Processed",
    high_sodium: "Sodium",
    low_fiber: "Fiber",
    low_protein: "Protein",
  };
  return map[tag] ?? "Risk";
}
