// src/app/auth/callback/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const run = async () => {
      const supabase = supabaseBrowser();

      // 关键：让 supabase 从 URL hash 里接管 session
      await supabase.auth.getSession();

      const next = params.get("next") || "/history";
      router.replace(next);
    };

    run();
  }, [params, router]);

  return <p>Signing you in…</p>;
}