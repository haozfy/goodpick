"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: File) {
    setLoading(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("image", file);

      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "analyze_failed");

      router.push("/result");
    } catch (e: any) {
      setErr(e?.message || "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: "48px auto", padding: 16 }}>
      <h1>Goodpick</h1>

      <button
        onClick={() => ref.current?.click()}
        disabled={loading}
        style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(0,0,0,.2)" }}
      >
        {loading ? "Analyzing..." : "Scan / Upload Photo"}
      </button>

      <input
        ref={ref}
        hidden
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />

      {err ? <div style={{ color: "crimson", marginTop: 12 }}>{err}</div> : null}
    </main>
  );
}