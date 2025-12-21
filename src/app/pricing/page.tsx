// src/app/pricing/page.tsx
"use client";

import { useState } from "react";

export default function PricingPage() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const goCheckout = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (!data?.ok || !data?.url) {
        setErr("checkout_failed");
        return;
      }
      window.location.href = data.url;
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Upgrade</h1>

      <div className="rounded-2xl border border-neutral-200 p-4 space-y-2">
        <div className="text-sm text-neutral-600">Free</div>
        <div className="text-lg font-semibold">3 scans</div>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-4 space-y-2">
        <div className="text-sm text-neutral-600">Pro</div>
        <div className="text-lg font-semibold">Unlimited scans</div>
        <div className="text-sm text-neutral-500">Billed monthly.</div>
      </div>

      <button
        onClick={goCheckout}
        disabled={busy}
        className="h-11 w-full rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Redirecting…" : "Upgrade to Pro"}
      </button>

      {err && <div className="text-sm text-red-600">{err}</div>}
    </main>
  );
}