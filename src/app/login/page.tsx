// src/app/login/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const next = useMemo(() => sp.get("next") ?? "/history", [sp]);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const origin =
    typeof window === "undefined" ? "" : window.location.origin;

  const onGoogle = async () => {
    setMsg(null);
    setBusy(true);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) setMsg(error.message);
    } finally {
      setBusy(false);
    }
  };

  const onEmailPassword = async () => {
    setMsg(null);
    setBusy(true);
    try {
      const supabase = supabaseBrowser();
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) return setMsg(error.message);
        router.push(next);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) return setMsg(error.message);
        setMsg("Account created. Please check your email to confirm (if required).");
      }
    } finally {
      setBusy(false);
    }
  };

  const onForgot = async () => {
    setMsg(null);
    setBusy(true);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset`,
      });
      if (error) return setMsg(error.message);
      setMsg("Password reset email sent. Check your inbox.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="text-3xl font-semibold">
        {mode === "login" ? "Login" : "Create account"}
      </h1>

      <div className="mt-6 space-y-3 rounded-2xl border border-neutral-200 bg-white p-6">
        <button
          disabled={busy}
          onClick={onGoogle}
          className="h-11 w-full rounded-xl border border-neutral-200 text-sm hover:border-neutral-400 disabled:opacity-60"
        >
          Continue with Google
        </button>

        <div className="text-center text-xs text-neutral-500">or</div>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 w-full rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-400"
          placeholder="Email"
          autoComplete="email"
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 w-full rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-400"
          placeholder="Password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />

        <button
          disabled={busy || !email || !password}
          onClick={onEmailPassword}
          className="h-11 w-full rounded-xl bg-black text-sm text-white hover:opacity-90 disabled:opacity-60"
        >
          {mode === "login" ? "Login" : "Create account"}
        </button>

        <div className="flex items-center justify-between pt-2 text-xs text-neutral-600">
          <button
            disabled={busy}
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="hover:text-black"
          >
            {mode === "login" ? "Create account" : "Back to login"}
          </button>

          <button
            disabled={busy || !email}
            onClick={onForgot}
            className="hover:text-black"
          >
            Forgot password?
          </button>
        </div>

        {msg ? (
          <div className="rounded-xl bg-neutral-50 p-3 text-xs text-neutral-700">
            {msg}
          </div>
        ) : null}
      </div>
    </main>
  );
}