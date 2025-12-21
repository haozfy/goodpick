// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = supabaseBrowser();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginWithGoogle = async () => {
    setBusy(true);
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setBusy(false);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setBusy(false);
      if (error) {
        setError(error.message);
        return;
      }
      window.location.href = "/";
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setError("Check your email to confirm your account.");
  };

  return (
    <main className="mx-auto max-w-sm p-6 space-y-4">
      <h1 className="text-xl font-semibold">
        {mode === "login" ? "Login" : "Create account"}
      </h1>

      <button
        onClick={loginWithGoogle}
        disabled={busy}
        className="w-full h-11 rounded-xl border"
      >
        Continue with Google
      </button>

      <div className="text-center text-sm text-neutral-400">or</div>

      <input
        className="w-full h-11 rounded-xl border px-3"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="w-full h-11 rounded-xl border px-3"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <div className="text-sm text-red-600">{error}</div>}

      <button
        onClick={submit}
        disabled={busy || !email || !password}
        className="w-full h-11 rounded-xl bg-black text-white disabled:opacity-40"
      >
        {mode === "login" ? "Login" : "Create account"}
      </button>

      <button
        onClick={() => {
          setError(null);
          setMode(mode === "login" ? "signup" : "login");
        }}
        className="w-full text-sm text-neutral-500 underline"
      >
        {mode === "login" ? "Create account" : "Already have an account?"}
      </button>

      <a
        href="/reset"
        className="block text-center text-sm text-neutral-500"
      >
        Forgot password?
      </a>
    </main>
  );
}