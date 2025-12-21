"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";

export default function TopNav() {
  const supabase = supabaseClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <Link href="/" className="font-semibold">
        Goodpick
      </Link>

      <nav className="flex items-center gap-4 text-sm">
        <Link href="/">Scan</Link>
        {email ? <Link href="/account">Account</Link> : <Link href="/login">Login</Link>}
        {email && (
          <button onClick={logout} className="text-red-600">
            Logout
          </button>
        )}
      </nav>
    </header>
  );
}