"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function TopNav() {
  const supabase = supabaseBrowser();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // 初始用户
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });

    // 监听登录状态变化
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between p-4">
        {/* Brand */}
        <Link href="/" className="font-semibold">
          Goodpick
        </Link>

        {/* Main Nav */}
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="text-neutral-700 hover:text-black">
            Scan
          </Link>
          <Link href="/history" className="text-neutral-700 hover:text-black">
            History
          </Link>
          <Link href="/better" className="text-neutral-700 hover:text-black">
            Better Alternatives
          </Link>
        </nav>

        {/* Account */}
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/account" className="text-neutral-700 hover:text-black">
                Account
              </Link>
              <button
                onClick={logout}
                className="text-neutral-700 hover:text-black"
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="text-neutral-700 hover:text-black">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}