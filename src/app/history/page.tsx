"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";

export default function HistoryPage() {
  const supabase = supabaseClient();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("history")
        .select("*")
        .order("created_at", { ascending: false });

      setItems(data || []);
      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return <div className="p-4 text-sm text-neutral-500">Loading…</div>;
  }

  return (
    <main className="p-4 space-y-3">
      <h1 className="text-xl font-semibold">History</h1>

      {items.length === 0 && (
        <div className="text-sm text-neutral-500">No history yet.</div>
      )}

      {items.map((it) => (
        <div
          key={it.id}
          className="rounded-xl border border-neutral-200 p-3 text-sm"
        >
          {JSON.stringify(it)}
        </div>
      ))}
    </main>
  );
}