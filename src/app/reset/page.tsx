// src/app/reset/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ResetPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onSet = async () => {
    setMsg(null);
    setBusy(true);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return setMsg(error.message);
      router.push("/history");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="text-3xl font-semibold">Set new password</h1>
      <div className="mt-6 space-y-3 rounded-2xl border border-neutral-200 bg-white p-6">
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 w-full rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-400"
          placeholder="New password"
          type="password"
        />
        <button
          disabled={busy || !password}
          onClick={onSet}
          className="h-11 w-full rounded-xl bg-black text-sm text-white hover:opacity-90 disabled:opacity-60"
        >
          Update password
        </button>
        {msg ? <div className="text-xs text-red-600">{msg}</div> : null}
      </div>
    </main>
  );
}