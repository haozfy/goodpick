"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
      } else {
        setEmail(data.user.email ?? null);
      }
    });
  }, [router]);

  return (
    <main className="p-4 space-y-4">
      <section className="rounded-xl border bg-white p-4">
        <h1 className="text-lg font-semibold">Account</h1>
        <p className="text-sm text-neutral-500">{email}</p>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/");
          }}
          className="mt-4 rounded-lg border px-3 py-2 text-sm"
        >
          Logout
        </button>
      </section>
    </main>
  );
}}