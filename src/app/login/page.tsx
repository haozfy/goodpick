"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const redirectTo = typeof window !== "undefined"
    ? `${window.location.origin}/auth/callback?next=/history`
    : "";

  const onGoogle = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    setBusy(false);
    if (error) alert(error.message);
  };

  const onLogin = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) alert(error.message);
    else window.location.href = "/history";
  };

  const onSignUp = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });
    setBusy(false);
    if (error) alert(error.message);
    else alert("Signup success. If email confirmation is enabled, check your inbox.");
  };

  const onForgot = async () => {
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) alert(error.message);
    else alert("Password reset email sent. Check your inbox.");
  };

  return (
    <main className="mx-auto w-full max-w-md px-6 py-14">
      <h1 className="text-3xl font-semibold">Login</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Sign in to sync your history across devices.
      </p>

      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 space-y-3">
        <button
          disabled={busy}
          onClick={onGoogle}
          className="h-11 w-full rounded-xl border border-neutral-200 text-sm hover:border-neutral-400 disabled:opacity-60"
        >
          Continue with Google
        </button>

        <div className="py-2 text-center text-xs text-neutral-500">or</div>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 w-full rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-400"
          placeholder="Email address"
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

        {mode === "forgot" ? (
          <button
            disabled={busy || !email}
            onClick={onForgot}
            className="h-11 w-full rounded-xl bg-black text-sm text-white hover:opacity-90 disabled:opacity-60"
          >
            Send reset email
          </button>
        ) : mode === "signup" ? (
          <button
            disabled={busy || !email || password.length < 6}
            onClick={onSignUp}
            className="h-11 w-full rounded-xl bg-black text-sm text-white hover:opacity-90 disabled:opacity-60"
          >
            Create account
          </button>
        ) : (
          <button
            disabled={busy || !email || !password}
            onClick={onLogin}
            className="h-11 w-full rounded-xl bg-black text-sm text-white hover:opacity-90 disabled:opacity-60"
          >
            Sign in
          </button>
        )}

        <div className="flex items-center justify-between pt-2 text-xs">
          <button
            className="text-neutral-600 hover:text-black"
            onClick={() => setMode(mode === "signup" ? "login" : "signup")}
          >
            {mode === "signup" ? "Have an account? Sign in" : "Create account"}
          </button>

          <button
            className="text-neutral-600 hover:text-black"
            onClick={() => setMode(mode === "forgot" ? "login" : "forgot")}
          >
            {mode === "forgot" ? "Back to login" : "Forgot password?"}
          </button>
        </div>
      </div>
    </main>
  );
}