// src/app/reset/page.tsx
"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ResetPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset/update")}`,
      });
      if (error) setMsg(error.message);
      else setMsg("Check your email for the reset link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Reset password</h1>

      <div className="space-y-3 rounded-2xl border border-neutral-200 p-4">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm"
          autoComplete="email"
        />

        <button
          onClick={send}
          disabled={busy || !email}
          className="h-11 w-full rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          Send reset link
        </button>

        {msg && <div className="text-sm text-neutral-700">{msg}</div>}
      </div>
    </main>
  );
}