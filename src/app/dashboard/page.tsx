"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  RotateCw,
  TriangleAlert,
  Flame,
  ShieldCheck,
  ShieldAlert,
  Activity,
  ChevronRight,
  CalendarDays,
} from "lucide-react";

type ScanResult = "good" | "caution" | "avoid";

type ScanRowFromAPI = {
  id: string;
  created_at: string;
  product_name: string | null;
  score: number | null;
  verdict?: ScanResult | null;
  result?: ScanResult | null;
  grade?: string | null;
  risk_tags?: string[] | null;
};

type ScanRecord = {
  id: string;
  createdAt: string;
  productName?: string;
  result: ScanResult;
  riskTags: string[];
  score?: number;
};

export default function DashboardPage() {
  const [days, setDays] = useState<7 | 30>(30);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ NEW: distinguish “not logged in / not authorized” from “no scans”
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const load = useCallback(
    async (d = days) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/insights?days=${d}&limit=120`, {
          cache: "no-store",
        });

        if (!res.ok) {
          // ✅ NEW: show preview unlock when unauthorized
          if (res.status === 401 || res.status === 403) {
            setIsUnauthorized(true);
          } else {
            setIsUnauthorized(false);
          }
          setScans([]);
          return;
        }

        setIsUnauthorized(false);

        const data = await res.json();
        const rows: ScanRowFromAPI[] = Array.isArray(data?.scans) ? data.scans : [];

        const mapped: ScanRecord[] = rows.map((r) => {
          const verdict = (r.verdict ?? r.result) as ScanResult | undefined;
          const fallback: ScanResult =
            verdict === "good" || verdict === "caution" || verdict === "avoid"
              ? verdict
              : r.grade === "green"
              ? "good"
              : "avoid";

          return {
            id: r.id,
            createdAt: r.created_at,
            productName: r.product_name ?? undefined,
            result: fallback,
            riskTags: Array.isArray(r.risk_tags) ? r.risk_tags : [],
            score: typeof r.score === "number" ? r.score : undefined,
          };
        });

        setScans(mapped);
      } catch {
        setScans([]);
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    },
    [days]
  );

  useEffect(() => {
    load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const insights = useMemo(() => buildInsights(scans), [scans]);
  const recent = useMemo(() => scans.slice(0, 6), [scans]);

  return (
    <main className="min-h-screen w-full bg-neutral-50/50 px-6 pt-14 pb-28 relative overflow-hidden">
      {/* 背景光斑：跟首页同味道 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-emerald-400/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <div className="mx-auto w-full max-w-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm border border-neutral-100">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <span className="text-xs font-black tracking-[0.16em] text-neutral-800">
                INSIGHTS
              </span>
            </div>

            <h1 className="mt-4 text-4xl font-black text-neutral-900 tracking-tighter leading-tight">
              Your food choices,
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                summarized
              </span>
            </h1>

            <p className="mt-2 text-sm text-neutral-600">
              Patterns, signals, and a simple next step — without the “nutrition report” vibe.
            </p>
          </div>

          <button
            onClick={() => load(days)}
            className="mt-1 inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-800 shadow-sm hover:bg-neutral-50"
            aria-label="Refresh"
          >
            <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Refreshing" : "Refresh"}
          </button>
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Pill
              active={days === 7}
              icon={<CalendarDays className="h-4 w-4" />}
              label="7 days"
              onClick={() => setDays(7)}
            />
            <Pill
              active={days === 30}
              icon={<CalendarDays className="h-4 w-4" />}
              label="30 days"
              onClick={() => setDays(30)}
            />
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-4 py-2 text-xs font-black text-white shadow-sm transition active:scale-95"
          >
            Scan <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Loading / Empty */}
        {!loaded ? (
          <SkeletonBlock />
        ) : isUnauthorized ? (
          <PreviewUnlockState days={days} />
        ) : scans.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Summary Hero Card */}
            <div className="mt-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black tracking-[0.16em] text-neutral-500">
                    SUMMARY
                  </div>
                  <div className="mt-2 text-2xl font-black text-neutral-900">
                    {insights.headline}
                  </div>
                  <div className="mt-1 text-sm text-neutral-600">{insights.subline}</div>
                </div>

                <Badge verdict={insights.mostly} />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <Stat label="Scans" value={String(scans.length)} />
                <Stat label="Mostly" value={labelVerdict(insights.mostly)} />
                <Stat label="Top signal" value={insights.topRiskLabel ?? "—"} />
              </div>

              {/* Mini distribution */}
              <div className="mt-5">
                <div className="text-[11px] font-bold text-neutral-500 mb-2">Distribution</div>
                <Bars
                  good={insights.counts.good}
                  caution={insights.counts.caution}
                  avoid={insights.counts.avoid}
                />
              </div>
            </div>

            {/* Signals + Patterns */}
            <div className="mt-4 grid grid-cols-1 gap-4">
              <Card title="Risk signals" icon={<Flame className="h-4 w-4 text-neutral-500" />}>
                {insights.riskSignals.length === 0 ? (
                  <div className="text-sm text-neutral-600">No major signals yet.</div>
                ) : (
                  <div className="space-y-3">
                    {insights.riskSignals.map((r) => (
                      <div key={r.tag} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 rounded-2xl bg-neutral-100 flex items-center justify-center">
                            <TriangleAlert className="h-4 w-4 text-neutral-600" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-neutral-900">
                              {humanizeRiskTag(r.tag)}
                            </div>
                            <div className="text-xs text-neutral-500">shows up in your scans</div>
                          </div>
                        </div>
                        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-black text-neutral-700">
                          {r.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Patterns" icon={<Activity className="h-4 w-4 text-neutral-500" />}>
                <ul className="space-y-2">
                  {insights.patterns.map((p) => (
                    <li key={p} className="text-sm text-neutral-800">
                      • {p}
                    </li>
                  ))}
                </ul>
              </Card>

              <Card title="Next step" icon={<ShieldCheck className="h-4 w-4 text-neutral-500" />}>
                <div className="space-y-2">
                  {insights.suggestions.map((s) => (
                    <div key={s} className="flex gap-2 text-sm text-neutral-800">
                      <ShieldAlert className="mt-0.5 h-4 w-4 text-neutral-500" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>

                {/* 轻量 Pro 提示 */}
                <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
                  Pro shows longer-term trends and what’s improving.
                </div>
              </Card>
            </div>

            {/* Recent activity (small) */}
            <div className="mt-6">
              <div className="flex items-center justify-between px-1">
                <div className="text-sm font-black text-neutral-800 tracking-tight">
                  Recent scans
                </div>
                <span className="text-xs font-bold text-neutral-500">{days} days window</span>
              </div>

              <div className="mt-3 space-y-3">
                {recent.map((s) => (
                  <Link key={s.id} href={`/scan-result?id=${s.id}`} className="block">
                    <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-neutral-100 transition-all hover:border-emerald-200">
                      <div className="flex items-center gap-3">
                        <ScorePill score={s.score} verdict={s.result} />
                        <div className="overflow-hidden">
                          <div className="font-bold text-neutral-800 truncate max-w-[220px]">
                            {s.productName || "Unknown"}
                          </div>
                          <div className="text-xs text-neutral-400">
                            {new Date(s.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-neutral-300" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="h-10" />
          </>
        )}
      </div>
    </main>
  );
}

/* ---------------- UI bits ---------------- */

function Pill({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black shadow-sm border transition active:scale-95
        ${
          active
            ? "bg-neutral-900 text-white border-neutral-900"
            : "bg-white text-neutral-800 border-neutral-200 hover:bg-neutral-50"
        }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-2xl bg-neutral-100 flex items-center justify-center">
          {icon}
        </div>
        <div className="text-sm font-black text-neutral-900">{title}</div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
      <div className="text-[11px] font-black tracking-[0.14em] text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-black text-neutral-900 truncate">{value}</div>
    </div>
  );
}

function Badge({ verdict }: { verdict: ScanResult }) {
  const base =
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-black shadow-sm border";
  if (verdict === "good") {
    return (
      <span className={`${base} bg-emerald-100 text-emerald-800 border-emerald-200`}>
        GOOD
      </span>
    );
  }
  if (verdict === "caution") {
    return (
      <span className={`${base} bg-amber-100 text-amber-900 border-amber-200`}>
        CAUTION
      </span>
    );
  }
  return (
    <span className={`${base} bg-neutral-900 text-white border-neutral-900`}>
      AVOID
    </span>
  );
}

function ScorePill({ score, verdict }: { score?: number; verdict: ScanResult }) {
  const bg =
    verdict === "good"
      ? "bg-emerald-500"
      : verdict === "caution"
      ? "bg-amber-400 text-amber-950"
      : "bg-neutral-900";
  return (
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-black text-white ${bg}`}
    >
      {typeof score === "number" ? score : "—"}
    </div>
  );
}

