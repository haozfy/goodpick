"use client";

import { useEffect, useState } from "react";
import { scoreLabel } from "@/lib/score";

export default function ResultPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("lastResult");
    if (raw) setData(JSON.parse(raw));
  }, []);

  if (!data) return <p style={{ padding: 24 }}>No result</p>;

  const badge = scoreLabel(data.score);

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: 24 }}>
      <h2>{data.product_name}</h2>

      <div
        style={{
          marginTop: 12,
          padding: 16,
          borderRadius: 12,
          background: badge.color,
          color: "#fff",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 32 }}>{data.score}</div>
        <div>{badge.label}</div>
      </div>

      <section style={{ marginTop: 24 }}>
        <h4>Why</h4>
        <ul>
          {data.notes_free.map((x: string) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 16, opacity: 0.6 }}>
        <h4>Pro insights</h4>
        <ul>
          {data.notes_pro.map((x: string) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <p style={{ marginTop: 8 }}>🔒 Upgrade to unlock full analysis</p>
      </section>
    </main>
  );
}