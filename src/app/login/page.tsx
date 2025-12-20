"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const sp = useSearchParams();
  const next = useMemo(() => sp.get("next") || "/result", [sp]);

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const supabase = supabaseBrowser();
    const redirectTo = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) return setErr(error.message);
    setSent(true);
  }

  return (
    <main style={{ maxWidth: 520, margin: "48px auto", padding: 16 }}>
      <h1>Login</h1>
      {!sent ? (
        <form onSubmit={send} style={{ display: "grid", gap: 10 }}>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(0,0,0,.2)" }}
          />
          <button style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(0,0,0,.2)" }}>
            Send magic link
          </button>
          {err ? <div style={{ color: "crimson" }}>{err}</div> : null}
        </form>
      ) : (
        <div>Magic link sent to {email}</div>
      )}
    </main>
  );
}