function Bars({ good, caution, avoid }: { good: number; caution: number; avoid: number }) {
  const total = Math.max(1, good + caution + avoid);
  const g = Math.round((good / total) * 100);
  const c = Math.round((caution / total) * 100);
  const a = 100 - g - c;

  return (
    <div className="w-full rounded-2xl border border-neutral-200 bg-white p-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-neutral-100">
        <div style={{ width: `${g}%` }} className="h-full bg-emerald-500" />
        <div style={{ width: `${c}%` }} className="h-full bg-amber-400" />
        <div style={{ width: `${a}%` }} className="h-full bg-neutral-900" />
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-bold text-neutral-600">
        <span>Good {g}%</span>
        <span>Caution {c}%</span>
        <span>Avoid {a}%</span>
      </div>
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div className="mt-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="h-4 w-28 bg-neutral-100 rounded" />
      <div className="mt-3 h-8 w-3/4 bg-neutral-100 rounded" />
      <div className="mt-2 h-4 w-2/3 bg-neutral-100 rounded" />
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="h-16 bg-neutral-100 rounded-2xl" />
        <div className="h-16 bg-neutral-100 rounded-2xl" />
        <div className="h-16 bg-neutral-100 rounded-2xl" />
      </div>
      <div className="mt-5 h-20 bg-neutral-100 rounded-2xl" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-10 w-10 rounded-2xl bg-neutral-100 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="flex-1">
          <div className="text-lg font-black text-neutral-900">No insights yet</div>
          <div className="mt-1 text-sm text-neutral-600">
            Scan a few foods to see patterns in your choices.
          </div>
          <Link
            href="/"
            className="mt-4 inline-flex items-center justify-center rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-black text-white shadow-sm transition active:scale-95"
          >
            Start scanning <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ✅ NEW: Login-before preview that actually sells the value */
function PreviewUnlockState({ days }: { days: number }) {
  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-10 w-10 rounded-2xl bg-neutral-100 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-emerald-600" />
          </div>

          <div className="flex-1">
            <div className="text-lg font-black text-neutral-900">
              Your food patterns (preview)
            </div>

            <div className="mt-1 text-sm text-neutral-600 leading-relaxed">
              With an account, we summarize your last {days} days into:
            </div>

            <ul className="mt-3 space-y-2 text-sm text-neutral-800">
              <li>• Sugar & additive exposure trends</li>
              <li>• Repeated “avoid” signals you keep hitting</li>
              <li>• One simple next decision (no nutrition-report vibe)</li>
            </ul>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-black text-white shadow-sm transition active:scale-95"
              >
                Unlock insights <ChevronRight className="ml-1 h-4 w-4" />
              </Link>

              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-black text-neutral-900 shadow-sm hover:bg-neutral-50 transition active:scale-95"
              >
                Go Pro <span className="ml-2 text-xs text-neutral-500 font-bold">Unlimited + trends</span>
              </Link>
            </div>

            <div className="mt-3 text-[11px] text-neutral-400">
              Save history, see longer-term trends, and get smarter recommendations.
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-black text-neutral-900">Example signals you’ll track</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-neutral-700">
            <div className="rounded-2xl bg-neutral-50 border border-neutral-200 px-3 py-2">
              Added sugar
            </div>
            <div className="rounded-2xl bg-neutral-50 border border-neutral-200 px-3 py-2">
              Many additives
            </div>
            <div className="rounded-2xl bg-neutral-50 border border-neutral-200 px-3 py-2">
              High sodium
            </div>
            <div className="rounded-2xl bg-neutral-50 border border-neutral-200 px-3 py-2">
              Ultra-processed
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-black text-neutral-900">Why this matters</div>
          <div className="mt-2 text-sm text-neutral-600">
            We don’t explain labels. We judge them — and show what you keep running into.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Insights logic ---------------- */

function buildInsights(scans: ScanRecord[]) {
  const counts = { good: 0, caution: 0, avoid: 0 } as Record<ScanResult, number>;
  const riskCount = new Map<string, number>();

  for (const s of scans) {
    counts[s.result] += 1;
    for (const t of s.riskTags ?? []) riskCount.set(t, (riskCount.get(t) ?? 0) + 1);
  }

  const mostly: ScanResult =
    counts.good >= counts.caution && counts.good >= counts.avoid
      ? "good"
      : counts.caution >= counts.avoid
      ? "caution"
      : "avoid";

  const riskSignals = Array.from(riskCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, count]) => ({ tag, count }));

  const topRiskLabel = riskSignals[0]?.tag ? shortRiskLabel(riskSignals[0].tag) : null;

  let headline = "Mostly good choices 👍";
  let subline = "Keep it up — your recent scans look generally clean.";

  if (mostly === "caution") {
    headline = "Mostly okay — a few watch-outs";
    subline = "Some items show higher sugar / processing. Easy wins with swaps.";
  }
  if (mostly === "avoid") {
    headline = "Too many avoid items lately";
    subline = "You’re scanning more ultra-processed foods. Swaps will help fast.";
  }

  const patterns: string[] = [];
  patterns.push(mostly === "good" ? "Mostly Good" : mostly === "caution" ? "Mixed choices" : "More Avoid items");
  if (counts.avoid > 0) patterns.push("Avoid items show up sometimes");
  if (riskSignals[0]) patterns.push(`Top signal: ${humanizeRiskTag(riskSignals[0].tag)}`);

  const suggestions: string[] = [];
  const top = riskSignals[0]?.tag;

  if (!top) {
    suggestions.push("Scan a few more foods to unlock stronger patterns.");
    suggestions.push("Use Recs to swap one snack at a time.");
  } else {
    if (top.includes("sugar")) suggestions.push("Try choosing lower-sugar snacks more often.");
    else if (top.includes("oil")) suggestions.push("Look for snacks with better oils (less refined).");
    else if (top.includes("additive")) suggestions.push("Pick options with fewer additives and flavorings.");
    else if (top.includes("processed")) suggestions.push("Swap one ultra-processed item this week.");
    else suggestions.push("Use Recs to swap your most frequent snack category.");

    suggestions.push("One small swap per week is enough to improve trends.");
  }

  return {
    mostly,
    counts,
    headline,
    subline,
    topRiskLabel,
    patterns: dedupe(patterns).slice(0, 3),
    riskSignals,
    suggestions: suggestions.slice(0, 2),
  };
}

function dedupe(arr: string[]) {
  return Array.from(new Set(arr));
}

function labelVerdict(v: ScanResult) {
  return v === "good" ? "Good" : v === "caution" ? "Caution" : "Avoid";
}

function humanizeRiskTag(tag: string) {
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

function shortRiskLabel(tag: string) {
  const map: Record<string, string> = {
    added_sugar: "Sugar",
    high_sodium: "Sodium",
    refined_oils: "Oils",
    refined_carbs: "Carbs",
    many_additives: "Additives",
    ultra_processed: "Processed",
    low_fiber: "Fiber",
    low_protein: "Protein",
  };
  return map[tag] ?? "Risk";
}
