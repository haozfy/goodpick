"use client";

import { useEffect, useState } from "react";
import { canUseFreeTrial, consumeFreeTrial, getTrialLeft } from "@/lib/trial";
import { getUser } from "@/lib/auth";

type AnalyzeResult = {
  title?: string;
  score?: number;
  summary?: string;
  tips?: string[];
};

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [left, setLeft] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLeft(getTrialLeft());
    (async () => {
      const u = await getUser();
      setUserEmail(u?.email ?? null);
    })();
  }, []);

  async function onAnalyze() {
    setErr(null);

    // ✅ 已登录：不走试用限制（你也可以改成“登录后再给 3 次”，但先按最简单）
    const u = await getUser();
    if (!u) {
      // ✅ 未登录：先走免费次数
      if (!canUseFreeTrial()) {
        window.location.href = "/login";
        return;
      }
      consumeFreeTrial();
      setLeft(getTrialLeft());
    }

    setLoading(true);
    try {
      // 你如果已有 /api/analyze，就保持这个接口
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!r.ok) throw new Error(`Analyze failed: ${r.status}`);
      const data = (await r.json()) as AnalyzeResult;

      // ✅ 结果放 localStorage，result 页直接读，不需要 cookie / session
      localStorage.setItem("goodpick_last_result_v1", JSON.stringify({ input: url, data, t: Date.now() }));
      window.location.href = "/result";
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "60px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Goodpick</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {userEmail ? (
            <>
              <span style={{ fontSize: 13, opacity: 0.7 }}>{userEmail}</span>
              <a href="/logout">Logout</a>
            </>
          ) : (
            <a href="/login">Login</a>
          )}
        </div>
      </div>

      {!userEmail && (
        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
          免费试用剩余：<b>{left}</b>/3
        </div>
      )}

      <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste product URL / barcode page / anything"
          style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
        />
        <button
          onClick={onAnalyze}
          disabled={!url || loading}
          style={{ padding: "12px 16px", borderRadius: 10, border: "1px solid #ddd" }}
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {err && <div style={{ marginTop: 12, color: "crimson" }}>{err}</div>}
    </div>
  );
}