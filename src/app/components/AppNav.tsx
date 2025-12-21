"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TopNav() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  async function logout() {
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between">
      <div className="font-semibold">Goodpick</div>

      <div className="flex items-center gap-4 text-sm">
        {!user && (
          <button
            onClick={() => router.push("/login")}
            className="text-neutral-600 hover:text-black"
          >
            Login
          </button>
        )}

        {user && (
          <>
            <button
              onClick={() => router.push("/account")}
              className="text-neutral-600 hover:text-black"
            >
              Account
            </button>

            <button
              onClick={logout}
              className="text-neutral-600 hover:text-black"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}