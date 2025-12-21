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

  async function google() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function login() {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError(error.message);
  }

  async function signup() {
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Login</h1>

      {/* Google */}
      <button
        onClick={google}
        className="border px-6 py-2 rounded w-64"
      >
        Continue with Google
      </button>

      <div className="text-sm text-gray-400">or</div>

      {/* Email */}
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
            onClick={login}
            className="bg-black text-white px-6 py-2 rounded w-64"
          >
            Login
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
            onClick={signup}
            className="bg-black text-white px-6 py-2 rounded w-64"
          >
            Sign up
          </button>

          <button
            onClick={() => setMode("login")}
            className="text-sm underline"
          >
            Already have an account?
          </button>
        </>
      )}

      {/* Guest 只是回首页，不碰 Supabase */}
      <a href="/" className="text-sm underline mt-2">
        Continue as guest (limited)
      </a>
    </div>
  );
}