// src/app/components/UserMenu.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

type Me = {
  email?: string | null;
  isPro?: boolean;
};

export default function UserMenu() {
  const router = useRouter();
  const supabase = useMemo(() => {
    // 兼容你现在两种写法：supabaseBrowser() 或 supabaseBrowser
    return typeof supabaseBrowser === "function" ? supabaseBrowser() : (supabaseBrowser as any);
  }, []);

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!mounted) return;

      if (!user) {
        setMe(null);
        setLoading(false);
        return;
      }

      // ✅ 这里用 profiles 表的 is_pro（你没有就先当 false，不会报错）
      let isPro = false;
      try {
        const { data: p } = await supabase
          .from("profiles")
          .select("is_pro")
          .eq("id", user.id)
          .maybeSingle();

        isPro = !!p?.is_pro;
      } catch {}

      setMe({ email: user.email, isPro });
      setLoading(false);
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
      router.refresh();
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, [supabase, router]);

  const onLogout = async () => {
    await supabase.auth.signOut();
    setMe(null);
    router.refresh();
    router.push("/login");
  };

  if (loading) {
    return <span className="text-neutral-500">…</span>;
  }

  if (!me) {
    return <Link href="/login">Login</Link>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="max-w-[160px] truncate text-xs text-neutral-600">{me.email}</span>

      {me.isPro ? (
        <span className="rounded-full bg-black px-2 py-0.5 text-[11px] text-white">PRO</span>
      ) : (
        <Link className="text-xs text-neutral-600 underline underline-offset-2" href="/pro">
          Upgrade
        </Link>
      )}

      <button
        onClick={onLogout}
        className="rounded-lg border border-neutral-200 px-2 py-1 text-xs hover:border-neutral-400"
      >
        Logout
      </button>
    </div>
  );
}