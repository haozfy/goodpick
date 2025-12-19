"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    try {
      setLoading(true);
      setError(null);

      const fd = new FormData();
      fd.append("image", file);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Analyze failed");

      sessionStorage.setItem("lastResult", JSON.stringify(data.result));
      router.push("/result");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: 24 }}>
      <h1>Goodpick</h1>
      <p style={{ color: "#666" }}>Scan food. Get a better pick.</p>

      <button
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        style={{
          width: "100%",
          padding: 14,
          marginTop: 24,
          background: "#111",
          color: "#fff",
          borderRadius: 8,
        }}
      >
        {loading ? "Analyzing…" : "Scan / Upload Photo"}
      </button>

      <input
        ref={inputRef}
        hidden
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files && upload(e.target.files[0])}
      />

      {error && <p style={{ color: "red", marginTop: 12 }}>{error}</p>}
    </main>
  );
}