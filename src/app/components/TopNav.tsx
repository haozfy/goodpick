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
    window.location.href = "/"; // ✅ Logout 后回首页
  };

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between p-4">
        {/* 左侧品牌 */}
        <Link href="/" className="font-semibold">
          Goodpick
        </Link>

        {/* 中间主导航 */}
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="hover:text-black text-neutral-700">
            Scan
          </Link>

          <Link
            href="/history"
            className="hover:text-black text-neutral-700"
          >
            搜索历史
          </Link>

          <Link
            href="/better"
            className="hover:text-black text-neutral-700"
          >
            更好的替代
          </Link>
        </nav>

        {/* 右侧账号区 */}
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/account" className="hover:text-black text-neutral-700">
                Account
              </Link>
              <button
                onClick={logout}
                className="hover:text-black text-neutral-700"
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="hover:text-black text-neutral-700">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}