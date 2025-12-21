// src/app/components/TopNav.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function TopNav() {
  const supabase = supabaseBrowser();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between p-4">
        <Link href="/" className="font-semibold">
          Goodpick
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/">Scan</Link>
          {user && <Link href="/account">Account</Link>}
          {!user ? (
            <Link href="/login">Login</Link>
          ) : (
            <button onClick={logout}>Logout</button>
          )}
        </nav>
      </div>
    </header>
  );
}