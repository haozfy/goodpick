// app/recs/recs-client.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  TriangleAlert,
  Ban,
} from "lucide-react";

type Verdict = "good" | "caution" | "avoid";

type RecItem = {
  name: string;
  reason: string;
  price?: string;
};

export default function RecsClient() {
  const params = useSearchParams();
  const router = useRouter();

  // 兼容你之前写过的 scan / scanId 两种参数名
  const scanId = params.get("scanId") || params.get("scan");

  const [loading, setLoading] = useState(true);
  const [verdict, setVerdict] = useState<Verdict>("good");
  const [analysis, setAnalysis] = useState("");
  const [items, setItems] = useState<RecItem[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!scanId) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        const res = await fetch(`/api/recs?scanId=${scanId}`, { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) {
          setVerdict("good");
          setAnalysis("");
          setItems([]);
          setErrorMsg(data?.error || "Failed to load recommendations.");
          return;
        }

        setVerdict((data.verdict || "good") as Verdict);
        setAnalysis(data.analysis || "");
        setItems(Array.isArray(data.alternatives) ? data.alternatives : []);
      } catch (e: any) {
        setErrorMsg(e?.message || "Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, [scanId]);

  const header = useMemo(() => getHeader(verdict), [verdict]);

  if (loading) return <Shell><HintCard title="Loading" desc="Fetching cleaner options…" /></Shell>;

  if (!scanId) {
    return (
      <Shell>
        <Hero title="Recommendations" subtitle="Scan a product first — then we’ll suggest cleaner swaps." />
        <PrimaryButton onClick={() => router.push("/")}>Go scan</PrimaryButton>
      </Shell>
    );
  }

  if (errorMsg) {
    return (
      <Shell>
        <Hero title="Recommendations" subtitle="Something went wrong." />
        <HintCard title="Error" desc={errorMsg} />
        <div className="mt-6 flex justify-between">
          <GhostButton onClick={() => router.back()}>
            <ArrowLeft size={14} /> Back
          </GhostButton>
          <PrimaryButton onClick={() => router.push("/")}>Scan another</PrimaryButton>
        </div>
      </Shell>
    );
  }

  // 如果 good：我们就“克制地”告诉你不需要替代
  if (verdict === "good") {
    return (
      <Shell>
        <Hero title="Good choice 👍" subtitle="No swaps needed. This one fits your profile well." />
        <div className="mt-6 flex justify-between">
          <GhostButton onClick={() => router.back()}>
            <ArrowLeft size={14} /> Back
          </GhostButton>
          <PrimaryButton onClick={() => router.push("/")}>
            Scan another <ChevronRight size={14} />
          </PrimaryButton>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* 顶部“产品级”判断卡 */}
      <div className="relative overflow-hidden rounded-[28px] bg-neutral-900 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
            <Sparkles size={14} className="text-yellow-300" />
            Smart swaps
          </div>

          <div className="mt-4 text-2xl font-black leading-tight">
            {header.title}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <VerdictPill verdict={verdict} />
            <div className="text-xs text-white/70">
              Choose 1 swap. Your profile improves immediately.
            </div>
          </div>

          {analysis ? (
            <div className="mt-4 rounded-2xl bg-white/10 p-4 text-sm text-white/90">
              {analysis}
            </div>
          ) : null}
        </div>

        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-teal-400/10 blur-3xl" />
      </div>

      {/* 推荐列表：控制在 2-3 个 */}
      <div className="mt-6">
        <div className="text-sm font-bold text-neutral-900">Cleaner alternatives</div>
        <div className="mt-3 space-y-4">
          {items.slice(0, 3).map((item, idx) => (
            <RecCard
              key={idx}
              idx={idx}
              name={item.name}
              reason={item.reason}
              price={item.price}
              onPick={() => {
                // 这里先不做复杂的“收藏”，只给用户一个“选定动作”的完成感
                // 未来要做：写入 picks 表 或 scan_actions 表（Pro）
                router.push("/dashboard");
              }}
            />
          ))}

          {items.length === 0 ? (
            <HintCard
              title="No alternatives returned"
              desc="Improve your analyze prompt to always return 2–3 swaps for caution/avoid."
            />
          ) : null}
        </div>
      </div>

      {/* 底部动作：回去 or 继续扫 */}
      <div className="mt-8 flex justify-between">
        <GhostButton onClick={() => router.back()}>
          <ArrowLeft size={14} /> Back
        </GhostButton>
        <PrimaryButton onClick={() => router.push("/")}>
          Scan another <ChevronRight size={14} />
        </PrimaryButton>
      </div>

      <div className="mt-6 text-xs text-neutral-500">
        Tip: One small swap per week is enough to change your trend.
      </div>

      <div className="h-16" />
    </Shell>
  );
}

/* ---------------- UI bits ---------------- */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-neutral-50 px-6 pt-14 pb-28">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </main>
  );
}

function Hero({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <div className="text-3xl font-black text-neutral-900">{title}</div>
      {subtitle ? <div className="mt-2 text-sm text-neutral-600">{subtitle}</div> : null}
    </div>
  );
}

function HintCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mt-6 rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-neutral-100">
      <div className="text-sm font-bold text-neutral-900">{title}</div>
      <div className="mt-1 text-sm text-neutral-600">{desc}</div>
    </div>
  );
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white shadow-sm active:scale-95 transition-transform"
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-neutral-700 shadow-sm ring-1 ring-neutral-100 hover:bg-neutral-50 active:scale-95 transition-transform"
    >
      {children}
    </button>
  );
}

function VerdictPill({ verdict }: { verdict: Verdict }) {
  const cfg =
    verdict === "avoid"
      ? { icon: <Ban size={14} />, text: "Avoid", cls: "bg-rose-500/20 text-rose-200 ring-rose-400/30" }
      : { icon: <TriangleAlert size={14} />, text: "Caution", cls: "bg-amber-500/20 text-amber-100 ring-amber-400/30" };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ring-1 ${cfg.cls}`}>
      {cfg.icon}
      {cfg.text}
    </span>
  );
}

function RecCard({
  idx,
  name,
  reason,
  price,
  onPick,
}: {
  idx: number;
  name: string;
  reason: string;
  price?: string;
  onPick: () => void;
}) {
  return (
    <button
      onClick={onPick}
      className="w-full text-left rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-neutral-100 hover:ring-emerald-200 transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 text-xs font-black ring-1 ring-emerald-100">
              {idx + 1}
            </span>
            <div className="font-black text-neutral-900 truncate">{name}</div>
          </div>

          <div className="mt-2 flex items-start gap-2">
            <div className="mt-0.5 rounded-xl bg-neutral-100 p-2">
              <ShieldCheck className="h-4 w-4 text-neutral-700" />
            </div>
            <div className="text-sm text-neutral-600">{reason}</div>
          </div>
        </div>

        {price ? (
          <div className="shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600">
            {price}
          </div>
        ) : null}
      </div>

      <div className="mt-4 inline-flex items-center gap-1 text-sm font-black text-emerald-600">
        Pick this swap <ChevronRight size={16} />
      </div>
    </button>
  );
}

function getHeader(verdict: Verdict) {
  if (verdict === "avoid") {
    return {
      title: "Skip this one — swap once and you’ll improve fast.",
    };
  }
  return {
    title: "Mostly okay — a cleaner swap will make this solid.",
  };
}