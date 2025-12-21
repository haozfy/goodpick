"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const supabase = supabaseBrowser; // ❗️重点：不调用

  const onEmailLogin = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/history`,
      },
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Check your email for the login link.");
    }
  };

  const onGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/history`,
      },
    });

    if (error) alert(error.message);
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Login</h1>

      <div className="mt-6 space-y-3 rounded-2xl border border-neutral-200 bg-white p-6">
        <button
          onClick={onGoogleLogin}
          className="h-11 w-full rounded-xl border border-neutral-200 text-sm hover:border-neutral-400"
        >
          Continue with Google
        </button>

        <div className="text-xs text-neutral-500 text-center">or</div>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 w-full rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-400"
          placeholder="Email address"
        />

        <button
          onClick={onEmailLogin}
          className="h-11 w-full rounded-xl bg-black text-sm text-white hover:opacity-90"
        >
          Continue with Email
        </button>
      </div>
    </main>
  );
}