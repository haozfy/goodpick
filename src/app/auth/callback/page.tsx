"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const supabase = supabaseBrowser();

    supabase.auth.getSession().then(() => {
      const next = params.get("next") || "/";
      router.replace(next);
    });
  }, [router, params]);

  return (
    <main className="p-8 text-sm text-neutral-500">
      Signing you in…
    </main>
  );
}