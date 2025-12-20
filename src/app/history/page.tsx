// src/app/history/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function HistoryPage() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  return (
    <main style={{ maxWidth: 720, margin: "60px auto", padding: 16 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700 }}>History</h1>

      <p style={{ opacity: 0.7, marginTop: 8 }}>
        {email ? `Logged in as ${email}` : "Not logged in"}
      </p>

      <div style={{ marginTop: 24, opacity: 0.6 }}>
        History list coming soon.
      </div>
    </main>
  );
}