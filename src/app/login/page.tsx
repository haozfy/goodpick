// src/app/login/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = supabaseBrowser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 已登录直接回首页
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.replace("/");
      }
    });
  }, [router, supabase]);

  const signInEmail = async () => {
    setBusy(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setBusy(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.replace("/");
  };

  const signInGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  };

  return (
    <main className="mx-auto max-w-sm p-6 space-y-4">
      <h1 className="text-xl font-semibold">Login</h1>

      <button
        onClick={signInGoogle}
        className="w-full h-11 rounded-xl border"
      >
        Continue with Google
      </button>

      <div className="text-center text-sm text-neutral-400">or</div>

      <input
        className="w-full h-11 rounded-xl border px-3"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="w-full h-11 rounded-xl border px-3"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <div className="text-sm text-red-600">{error}</div>}

      <button
        onClick={signInEmail}
        disabled={busy}
        className="w-full h-11 rounded-xl bg-black text-white disabled:opacity-40"
      >
        Login
      </button>

      <a
        href="/reset"
        className="block text-center text-sm text-neutral-500"
      >
        Forgot password?
      </a>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}