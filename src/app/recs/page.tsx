"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronRight, ArrowLeft } from "lucide-react";

type RecItem = {
  name: string;
  reason: string;
  price: "$" | "$$" | "$$$";
};

export default function RecsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const scanId = params.get("scanId");

  const [loading, setLoading] = useState(true);
  const [verdict, setVerdict] = useState<"good" | "caution" | "avoid">("good");
  const [analysis, setAnalysis] = useState<string>("");
  const [items, setItems] = useState<RecItem[]>([]);

  useEffect(() => {
    if (!scanId) return;

    (async () => {
      setLoading(true);
      const res = await fetch(`/api/recs?scanId=${scanId}`, {
        cache: "no-store",
      });
      const data = await res.json();

      setVerdict(data.verdict);
      setAnalysis(data.analysis || "");
      setItems(Array.isArray(data.alternatives) ? data.alternatives : []);
      setLoading(false);
    })();
  }, [scanId]);

  if (!scanId) {
    return <Empty msg="Missing scan id." />;
  }

  if (loading) {
    return <Empty msg="Loading recommendations..." />;
  }

  // Good → 空态（刻意的）
  if (verdict === "good") {
    return (
      <PageShell>
        <h1 className="text-2xl font-black text-neutral-900">Good choice 👍</h1>
        <p className="mt-2 text-sm text-neutral-600">
          No swaps needed. This one fits your profile well.
        </p>

        <button
          onClick={() => router.push("/")}
          className="mt-6 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white"
        >
          Scan another
        </button>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* 顶部缓冲判断 */}
      <h1 className="text-2xl font-black text-neutral-900">
        {verdict === "avoid"
          ? "Better to skip this one"
          : "Not ideal — easy to improve"}
      </h1>

      <p className="mt-2 text-sm text-neutral-600">{analysis}</p>

      {/* 替代品 */}
      <div className="mt-6 space-y-4">
        {items.slice(0, 3).map((item, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="font-bold text-neutral-900">{item.name}</div>
              <div className="text-xs font-bold text-neutral-500">
                {item.price}
              </div>
            </div>
            <div className="mt-1 text-sm text-neutral-600">
              {item.reason}
            </div>
          </div>
        ))}
      </div>

      {/* 底部提示 */}
      <div className="mt-6 text-xs text-neutral-500">
        Small swaps like this improve your overall profile.
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm font-bold text-neutral-600"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600"
        >
          Scan another <ChevronRight size={14} />
        </button>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-neutral-50 px-6 pt-14 pb-24">
      <div className="mx-auto max-w-md">{children}</div>
    </main>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center text-sm text-neutral-500">
      {msg}
    </main>
  );
}
