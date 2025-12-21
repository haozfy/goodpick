// src/app/components/TopNav.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

function navLinkClass(active: boolean) {
  return active ? "text-black font-medium" : "text-neutral-700 hover:text-black";
}

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();

  // ✅ 确保只创建一次 client（避免 auth 监听乱掉）
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [user, setUser] = useState<User | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setUser(data.user ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  // ✅ 用 query string 触发一次性提示（比如 logout=1）
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const msg = url.searchParams.get("toast");
    if (!msg) return;

    setToast(decodeURIComponent(msg));
    url.searchParams.delete("toast");
    window.history.replaceState({}, "", url.toString());

    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [pathname]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/?toast=" + encodeURIComponent("Logged out"));
    router.refresh();
  };

  return (
    <header className="border-b bg-white">
      {/* toast */}
      {toast && (
        <div className="border-b bg-neutral-900 text-white">
          <div className="mx-auto max-w-4xl px-4 py-2 text-sm">{toast}</div>
        </div>
      )}

      <div className="mx-auto flex max-w-4xl items-center justify-between p-4">
        {/* Brand */}
        <Link href="/" className="font-semibold">
          Goodpick
        </Link>

        {/* Main Nav */}
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className={navLinkClass(pathname === "/")}>
            Scan
          </Link>
          <Link href="/history" className={navLinkClass(pathname === "/history")}>
            History
          </Link>
          <Link href="/better" className={navLinkClass(pathname === "/better")}>
            Better Alternatives
          </Link>
        </nav>

        {/* Account */}
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/account" className={navLinkClass(pathname === "/account")}>
                Account
              </Link>
              <button onClick={logout} className="text-neutral-700 hover:text-black">
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className={navLinkClass(pathname === "/login")}>
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}