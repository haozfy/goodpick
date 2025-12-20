// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const signInGoogle = async () => {
    try {
      setLoading(true);
      const supabase = supabaseBrowser();
      const origin = window.location.origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // 这里要与你在 Supabase/Google 配的回调一致（你现在就是这个）
          redirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (e: any) {
      alert(e?.message ?? "Login failed");
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: "80px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Login</h1>
      <p style={{ opacity: 0.7, marginBottom: 18 }}>
        Sign in to sync your history across devices.
      </p>

      <button
        onClick={signInGoogle}
        disabled={loading}
        style={{
          width: "100%",
          height: 44,
          borderRadius: 10,
          border: "1px solid #ddd",
          background: "white",
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Redirecting..." : "Continue with Google"}
      </button>
    </main>
  );
}