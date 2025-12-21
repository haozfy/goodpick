// src/app/auth/callback/page.tsx
"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const code = params.get("code");
      const next = params.get("next") || "/";

      if (!code) {
        router.replace("/login");
        return;
      }

      const supabase = supabaseBrowser();
      await supabase.auth.exchangeCodeForSession(code);

      router.replace(next);
    };

    run();
  }, [params, router]);

  return (
    <div className="p-6 text-sm text-neutral-500">
      Signing you in…
    </div>
  );
}