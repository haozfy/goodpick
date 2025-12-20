import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export default async function ResultPage() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return (
      <main style={{ maxWidth: 560, margin: "48px auto", padding: 16 }}>
        <h1>Login required</h1>
        <Link href="/login">Go login</Link>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("gp_scan_history")
    .select("product_name,score,verdict,headline,notes_free,notes_pro,created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const row = data?.[0];

  if (error || !row) {
    return (
      <main style={{ maxWidth: 560, margin: "48px auto", padding: 16 }}>
        <h1>No result yet</h1>
        <Link href="/">Scan</Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 560, margin: "48px auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>{row.product_name || "Result"}</h1>
          <div style={{ opacity: 0.65, marginTop: 6 }}>
            {new Date(row.created_at).toLocaleString()}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1 }}>{row.score ?? 0}</div>
          <div style={{ opacity: 0.65, marginTop: 6 }}>{row.verdict}</div>
        </div>
      </header>

      <section style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 8 }}>Headline</h3>
        <div style={{ opacity: 0.85 }}>{row.headline || "-"}</div>
      </section>

      <section style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 8 }}>Why</h3>
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          {(row.notes_free ?? []).map((x: string) => (
            <li key={x} style={{ marginBottom: 6 }}>{x}</li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 8 }}>Pro insights</h3>
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          {(row.notes_pro ?? []).map((x: string) => (
            <li key={x} style={{ marginBottom: 6 }}>{x}</li>
          ))}
        </ul>
      </section>

      <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
        <Link href="/">Scan again</Link>
        <Link href="/history">History</Link>
        <Link href="/pro">Pro</Link>
        <Link href="/logout">Logout</Link>
      </div>
    </main>
  );
}