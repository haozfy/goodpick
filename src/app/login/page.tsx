// src/app/login/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const sp = useSearchParams();
  const next = useMemo(() => sp.get("next") || "/", [sp]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) setMsg(error.message);
    } finally {
      setBusy(false);
    }
  };

  const signInWithEmail = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMsg(error.message);
        return;
      }
      window.location.href = next;
    } finally {
      setBusy(false);
    }
  };

  const signUpWithEmail = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) {
        setMsg(error.message);
        return;
      }
      setMsg("Check your email to confirm.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Login</h1>

      <button
        onClick={signInWithGoogle}
        disabled={busy}
        className="h-11 w-full rounded-xl border border-neutral-200 px-4 text-sm hover:border-neutral-400 disabled:opacity-50"
      >
        Continue with Google
      </button>

      <div className="text-center text-xs text-neutral-500">or</div>

      <div className="space-y-3 rounded-2xl border border-neutral-200 p-4">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm"
          autoComplete="email"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm"
          autoComplete="current-password"
          type="password"
        />

        <button
          onClick={signInWithEmail}
          disabled={busy}
          className="h-11 w-full rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          Login
        </button>

        <button
          onClick={signUpWithEmail}
          disabled={busy}
          className="h-11 w-full rounded-xl border border-neutral-200 px-4 text-sm hover:border-neutral-400 disabled:opacity-50"
        >
          Create account
        </button>

        <a href="/reset" className="block text-sm text-neutral-700 underline">
          Forgot password?
        </a>

        {msg && <div className="text-sm text-neutral-700">{msg}</div>}
      </div>
    </main>
  );
}