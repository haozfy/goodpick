import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/login");

  // 你可以后面改成查 profiles/subscriptions 表
  const isPro = data.user.user_metadata?.plan === "pro";

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Member Area</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Logged in as: <span className="font-medium">{data.user.email}</span>
            {isPro ? <span className="ml-2 rounded-full bg-black px-2 py-1 text-xs text-white">PRO</span> : null}
          </p>
        </div>

        <form action="/auth/signout" method="post">
          <button className="h-10 rounded-xl border border-neutral-200 px-4 text-sm hover:border-neutral-400">
            Logout
          </button>
        </form>
      </div>

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="text-sm font-medium">Status</div>
        <div className="mt-1 text-sm text-neutral-600">{isPro ? "Pro member" : "Free member"}</div>
      </div>
    </main>
  );
}