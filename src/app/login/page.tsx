"use client";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function goCheckout() {
    const res = await fetch("/api/billing/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Login</h1>

      <button
        onClick={signInWithGoogle}
        className="border px-6 py-2 rounded w-64"
      >
        Continue with Google
      </button>

      <div className="text-sm text-gray-500 mt-2">
        Login required for unlimited scans
      </div>

      <button
        onClick={goCheckout}
        className="bg-black text-white px-6 py-2 rounded w-64 mt-4"
      >
        Upgrade to Pro
      </button>

      <a href="/" className="text-sm underline mt-4">
        Continue as guest (limited)
      </a>
    </div>
  );
}