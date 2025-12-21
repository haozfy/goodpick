"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/scan");
  }

  async function handleSignup() {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/scan");
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div style={{ maxWidth: 420, margin: "80px auto" }}>
      <h2>Login</h2>

      <button onClick={handleGoogle} style={{ width: "100%" }}>
        Continue with Google
      </button>

      <div style={{ margin: "16px 0", textAlign: "center" }}>or</div>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }}
      />

      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }}
      />

      {error && <p style={{ color: "red" }}>{error}</p>}

      <button
        onClick={handleLogin}
        disabled={loading}
        style={{ width: "100%", marginBottom: 8 }}
      >
        Login
      </button>

      <button
        onClick={handleSignup}
        disabled={loading}
        style={{ width: "100%" }}
      >
        Create account
      </button>

      <div style={{ marginTop: 16, textAlign: "center" }}>
        <a href="/scan">Continue as guest (limited)</a>
      </div>
    </div>
  );
}