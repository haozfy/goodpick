// src/components/UserMenu.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server"; // ✅ 1. 改这里

export default async function UserMenu() {
  // ✅ 2. 改这里
  const supabase = await createClient();
  
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
