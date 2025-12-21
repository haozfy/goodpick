// src/app/account/page.tsx
import { supabaseServer } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Account</h1>

      <div className="rounded-2xl border border-neutral-200 p-4">
        <div className="text-sm text-neutral-500">Email</div>
        <div className="mt-1 text-sm font-medium">{user?.email ?? "-"}</div>
      </div>

      <form action="/auth/signout" method="post">
        <button type="submit" className="h-11 rounded-xl bg-black px-4 text-sm font-medium text-white">
          Logout
        </button>
      </form>
    </main>
  );
}