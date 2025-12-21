"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const sp = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const supabase = supabaseBrowser();

      // 把 OAuth / email link 带回来的 code 换成 session（写入 cookie/localStorage）
      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );

      const next = sp.get("next") || "/";

      if (error) {
        router.replace(`/login?error=${encodeURIComponent(error.message)}`);
        return;
      }
      router.replace(next);
    };

    run();
  }, [router, sp]);

  return (
    <main className="mx-auto max-w-md px-6 py-16 text-sm text-neutral-600">
      Signing you in…
    </main>
  );
}