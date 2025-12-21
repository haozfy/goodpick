// src/app/components/TopNav.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function TopNav() {
  const supabase = supabaseBrowser;
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      // ✅ 登录/登出后刷新当前页，让页眉立刻更新
      router.refresh();
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    if (loading) return;
    setLoading(true);
    await supabase.auth.signOut();
    alert("Logged out"); // ✅ 提示
    router.push("/");    // ✅ 回首页（scan）
    router.refresh();
    setLoading(false);
  };

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={[
          "text-sm",
          active ? "text-black font-medium" : "text-neutral-700 hover:text-black",
        ].join(" ")}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between p-4">
        <Link href="/" className="font-semibold">
          Goodpick
        </Link>

        <nav className="flex items-center gap-6">
          <NavLink href="/" label="Scan" />
          <NavLink href="/history" label="History" />
          <NavLink href="/better" label="Better Alternatives" />
        </nav>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <NavLink href="/account" label="Account" />
              <button
                onClick={logout}
                disabled={loading}
                className="text-sm text-neutral-700 hover:text-black disabled:opacity-50"
              >
                {loading ? "Logging out…" : "Logout"}
              </button>
            </>
          ) : (
            <NavLink href="/login" label="Login" />
          )}
        </div>
      </div>
    </header>
  );
}