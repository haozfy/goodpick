"use client";

import { useEffect, useState } from "react";

type Stored = {
  input: string;
  data: {
    title?: string;
    score?: number;
    summary?: string;
    tips?: string[];
  };
  t: number;
};

export default function ResultPage() {
  const [item, setItem] = useState<Stored | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("goodpick_last_result_v1");
    if (!raw) return;
    try {
      setItem(JSON.parse(raw));
    } catch {}
  }, []);

  if (!item) {
    return (
      <div style={{ maxWidth: 720, margin: "60px auto", padding: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Result</h1>
        <p style={{ marginTop: 12, opacity: 0.7 }}>没有找到结果。回首页先跑一次分析。</p>
        <a href="/">Back</a>
      </div>
    );
  }

  const { input, data } = item;

  return (
    <div style={{ maxWidth: 720, margin: "60px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Result</h1>
        <a href="/">New</a>
      </div>

      <div style={{ marginTop: 12, fontSize: 13, opacity: 0.7 }}>Input: {input}</div>

      <div style={{ marginTop: 18, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{data.title ?? "Untitled"}</div>
        {typeof data.score === "number" && (
          <div style={{ marginTop: 6, fontSize: 14 }}>
            Score: <b>{data.score}</b>
          </div>
        )}
        {data.summary && <p style={{ marginTop: 10, lineHeight: 1.6 }}>{data.summary}</p>}
        {data.tips?.length ? (
          <ul style={{ marginTop: 10, paddingLeft: 18 }}>
            {data.tips.map((t, i) => (
              <li key={i} style={{ marginTop: 6 }}>
                {t}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
        <a
          href="/"
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", display: "inline-block" }}
        >
          Back
        </a>

        {/* 你有 Stripe 的话：把 /checkout 接上 */}
        <a
          href="/checkout"
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", display: "inline-block" }}
        >
          Upgrade (Pro)
        </a>
      </div>
    </div>
  );
}