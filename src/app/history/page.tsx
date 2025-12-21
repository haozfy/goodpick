"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Item = {
  id: string;
  created_at: string;
  title: string;
};

export default function HistoryPage() {
  const supabase = supabaseBrowser();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    supabase
      .from("scans")
      .select("id, created_at, title")
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems(data ?? []));
  }, [supabase]);

  return (
    <ul>
      {items.map((i) => (
        <li key={i.id}>{i.title}</li>
      ))}
    </ul>
  );
}