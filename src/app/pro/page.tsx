"use client";

export default function Pro() {
  async function go() {
    const r = await fetch("/api/stripe/checkout", { method: "POST" });
    const j = await r.json();
    window.location.href = j.url;
  }

  return (
    <div>
      <h2>Upgrade to Pro</h2>
      <button onClick={go}>Subscribe</button>
    </div>
  );
}