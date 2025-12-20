import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export default async function HistoryPage() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Login required</h1>
        <Link href="/login">Go login</Link>
      </main>
    );
  }

  const { data } = await supabase
    .from("gp_scan_history")
    .select("id,created_at,product_name,score,verdict")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <main style={{ maxWidth: 560, margin: "48px auto", padding: 16 }}>
      <h1>History</h1>
      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {(data ?? []).map((x) => (
          <div key={x.id} style={{ padding: 12, border: "1px solid rgba(0,0,0,.12)", borderRadius: 10 }}>
            <div style={{ fontWeight: 700 }}>{x.product_name || "Food"}</div>
            <div style={{ opacity: 0.7 }}>
              {new Date(x.created_at).toLocaleString()} · {x.verdict} · {x.score}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
        <Link href="/">Scan</Link>
        <Link href="/result">Result</Link>
        <Link href="/pro">Pro</Link>
      </div>
    </main>
  );
}