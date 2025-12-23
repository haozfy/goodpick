"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight, Sparkles, ShieldCheck, Ban, TriangleAlert } from "lucide-react";

type Verdict = "good" | "caution" | "avoid";
type RecItem = { name: string; reason: string; price?: string };

export default function RecsClient() {
  const router = useRouter();
  const params = useSearchParams();

  const scanIdFromUrl = params.get("scanId") || params.get("scan");
  const [scanId, setScanId] = useState<string | null>(scanIdFromUrl);

  // ✅ 解决闪屏：把“找 scanId”和“拉 recs”拆开
  const [bootLoading, setBootLoading] = useState(true);
  const [recsLoading, setRecsLoading] = useState(false);
  const loading = bootLoading || recsLoading;

  const [verdict, setVerdict] = useState<Verdict>("good");
  const [analysis, setAnalysis] = useState("");
  const [productName, setProductName] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [items, setItems] = useState<RecItem[]>([]);
  const [error, setError] = useState<string>("");

  // ✅ 新增：从 /api/recs 返回的用户偏好标签
  const [prefLabels, setPrefLabels] = useState<string[]>([]);

  // 1) 初始化 scanId：URL 优先，否则取 last-scan
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setError("");

      if (scanIdFromUrl) {
        setScanId(scanIdFromUrl);
        setBootLoading(false);
        return;
      }

      try {
        setBootLoading(true);
        const res = await fetch("/api/last-scan", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) {
          if (!cancelled) {
            setScanId(null);
            setError(data?.error || "No scans yet.");
          }
          return;
        }

        if (!cancelled) setScanId(data.scan.id);
      } catch (e: any) {
        if (!cancelled) {
          setScanId(null);
          setError(e?.message || "Failed to load your latest scan.");
        }
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scanIdFromUrl]);

  // 2) 拉 recs（现在 /api/recs 会按用户偏好过滤/排序，并返回 preferences 标签）
  useEffect(() => {
    if (!scanId) return;

    let cancelled = false;

    (async () => {
      try {
        setRecsLoading(true);
        setError("");

        const res = await fetch(`/api/recs?scanId=${encodeURIComponent(scanId)}`, { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) throw new Error(data?.error || "Failed to load recs.");
        if (cancelled) return;

        setVerdict((data.verdict as Verdict) || "good");
        setAnalysis(data.analysis || "");
        setProductName(data.productName || "");
        setScore(typeof data.score === "number" ? data.score : null);
        setItems(Array.isArray(data.alternatives) ? data.alternatives : []);

        // ✅ 新增：显示 “Personalized for …”
        setPrefLabels(Array.isArray(data.preferences) ? data.preferences : []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load recommendations.");
      } finally {
        if (!cancelled) setRecsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scanId]);

  const header = useMemo(() => {
    if (verdict === "avoid") return "Skip it. Swap once to improve fast.";
    if (verdict === "caution") return "Not ideal. A cleaner swap makes it solid.";
    return "Good choice 👍";
  }, [verdict]);

  if (loading) {
    return (
      <Shell>
        <Card>
          <div className="text-sm text-neutral-500">Loading recommendations…</div>
        </Card>
      </Shell>
    );
  }

  // ✅ 没扫过 / 没登录 / last-scan 失败
  if (!scanId) {
    return (
      <Shell>
        <Title title="Recommendations" sub={error || "Scan a product first — then you’ll get swaps here."} />
        <Primary onClick={() => router.push("/")}>Go scan</Primary>
      </Shell>
    );
  }

  // ✅ 拉取 recs 出错
  if (error) {
    return (
      <Shell>
        <Title title="Recommendations" sub="Couldn’t load this scan." />
        <Card>
          <div className="text-sm text-rose-600">{error}</div>
          <div className="mt-2 text-xs text-neutral-500">scanId: {scanId}</div>
        </Card>
        <Row>
          <Ghost onClick={() => router.back()}><ArrowLeft size={14}/> Back</Ghost>
          <Primary onClick={() => router.push("/")}>Scan another <ChevronRight size={14}/></Primary>
        </Row>
      </Shell>
    );
  }

  // ✅ Good 不显示替代
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
      <div className="relative overflow-hidden rounded-[28px] bg-neutral-900 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black">
            <Sparkles size={14} className="text-yellow-300" />
            Smart swaps
          </div>

          <div className="mt-4 text-2xl font-black leading-tight">{header}</div>

          <div className="mt-2 flex items-center gap-2">
            <Pill verdict={verdict} />
            {score !== null ? <span className="text-xs text-white/70">Score {score}</span> : null}
          </div>

          {/* ✅ 个性化标签（可选显示） */}
          {prefLabels.length ? (
            <div className="mt-2 text-xs text-white/70">
              Personalized for: {prefLabels.join(" · ")}
            </div>
          ) : null}

          <div className="mt-3 text-sm text-white/85">
            <span className="font-bold">{productName ? `${productName}: ` : ""}</span>
            {analysis || "Here are cleaner options in the same category."}
          </div>
        </div>

        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-teal-400/10 blur-3xl" />
      </div>

      <div className="mt-6">
        <div className="text-sm font-black text-neutral-900">Cleaner alternatives</div>

        {/* ✅ 如果你更想把 personalized 放到这里也可以（现在在 header 里） */}
        {/* {prefLabels.length ? (
          <div className="mt-1 text-xs text-neutral-500">
            Personalized for: {prefLabels.join(" · ")}
          </div>
        ) : null} */}

        <div className="mt-3 space-y-4">
          {(items.length ? items : fallbackRecs(verdict)).slice(0, 3).map((it, idx) => (
            <div key={idx} className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-neutral-100">
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
            </div>
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

/* ---------- UI helpers ---------- */

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

function fallbackRecs(verdict: Verdict): RecItem[] {
  if (verdict === "avoid") {
    return [
      { name: "Whole-grain crackers", reason: "More fiber and less refined flour; usually fewer additives." },
      { name: "Plain popcorn", reason: "Simple ingredients and lower sugar; easy swap for crunch." },
      { name: "Nuts (unsalted)", reason: "Better fats and more satiety; avoids refined carbs." },
    ];
  }
  return [
    { name: "Lower-sugar option (same category)", reason: "Same vibe, less sugar load." },
    { name: "Short ingredient list option", reason: "Fewer additives and flavorings." },
    { name: "Higher-fiber pick", reason: "More stable energy and fullness." },
  ];
}
