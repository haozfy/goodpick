// src/app/reset/update/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function readHashParams() {
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(raw);
}

export default function ResetUpdatePage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Supabase recovery link usually returns tokens in URL hash
        const p = readHashParams();
        const access_token = p.get("access_token");
        const refresh_token = p.get("refresh_token");

        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          // clean hash
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setErr("Recovery session not found. Please request a new reset link.");
        }
      } catch (e: any) {
        setErr(e?.message || "Failed to initialize recovery session.");
      } finally {
        setReady(true);
      }
    })();
  }, [supabase]);

  const onUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErr(error.message);
        return;
      }

      setMsg("Password updated. Redirecting…");
      setTimeout(() => router.push("/"), 600);
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return <div className="text-sm text-neutral-600">Loading…</div>;
  }

  return (
    <main className="mx-auto w-full max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Set a new password</h1>

      <form onSubmit={onUpdate} className="space-y-3">
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          minLength={8}
          placeholder="New password (min 8 chars)"
          className="h-11 w-full rounded-xl border border-neutral-200 px-3 outline-none focus:border-neutral-400"
        />

        <button
          disabled={busy}
          className="h-11 w-full rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Updating…" : "Update password"}
        </button>

        {err && <div className="text-sm text-red-600">{err}</div>}
        {msg && <div className="text-sm text-emerald-700">{msg}</div>}
      </form>

      <div className="text-xs text-neutral-500">
        If this page says session not found, go back and request a new reset link.
      </div>
    </main>
  );
}