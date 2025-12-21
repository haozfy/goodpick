"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = supabaseBrowser();

    // Supabase 会在 OAuth / Magic Link 回来时自动从 URL 里解析 code 并换 session
    // 这里做一次 getSession 以确保落地，然后跳回首页/历史
    supabase.auth.getSession().then(() => {
      router.replace("/"); // 你想回 history 就改成 "/history"
    });
  }, [router]);

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-neutral-200 p-6">
      <div className="text-sm font-medium">Signing you in…</div>
      <div className="mt-2 text-xs text-neutral-500">Please wait.</div>
    </div>
  );
}