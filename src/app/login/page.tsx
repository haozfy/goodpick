"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function signInWithEmail() {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError(error.message);
  }

  async function signUpWithEmail() {
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  }

  async function goCheckout() {
    const res = await fetch("/api/billing/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Login</h1>

      {/* Google OAuth */}
      <button
        onClick={signInWithGoogle}
        className="border px-6 py-2 rounded w-64"
      >
        Continue with Google
      </button>

      <div className="text-sm text-gray-400">or</div>

      {/* Email / Password */}
      <input
        className="border px-3 py-2 rounded w-64"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="border px-3 py-2 rounded w-64"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <div className="text-sm text-red-500">{error}</div>}

      {mode === "login" ? (
        <>
          <button
            onClick={signInWithEmail}
            className="bg-black text-white px-6 py-2 rounded w-64"
          >
            Login with Email
          </button>

          <button
            onClick={() => setMode("signup")}
            className="text-sm underline"
          >
            Create account
          </button>
        </>
      ) : (
        <>
          <button
            onClick={signUpWithEmail}
            className="bg-black text-white px-6 py-2 rounded w-64"
          >
            Sign up with Email
          </button>

          <button
            onClick={() => setMode("login")}
            className="text-sm underline"
          >
            Already have an account?
          </button>
        </>
      )}

      <div className="text-sm text-gray-500 mt-2">
        Login required for unlimited scans
      </div>

      <button
        onClick={goCheckout}
        className="border px-6 py-2 rounded w-64 mt-2"
      >
        Upgrade to Pro
      </button>

      <a href="/" className="text-sm underline mt-2">
        Continue as guest (limited)
      </a>
    </div>
  );
}