// src/app/account/page.tsx
import { createClient } from "@/lib/supabase/server"; // ✅ 1. 改这里：引入正确的函数名

export default async function AccountPage() {
  const supabase = await createClient(); // ✅ 2. 改这里：调用 createClient
  
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
        {/* 注意：这里的 action 路径要确保对应你 api 里的路由路径 */}
        <button type="submit" className="h-11 rounded-xl bg-black px-4 text-sm font-medium text-white">
          Logout
        </button>
      </form>
    </main>
  );
}
