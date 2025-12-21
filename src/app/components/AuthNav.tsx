"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function AuthNav() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = supabaseBrowser();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const onLogout = async () => {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isPro = !!user?.user_metadata?.is_pro; // 你可以之后换成查订阅/查表

  return (
    <nav className="flex items-center gap-5 text-sm">
      <Link href="/">Scan</Link>
      <Link href="/history">History</Link>

      {loading ? null : user ? (
        <>
          <Link href="/account" className="flex items-center gap-2">
            Account
            {isPro ? (
              <span className="rounded-full border border-neutral-300 px-2 py-0.5 text-[11px]">
                PRO
              </span>
            ) : null}
          </Link>

          <button
            onClick={onLogout}
            className="rounded-lg border border-neutral-200 px-3 py-1 hover:border-neutral-400"
          >
            Logout
          </button>
        </>
      ) : (
        <Link href="/login">Login</Link>
      )}
    </nav>
  );
}