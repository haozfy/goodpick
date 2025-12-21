"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ResetPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const onUpdate = async () => {
    setBusy(true);
    setMsg("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setMsg(error.message);
    setMsg("Password updated. You can go to History now.");
    setTimeout(() => (window.location.href = "/history"), 400);
  };

  return (
    <main className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="text-3xl font-semibold">Reset password</h1>

      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 space-y-3">
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 w-full rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-400"
          placeholder="New password"
          type="password"
          autoComplete="new-password"
        />
        <button
          disabled={busy}
          onClick={onUpdate}
          className="h-11 w-full rounded-xl bg-black text-sm text-white hover:opacity-90 disabled:opacity-60"
        >
          Update password
        </button>
        {msg && <div className="text-xs text-neutral-600">{msg}</div>}
      </div>
    </main>
  );
}