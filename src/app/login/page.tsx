"use client";

import { useRef, useState } from "react";

export default function HomePage() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Scan & Analyze</h1>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) =>
          setImageUrl(e.target.files?.[0] ? URL.createObjectURL(e.target.files[0]) : null)
        }
      />

      {!imageUrl ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="flex h-44 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-700 hover:border-neutral-400"
        >
          <div className="text-3xl">📷</div>
          <div className="mt-2 text-sm font-medium">Take a photo</div>
          <div className="mt-1 text-xs text-neutral-500">Best: straight, bright, full label</div>
        </button>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200">
          <img src={imageUrl} alt="preview" className="h-56 w-full object-cover" />
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => {
            setImageUrl(null);
          }}
          className="h-11 flex-1 rounded-xl border border-neutral-200 px-4 text-sm hover:border-neutral-400"
        >
          Reset
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          className="h-11 flex-1 rounded-xl bg-black px-4 text-sm font-medium text-white"
        >
          {imageUrl ? "Retake" : "Choose photo"}
        </button>
      </div>
    </main>
  );
}