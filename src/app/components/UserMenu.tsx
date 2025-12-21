// src/components/UserMenu.tsx
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export default async function UserMenu() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Link href="/login" className="text-neutral-700 hover:text-black">
        Login
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/account" className="text-neutral-700 hover:text-black">
        Account
      </Link>

      <form action="/auth/signout" method="post">
        <button type="submit" className="text-neutral-700 hover:text-black">
          Logout
        </button>
      </form>
    </div>
  );
}