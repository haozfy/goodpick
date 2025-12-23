"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2 } from "lucide-react";

type Prefs = {
  low_sodium: boolean;
  low_sugar: boolean;
  low_cholesterol: boolean;
  avoid_sweeteners: boolean;
  prefer_simple_ingredients: boolean;
};

const DEFAULT_PREFS: Prefs = {
  low_sodium: false,
  low_sugar: false,
  low_cholesterol: false,
  avoid_sweeteners: false,
  prefer_simple_ingredients: false,
};

export default function SettingsClient() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof Prefs | null>(null);
  const [error, setError] = useState<string>("");
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  const activeLabel = useMemo(() => {
    const on: string[] = [];
    if (prefs.low_sodium) on.push("Low sodium");
    if (prefs.low_sugar) on.push("Low sugar");
    if (prefs.low_cholesterol) on.push("Low cholesterol");
    if (prefs.avoid_sweeteners) on.push("No sweeteners");
    if (prefs.prefer_simple_ingredients) on.push("Simple ingredients");
    return on.length ? on.join(" · ") : "No preferences set";
  }, [prefs]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/preferences", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load preferences.");
        if (!cancelled) setPrefs({ ...DEFAULT_PREFS, ...(data.preferences || {}) });
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load preferences.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(key: keyof Prefs) {
    const next = { ...prefs, [key]: !prefs[key] };

    // 体验细节：不吃甜味剂是“硬偏好”，开了可以把 sugar 的意义弱一点，但这里先不强制联动
    setPrefs(next);
    setSavingKey(key);
    setError("");

    try {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save.");
      setPrefs({ ...DEFAULT_PREFS, ...(data.preferences || {}) });
    } catch (e: any) {
      // 回滚
      setPrefs(prefs);
      setError(e?.message || "Save failed.");
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return (
      <Shell>
        <Title title="App Settings" sub="Diet preferences" />
        <Card>
          <div className="text-sm text-neutral-500 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-neutral-700 shadow-sm ring-1 ring-neutral-100 hover:bg-neutral-50 active:scale-95 transition-transform"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="text-xs text-neutral-500">{activeLabel}</div>
      </div>

      <Title title="App Settings" sub="Diet preferences (used to personalize scores & swaps)" />

      {error ? (
        <Card>
          <div className="text-sm text-rose-600">{error}</div>
        </Card>
      ) : null}

      <Card>
        <div className="space-y-3">
          <PrefRow
            title="Low sodium"
            desc="Prioritize lower-salt options."
            on={prefs.low_sodium}
            saving={savingKey === "low_sodium"}
            onToggle={() => toggle("low_sodium")}
          />
          <PrefRow
            title="Low sugar"
            desc="Stricter scoring on added sugars."
            on={prefs.low_sugar}
            saving={savingKey === "low_sugar"}
            onToggle={() => toggle("low_sugar")}
          />
          <PrefRow
            title="Low cholesterol"
            desc="Prefer lower-cholesterol animal products."
            on={prefs.low_cholesterol}
            saving={savingKey === "low_cholesterol"}
            onToggle={() => toggle("low_cholesterol")}
          />
          <PrefRow
            title="Avoid sweeteners"
            desc="Flag products with sweeteners."
            on={prefs.avoid_sweeteners}
            saving={savingKey === "avoid_sweeteners"}
            onToggle={() => toggle("avoid_sweeteners")}
            emphasis
          />
          <PrefRow
            title="Simple ingredients"
            desc="Prefer shorter ingredient lists."
            on={prefs.prefer_simple_ingredients}
            saving={savingKey === "prefer_simple_ingredients"}
            onToggle={() => toggle("prefer_simple_ingredients")}
          />
        </div>

        <div className="mt-4 text-xs text-neutral-500">
          Tip: keep it simple — one preference is enough to personalize your swaps.
        </div>
      </Card>
    </Shell>
  );
}

function PrefRow({
  title,
  desc,
  on,
  saving,
  onToggle,
  emphasis,
}: {
  title: string;
  desc: string;
  on: boolean;
  saving: boolean;
  onToggle: () => void;
  emphasis?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full rounded-[20px] p-4 text-left ring-1 transition active:scale-[0.99]
      ${on ? "bg-neutral-900 text-white ring-neutral-900" : "bg-neutral-50 text-neutral-900 ring-neutral-100"}
      ${emphasis && on ? "shadow-[0_0_0_2px_rgba(16,185,129,0.25)]" : ""}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black">{title}</div>
          <div className={`mt-1 text-xs ${on ? "text-white/75" : "text-neutral-500"}`}>{desc}</div>
        </div>

        <div className="shrink-0">
          {saving ? (
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${on ? "bg-white/10" : "bg-white"}`}>
              <Loader2 className={`h-3.5 w-3.5 animate-spin ${on ? "text-white" : "text-neutral-700"}`} />
              Saving
            </span>
          ) : on ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-black">
              <Check size={14} /> On
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-black text-neutral-700 ring-1 ring-neutral-100">
              Off
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-neutral-50 px-6 pt-10 pb-28">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </main>
  );
}

function Title({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mt-6">
      <div className="text-3xl font-black text-neutral-900">{title}</div>
      {sub ? <div className="mt-2 text-sm text-neutral-600">{sub}</div> : null}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-neutral-100">{children}</div>;
}
