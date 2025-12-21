"use client";

import { useRef, useState } from "react";

export default function HomePage() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const analyze = async () => {
    if (!imageUrl) return;
    setBusy(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      if (res.status === 401 || res.status === 403 || res.status === 402) {
        window.location.href = "/login";
        return;
      }

      const data = await res.json();
      if (data.ok) setResult(data.result);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="p-4 space-y-4">
      <section className="rounded-xl border bg-white p-4">
        <h1 className="text-lg font-semibold">Scan & Analyze</h1>
        <p className="text-sm text-neutral-500">
          Take a photo of nutrition label
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setImageUrl(URL.createObjectURL(f));
            setResult(null);
          }}
        />

        {!imageUrl ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-4 h-40 w-full rounded-xl border border-dashed"
          >
            📷 Take a photo
          </button>
        ) : (
          <img
            src={imageUrl}
            className="mt-4 h-48 w-full rounded-xl object-cover"
          />
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
          >
            Retake
          </button>

          <button
            onClick={analyze}
            disabled={busy || !imageUrl}
            className="flex-1 rounded-lg bg-black px-3 py-2 text-sm text-white disabled:opacity-40"
          >
            {busy ? "Analyzing…" : "Analyze"}
          </button>
        </div>
      </section>

      {result && (
        <section className="rounded-xl border bg-white p-4">
          <pre className="text-xs">{JSON.stringify(result, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}