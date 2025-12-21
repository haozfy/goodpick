"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "forgot";

export default function LoginPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [mode, setMode] = useState<Mode>("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const origin =
    typeof window === "undefined" ? "" : window.location.origin;

  const onGoogle = async () => {
    setBusy(true);
    setMsg("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=/history`,
      },
    });
    setBusy(false);
    if (error) setMsg(error.message);
  };

  const onEmailPassword = async () => {
    setBusy(true);
    setMsg("");

    if (!email) {
      setBusy(false);
      setMsg("Email required.");
      return;
    }
    if (mode !== "forgot" && !password) {
      setBusy(false);
      setMsg("Password required.");
      return;
    }

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setMsg(error.message);
      window.location.href = "/history";
      return;
    }

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      setBusy(false);
      if (error) return setMsg(error.message);
      setMsg("Signed up. If email confirmation is enabled, check your inbox.");
      return;
    }

    // forgot
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset`,
    });
    setBusy(false);
    if (error) return setMsg(error.message);
    setMsg("Password reset email sent. Check your inbox.");
  };

  return (
    <main className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="text-3xl font-semibold">Login</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Sign in to sync your history across devices.
      </p>

      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
        <button
          disabled={busy}
          onClick={onGoogle}
          className="h-11 w-full rounded-xl border border-neutral-200 text-sm hover:border-neutral-400 disabled:opacity-60"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-200" />
          <div className="text-xs text-neutral-500">or</div>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        <div className="flex gap-2 text-xs">
          <button
            className={`rounded-full px-3 py-1 border ${
              mode === "signin" ? "bg-black text-white border-black" : "border-neutral-200"
            }`}
            onClick={() => setMode("signin")}
            disabled={busy}
          >
            Sign in
          </button>
          <button
            className={`rounded-full px-3 py-1 border ${
              mode === "signup" ? "bg-black text-white border-black" : "border-neutral-200"
            }`}
            onClick={() => setMode("signup")}
            disabled={busy}
          >
            Sign up
          </button>
          <button
            className={`rounded-full px-3 py-1 border ${
              mode === "forgot" ? "bg-black text-white border-black" : "border-neutral-200"
            }`}
            onClick={() => setMode("forgot")}
            disabled={busy}
          >
            Forgot
          </button>
        </div>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 w-full rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-400"
          placeholder="Email"
          autoComplete="email"
        />

        {mode !== "forgot" && (
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-400"
            placeholder="Password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        )}

        <button
          disabled={busy}
          onClick={onEmailPassword}
          className="h-11 w-full rounded-xl bg-black text-sm text-white hover:opacity-90 disabled:opacity-60"
        >
          {mode === "signin" ? "Continue" : mode === "signup" ? "Create account" : "Send reset email"}
        </button>

        {msg && <div className="text-xs text-neutral-600">{msg}</div>}
      </div>
    </main>
  );
}