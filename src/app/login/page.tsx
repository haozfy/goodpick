"use client";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  return (
    <main className="p-4">
      <section className="rounded-xl border bg-white p-4 space-y-3">
        <h1 className="text-lg font-semibold">Login</h1>

        <button
          onClick={async () => {
            await supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: window.location.origin },
            });
          }}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        >
          Continue with Google
        </button>
      </section>
    </main>
  );
}