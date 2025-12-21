"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Header() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  async function goCheckout() {
    const res = await fetch("/api/billing/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  return (
    <header className="flex justify-between items-center px-6 py-4 border-b">
      <div className="font-semibold">Goodpick</div>

      <div className="flex items-center gap-4 text-sm">
        <a href="/scan">Scan</a>
        <a href="/history">History</a>

        {!user && <a href="/login">Login</a>}

        {user && (
          <button
            onClick={goCheckout}
            className="border px-3 py-1 rounded"
          >
            Upgrade
          </button>
        )}
      </div>
    </header>
  );
}