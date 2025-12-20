"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signInWithGoogle = async () => {
    setBusy(true);
    setMsg(null);
    const origin = window.location.origin;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) setMsg(error.message);
    setBusy(false);
  };

  const signInWithEmail = async () => {
    setBusy(true);
    setMsg(null);

    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) setMsg(error.message);
    else setMsg("Magic link sent. Check your email.");
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-semibold">Login</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Sign in to sync your history across devices.
      </p>

      <div className="mt-6 space-y-3">
        <button
          onClick={signInWithGoogle}
          disabled={busy}
          className="h-12 w-full rounded-xl border border-neutral-200 text-sm font-medium hover:border-neutral-400 disabled:opacity-40"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-3 py-2">
          <div className="h-px flex-1 bg-neutral-200" />
          <div className="text-xs text-neutral-400">or</div>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        <div className="space-y-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="h-12 w-full rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-400"
          />
          <button
            onClick={signInWithEmail}
            disabled={busy || !email}
            className="h-12 w-full rounded-xl bg-black text-sm font-medium text-white disabled:opacity-40"
          >
            Continue with Email
          </button>
          <div className="text-xs text-neutral-500">
            We’ll send you a magic link. No password needed.
          </div>
        </div>

        {msg && <div className="text-sm text-neutral-700">{msg}</div>}
      </div>
    </div>
  );
}