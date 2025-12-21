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
  const [msg, setMsg] = useState<string | null>(null);

  const redirectTo = `${window.location.origin}/auth/callback?next=/history`;

  const onGoogle = async () => {
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) setMsg(error.message);
    setBusy(false);
  };

  const onSignin = async () => {
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
    else window.location.href = "/history";
    setBusy(false);
  };

  const onSignup = async () => {
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) setMsg(error.message);
    else setMsg("✅ Account created. If email confirmation is enabled, check your inbox.");
    setBusy(false);
  };

  const onForgot = async () => {
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset`,
    });
    if (error) setMsg(error.message);
    else setMsg("✅ Password reset email sent. Check your inbox.");
    setBusy(false);
  };

  return (
    <main className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="text-3xl font-semibold">Login</h1>

      <div className="mt-4 flex gap-2 text-sm">
        <button className={`rounded-lg px-3 py-1 border ${mode==="signin"?"bg-black text-white":"bg-white"}`} onClick={() => setMode("signin")}>Sign in</button>
        <button className={`rounded-lg px-3 py-1 border ${mode==="signup"?"bg-black text-white":"bg-white"}`} onClick={() => setMode("signup")}>Create account</button>
        <button className={`rounded-lg px-3 py-1 border ${mode==="forgot"?"bg-black text-white":"bg-white"}`} onClick={() => setMode("forgot")}>Forgot</button>
      </div>

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
        />

        {mode !== "forgot" && (
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className="h-11 w-full rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-400"
            placeholder="Password"
          />
        )}

        {mode === "signin" && (
          <button disabled={busy} onClick={onSignin} className="h-11 w-full rounded-xl bg-black text-sm text-white hover:opacity-90 disabled:opacity-60">
            Sign in
          </button>
        )}

        {mode === "signup" && (
          <button disabled={busy} onClick={onSignup} className="h-11 w-full rounded-xl bg-black text-sm text-white hover:opacity-90 disabled:opacity-60">
            Create account
          </button>
        )}

        {mode === "forgot" && (
          <button disabled={busy} onClick={onForgot} className="h-11 w-full rounded-xl bg-black text-sm text-white hover:opacity-90 disabled:opacity-60">
            Send reset email
          </button>
        )}

        {msg && <div className="text-sm text-neutral-700">{msg}</div>}
      </div>
    </main>
  );
}