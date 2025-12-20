// src/app/auth/callback/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    // Supabase OAuth 会把 code 带回到这里
    // 你想回到哪里，就用 next=xxx（比如 /history）
    const next = sp.get("next") || "/";

    // 给一点点时间让 supabase-js 在客户端完成 session 写入（如果你有在别处做 exchange）
    // 你的项目如果已经有 /auth/callback route.ts 做 exchange，这里直接跳转即可
    router.replace(next);
  }, [router, sp]);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="text-sm font-semibold">Signing you in…</div>
        <div className="mt-2 text-sm text-neutral-500">Please wait.</div>
      </div>
    </main>
  );
}