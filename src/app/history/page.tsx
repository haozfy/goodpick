"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const [data, setData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const supabase = supabaseBrowser();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data } = await supabase
        .from("gp_scan_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setData(data);
    };

    run();
  }, [router]);

  if (!data) return <p>Loading…</p>;

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">{data.product_name}</h1>
      <p>Score: {data.score}</p>
      <p>{data.headline}</p>
    </main>
  );
}