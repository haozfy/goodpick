"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Result = {
  score?: number;
  label?: string;
  negatives?: { name: string; valueText?: string; hint?: string; level?: "low" | "mid" | "high" }[];
  positives?: { name: string; valueText?: string; hint?: string }[];
};

function pill(level?: string) {
  if (level === "low") return "bg-green-100 text-green-700";
  if (level === "mid") return "bg-orange-100 text-orange-700";
  if (level === "high") return "bg-red-100 text-red-700";
  return "bg-neutral-100 text-neutral-700";
}

export default function ResultPage() {
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("gp_last_result");
    if (raw) setData(JSON.parse(raw));
  }, []);

  const label = useMemo(() => data?.label || (data?.score != null ? `${data.score}/100` : "Result"), [data]);

  if (!data) {
    return (
      <main className="space-y-4">
        <div className="rounded-2xl border border-neutral-200 p-4">
          <div className="text-sm text-neutral-600">No result yet.</div>
          <Link className="mt-3 inline-block text-sm text-black underline" href="/">
            Go back
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-4">
      <section className="rounded-2xl border border-neutral-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">{label}</div>
          {data.score != null && <div className="text-sm text-neutral-500">{data.score}/100</div>}
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 p-4 shadow-sm">
        <div className="mb-2 text-sm font-semibold">Negatives</div>
        <div className="space-y-3">
          {(data.negatives || []).map((n, i) => (
            <div key={i} className="rounded-xl border border-neutral-200 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{n.name}</div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${pill(n.level)}`}>
                  {(n.level || "mid").toUpperCase()}
                </span>
              </div>
              {n.hint && <div className="mt-1 text-xs text-neutral-500">{n.hint}</div>}
              {n.valueText && <div className="mt-2 text-xs text-neutral-600">{n.valueText}</div>}
            </div>
          ))}
          {(data.negatives || []).length === 0 && <div className="text-sm text-neutral-500">None</div>}
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 p-4 shadow-sm">
        <div className="mb-2 text-sm font-semibold">Positives</div>
        <div className="space-y-3">
          {(data.positives || []).map((p, i) => (
            <div key={i} className="rounded-xl border border-neutral-200 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{p.name}</div>
                {p.valueText && <div className="text-xs text-neutral-600">{p.valueText}</div>}
              </div>
              {p.hint && <div className="mt-1 text-xs text-neutral-500">{p.hint}</div>}
            </div>
          ))}
          {(data.positives || []).length === 0 && <div className="text-sm text-neutral-500">None</div>}
        </div>
      </section>

      <Link className="block text-center text-sm text-black underline" href="/">
        Scan another
      </Link>
    </main>
  );
}