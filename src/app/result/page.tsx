import Link from "next/link";
import { getSessionKey } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ScanRow = {
  id: string;
  created_at: string;
  session_key: string;
  product_name: string | null;
  score: number | null;
  notes_free: string[] | null;
  notes_pro: string[] | null;
  signals: any;
};

async function getIsPro(sessionKey: string): Promise<boolean> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("gp_sessions")
    .select("is_pro")
    .eq("session_key", sessionKey)
    .maybeSingle();

  return Boolean(data?.is_pro);
}

async function getLatestScan(sessionKey: string): Promise<ScanRow | null> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("gp_scan_history")
    .select(
      "id,created_at,session_key,product_name,score,notes_free,notes_pro,signals"
    )
    .eq("session_key", sessionKey)
    .order("created_at", { ascending: false })
    .limit(1);

  return (data?.[0] as any) || null;
}

export default async function ResultPage() {
  const sessionKey = await getSessionKey();

  const [isPro, latest] = await Promise.all([
    getIsPro(sessionKey),
    getLatestScan(sessionKey),
  ]);

  if (!latest) {
    return (
      <main style={{ maxWidth: 520, margin: "48px auto", padding: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>No result yet</h1>
        <p style={{ opacity: 0.7, marginTop: 8 }}>
          Go scan a product first.
        </p>
        <div style={{ marginTop: 16 }}>
          <Link href="/" style={{ textDecoration: "underline" }}>
            Back to Scan
          </Link>
        </div>
      </main>
    );
  }

  const score = latest.score ?? 0;
  const notesFree = Array.isArray(latest.notes_free) ? latest.notes_free : [];
  const notesPro = Array.isArray(latest.notes_pro) ? latest.notes_pro : [];

  const scoreLabel =
    score >= 80 ? "Great pick" : score >= 60 ? "Okay pick" : "Think twice";

  return (
    <main style={{ maxWidth: 560, margin: "48px auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>
            {latest.product_name || "Result"}
          </h1>
          <p style={{ opacity: 0.7, marginTop: 6 }}>
            {new Date(latest.created_at).toLocaleString()}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1 }}>
            {score}
          </div>
          <div style={{ opacity: 0.7, marginTop: 6 }}>{scoreLabel}</div>
        </div>
      </header>

      <section style={{ marginTop: 20 }}>
        <h3 style={{ marginBottom: 8 }}>Quick reasons</h3>
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          {notesFree.map((x) => (
            <li key={x} style={{ marginBottom: 6 }}>
              {x}
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 18, opacity: isPro ? 1 : 0.55 }}>
        <h3 style={{ marginBottom: 8 }}>Pro insights</h3>
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          {(isPro ? notesPro : notesPro.slice(0, 0)).map((x) => (
            <li key={x} style={{ marginBottom: 6 }}>
              {x}
            </li>
          ))}
        </ul>

        {!isPro && (
          <div style={{ marginTop: 10 }}>
            <span style={{ marginRight: 8 }}>🔒</span>
            <Link href="/pro" style={{ textDecoration: "underline" }}>
              Upgrade to unlock full analysis
            </Link>
          </div>
        )}
      </section>

      <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
        <Link href="/" style={{ textDecoration: "underline" }}>
          Scan again
        </Link>
        <Link href="/history" style={{ textDecoration: "underline" }}>
          History
        </Link>
      </div>

      <footer style={{ marginTop: 28, opacity: 0.55, fontSize: 12 }}>
        Not medical advice. For decision support only.
      </footer>
    </main>
  );
}