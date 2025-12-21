// src/app/reset/page.tsx
"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function ResetPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/reset/update`,
      });

      if (error) {
        setErr(error.message);
        return;
      }

      setMsg("Reset email sent. Please check your inbox.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      <p className="text-sm text-neutral-600">
        Enter your email. We’ll send you a reset link.
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          placeholder="you@example.com"
          className="h-11 w-full rounded-xl border border-neutral-200 px-3 outline-none focus:border-neutral-400"
        />

        <button
          disabled={busy}
          className="h-11 w-full rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send reset email"}
        </button>

        {err && <div className="text-sm text-red-600">{err}</div>}
        {msg && <div className="text-sm text-emerald-700">{msg}</div>}
      </form>
    </main>
  );
}