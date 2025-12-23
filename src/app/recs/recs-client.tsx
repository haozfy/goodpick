"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight, Sparkles, ShieldCheck, Ban, TriangleAlert } from "lucide-react";

type Verdict = "good" | "caution" | "avoid";
type RecItem = { name: string; reason: string; price?: string };

export default function RecsClient() {
  const router = useRouter();
  const params = useSearchParams();
  const scanId = params.get("scanId") || params.get("scan");

  const [loading, setLoading] = useState(true);
  const [verdict, setVerdict] = useState<Verdict>("good");
  const [analysis, setAnalysis] = useState("");
  const [productName, setProductName] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [items, setItems] = useState<RecItem[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!scanId) { setLoading(false); return; }
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/recs?scanId=${scanId}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load recs");

        setVerdict(data.verdict);
        setAnalysis(data.analysis || "");
        setProductName(data.productName || "");
        setScore(typeof data.score === "number" ? data.score : null);
        setItems(Array.isArray(data.alternatives) ? data.alternatives : []);
      } catch (e: any) {
        setError(e.message || "Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, [scanId]);

  const header = useMemo(() => {
    if (verdict === "avoid") return { title: "Skip it. Swap once to improve fast.", pill: "Avoid" };
    if (verdict === "caution") return { title: "Not ideal. A cleaner swap makes it solid.", pill: "Caution" };
    return { title: "Good choice 👍", pill: "Good" };
  }, [verdict]);

  if (loading) return <Shell><Card><div className="text-sm text-neutral-500">Loading…</div></Card></Shell>;

  if (!scanId) {
    return (
      <Shell>
        <Title title="Recommendations" sub="Scan a product first — then you’ll get swaps here." />
        <Primary onClick={() => router.push("/")}>Go scan</Primary>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <Title title="Recommendations" sub="Couldn’t load this scan." />
        <Card><div className="text-sm text-rose-600">{error}</div></Card>
        <Row>
          <Ghost onClick={() => router.back()}><ArrowLeft size={14}/> Back</Ghost>
          <Primary onClick={() => router.push("/")}>Scan another <ChevronRight size={14}/></Primary>
        </Row>
      </Shell>
    );
  }

  if (verdict === "good") {
    return (
      <Shell>
        <Title title="Good choice 👍" sub="No swaps needed. Keep going." />
        <Row>
          <Ghost onClick={() => router.back()}><ArrowLeft size={14}/> Back</Ghost>
          <Primary onClick={() => router.push("/")}>Scan another <ChevronRight size={14}/></Primary>
        </Row>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* 顶部结论卡：更像产品 */}
      <div className="relative overflow-hidden rounded-[28px] bg-neutral-900 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black">
            <Sparkles size={14} className="text-yellow-300" />
            Smart swaps
          </div>

          <div className="mt-4 text-2xl font-black leading-tight">{header.title}</div>

          <div className="mt-2 flex items-center gap-2">
            <Pill verdict={verdict} />
            {score !== null ? (
              <span className="text-xs text-white/70">Score {score}</span>
            ) : null}
          </div>

          <div className="mt-3 text-sm text-white/85">
            <span className="font-bold">{productName ? `${productName}: ` : ""}</span>
            {analysis || "Here are cleaner options in the same category."}
          </div>
        </div>

        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-teal-400/10 blur-3xl" />
      </div>

      {/* 推荐列表：2-3 个，带“Pick”动作 */}
      <div className="mt-6">
        <div className="text-sm font-black text-neutral-900">Cleaner alternatives</div>
        <div className="mt-3 space-y-4">
          {(items.length ? items : fallbackRecs(verdict)).slice(0, 3).map((it, idx) => (
            <button
              key={idx}
              onClick={() => router.push("/dashboard")}
              className="w-full text-left rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-neutral-100 hover:ring-emerald-200 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-black text-neutral-900 truncate">{it.name}</div>
                  <div className="mt-2 flex items-start gap-2">
                    <div className="mt-0.5 rounded-xl bg-neutral-100 p-2">
                      <ShieldCheck className="h-4 w-4 text-neutral-700" />
                    </div>
                    <div className="text-sm text-neutral-600">{it.reason}</div>
                  </div>
                </div>
                {it.price ? (
                  <span className="shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600">
                    {it.price}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 inline-flex items-center gap-1 text-sm font-black text-emerald-600">
                Pick this swap <ChevronRight size={16} />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 text-xs text-neutral-500">
          Tip: one small swap per week changes your trend.
        </div>
      </div>

      <Row>
        <Ghost onClick={() => router.back()}><ArrowLeft size={14}/> Back</Ghost>
        <Primary onClick={() => router.push("/")}>Scan another <ChevronRight size={14}/></Primary>
      </Row>
      <div className="h-10" />
    </Shell>
  );
}

/* -------- small UI helpers -------- */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-neutral-50 px-6 pt-14 pb-28">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </main>
  );
}

function Title({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <div className="text-3xl font-black text-neutral-900">{title}</div>
      {sub ? <div className="mt-2 text-sm text-neutral-600">{sub}</div> : null}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-neutral-100">{children}</div>;
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="mt-8 flex justify-between">{children}</div>;
}

function Primary({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-black text-white shadow-sm active:scale-95 transition-transform"
    >
      {children}
    </button>
  );
}

function Ghost({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-neutral-700 shadow-sm ring-1 ring-neutral-100 hover:bg-neutral-50 active:scale-95 transition-transform"
    >
      {children}
    </button>
  );
}

function Pill({ verdict }: { verdict: Verdict }) {
  const cfg =
    verdict === "avoid"
      ? { icon: <Ban size={14} />, text: "Avoid", cls: "bg-rose-500/20 text-rose-200 ring-rose-400/30" }
      : { icon: <TriangleAlert size={14} />, text: "Caution", cls: "bg-amber-500/20 text-amber-100 ring-amber-400/30" };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ring-1 ${cfg.cls}`}>
      {cfg.icon}{cfg.text}
    </span>
  );
}

// 如果模型没给 alternatives，给个“类别替代保底”，避免空白难用
function fallbackRecs(verdict: Verdict): RecItem[] {
  if (verdict === "avoid") {
    return [
      { name: "Plain Greek yogurt + fruit", reason: "Lower sugar, higher protein, fewer additives.", price: "$$" },
      { name: "Nuts (unsalted) / nut butter", reason: "Better fats, more satiety, less processed.", price: "$$" },
      { name: "Whole-food snack (banana / apple)", reason: "Natural ingredients, predictable impact.", price: "$" },
    ];
  }
  return [
    { name: "Lower-sugar version (same category)", reason: "Same vibe, less sugar spike.", price: "$" },
    { name: "Short ingredient list option", reason: "Fewer additives and flavorings.", price: "$$" },
    { name: "Whole grain / higher fiber pick", reason: "More stable energy and fullness.", price: "$$" },
  ];
}