"use client";

export default function ProPage() {
  async function go(plan: "monthly" | "yearly") {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const j = await res.json();
    window.location.href = j.url;
  }

  return (
    <main style={{ maxWidth: 520, margin: "48px auto", padding: 16 }}>
      <h1>Pro</h1>
      <button onClick={() => go("monthly")} style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(0,0,0,.2)", marginRight: 10 }}>
        Subscribe Monthly
      </button>
      <button onClick={() => go("yearly")} style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(0,0,0,.2)" }}>
        Subscribe Yearly
      </button>
    </main>
  );
}