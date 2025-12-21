// src/app/page.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type AnalyzeResult = {
  score: number;
  label: "Excellent" | "Good" | "Poor" | "Bad";
  negatives: { name: string; valueText: string; hint: string; level: "low" | "mid" | "high" }[];
  positives: { name: string; valueText: string; hint: string }[];
};

function scoreLabel(score: number): AnalyzeResult["label"] {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Poor";
  return "Bad";
}

function scoreDotClass(label: AnalyzeResult["label"]) {
  switch (label) {
    case "Excellent":
      return "bg-green-500";
    case "Good":
      return "bg-emerald-500";
    case "Poor":
      return "bg-orange-500";
    case "Bad":
      return "bg-red-500";
  }
}

function levelPill(level: "low" | "mid" | "high") {
  if (level === "low") return "bg-green-100 text-green-700";
  if (level === "mid") return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

export default function HomePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const label = useMemo(() => (result ? scoreLabel(result.score) : null), [result]);

  const onPick = (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setResult(null);
    setError(null);
  };

  const analyze = async () => {
    if (!imageUrl || busy) return;

    setBusy(true);
    setError(null);

    try {
      // ✅ 用真实 API（你后端要返回：{ ok: true, result } 或 { ok:false, code:"NEED_LOGIN"/"NEED_UPGRADE" }
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      // ✅ 统一门控：未登录 -> 去登录；次数用完 -> 去升级页
      if (res.status === 401 || res.status === 403) {
        router.push(`/login?next=${encodeURIComponent("/")}`);
        return;
      }
      if (res.status === 402) {
        router.push(`/pro?reason=limit`);
        return;
      }

      const data = await res.json().catch(() => null);

      if (!data?.ok) {
        if (data?.code === "NEED_LOGIN") {
          router.push(`/login?next=${encodeURIComponent("/")}`);
          return;
        }
        if (data?.code === "NEED_UPGRADE") {
          router.push(`/pro?reason=limit`);
          return;
        }
        setError("Analyze failed. Please try again.");
        return;
      }

      setResult(data.result as AnalyzeResult);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4">
      {/* Scan */}
      <section className="rounded-2xl border border-neutral-200 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Scan & Analyze</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Take a photo of the nutrition label / ingredients.
            </p>
          </div>

          <button
            onClick={() => {
              setImageUrl(null);
              setResult(null);
              setError(null);
            }}
            className="text-sm text-neutral-500 hover:text-black"
          >
            Reset
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] ?? undefined)}
          />

          {!imageUrl ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex h-44 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-700 hover:border-neutral-400"
            >
              <div className="text-3xl">📷</div>
              <div className="mt-2 text-sm font-medium">Take a photo</div>
              <div className="mt-1 text-xs text-neutral-500">Best: straight, bright, full label</div>
            </button>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="preview" className="h-56 w-full object-cover" />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="h-11 flex-1 rounded-xl border border-neutral-200 px-4 text-sm hover:border-neutral-400"
            >
              {imageUrl ? "Retake" : "Choose photo"}
            </button>

            <button
              onClick={analyze}
              disabled={!imageUrl || busy}
              className="h-11 flex-1 rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-40"
            >
              {busy ? "Analyzing…" : "Analyze"}
            </button>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          {/* ✅ 如果你想要“免费 3 次”的提示文案，先放 UI，后端返回剩余次数时再替换 */}
          <div className="text-xs text-neutral-500">
            Free plan: 3 scans. Upgrade for unlimited.
          </div>
        </div>
      </section>

      {/* Result */}
      {result && (
        <section className="rounded-2xl border border-neutral-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${scoreDotClass(result.label)}`} />
              <div className="text-sm font-semibold">{label}</div>
            </div>
            <div className="text-sm text-neutral-500">{result.score}/100</div>
          </div>

          <div className="mt-4 space-y-6">
            <div>
              <div className="mb-2 text-sm font-semibold">Negatives</div>
              <div className="space-y-3">
                {result.negatives.map((n) => (
                  <div key={n.name} className="rounded-xl border border-neutral-200 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{n.name}</div>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${levelPill(n.level)}`}>
                        {n.level.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">{n.hint}</div>
                    <div className="mt-2 text-xs text-neutral-600">{n.valueText}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold">Positives</div>
              <div className="space-y-3">
                {result.positives.map((p) => (
                  <div key={p.name} className="rounded-xl border border-neutral-200 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-neutral-600">{p.valueText}</div>
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">{p.hint}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}