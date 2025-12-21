"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Signing you in…");

  useEffect(() => {
    const run = async () => {
      const supabase = supabaseBrowser();

      // ✅ 不用 useSearchParams，避免 Next prerender 报错
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || "/history";
      const code = params.get("code");
      const error = params.get("error");
      const errorDesc = params.get("error_description");

      if (error) {
        setMsg(`Login failed: ${errorDesc || error}`);
        return;
      }

      if (!code) {
        setMsg("Missing code in callback URL.");
        return;
      }

      const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
      if (exErr) {
        setMsg(`Login failed: ${exErr.message}`);
        return;
      }

      setMsg("Logged in. Redirecting…");
      router.replace(next);
    };

    run();
  }, [router]);

  return (
    <main className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">Goodpick</h1>
      <p className="mt-3 text-sm text-neutral-600">{msg}</p>
    </main>
  );
}