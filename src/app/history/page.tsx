// src/app/history/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Item = { id: string; created_at: string; title?: string };

export default function HistoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = supabaseBrowser();
      const {
        data: { user },
        error: uerr,
      } = await supabase.auth.getUser();

      if (uerr || !user) {
        window.location.href = "/login?next=/history";
        return;
      }

      // 这里先占位：你后面接你的表
      setItems([]);
      setMsg(null);
    })();
  }, []);

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4">
      <h1 className="text-2xl font-semibold">History</h1>

      {msg && <div className="text-sm text-neutral-700">{msg}</div>}

      <div className="rounded-2xl border border-neutral-200 p-4">
        {items.length === 0 ? (
          <div className="text-sm text-neutral-500">No history yet.</div>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.id} className="text-sm">
                {it.title ?? it.id} — {new Date(it.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}