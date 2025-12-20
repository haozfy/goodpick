"use client";

import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await getUser();
      if (!u) window.location.href = "/login";
    })();
  }, []);

  async function go(plan: "monthly" | "yearly") {
    setLoading(true);
    try {
      const r = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? "checkout failed");
      window.location.href = data.url;
    } catch (e) {
      alert((e as any)?.message ?? "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "60px auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Upgrade</h1>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <button disabled={loading} onClick={() => go("monthly")} style={{ padding: 12, borderRadius: 10 }}>
          Monthly Pro
        </button>
        <button disabled={loading} onClick={() => go("yearly")} style={{ padding: 12, borderRadius: 10 }}>
          Yearly Pro
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <a href="/">Back</a>
      </div>
    </div>
  );
}