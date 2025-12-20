"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function signInWithEmail() {
    setErr(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    if (error) setErr(error.message);
    else setSent(true);
  }

  async function signInWithGoogle() {
    setErr(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) setErr(error.message);
  }

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Login</h1>

      <button
        onClick={signInWithGoogle}
        style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
      >
        Continue with Google
      </button>

      <div style={{ margin: "18px 0", opacity: 0.6 }}>or</div>

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
      />
      <button
        onClick={signInWithEmail}
        disabled={!email}
        style={{
          width: "100%",
          marginTop: 10,
          padding: 12,
          borderRadius: 10,
          border: "1px solid #ddd",
        }}
      >
        Send magic link
      </button>

      {sent && <p style={{ marginTop: 12 }}>已发送登录链接到邮箱，点邮箱里的链接即可登录。</p>}
      {err && <p style={{ marginTop: 12, color: "crimson" }}>{err}</p>}
    </div>
  );
}