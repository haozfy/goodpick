import { supabaseServer } from "@/lib/supabase/server";

export default async function UserMenu() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <a href="/login">Login</a>;
  }

  const isPro = user.user_metadata?.plan === "pro"; // 先占位

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm">
        {user.email}
      </span>

      {isPro ? (
        <span className="rounded bg-black text-white px-2 py-0.5 text-xs">
          PRO
        </span>
      ) : (
        <span className="rounded border px-2 py-0.5 text-xs">
          Free
        </span>
      )}

      <form action="/auth/logout" method="post">
        <button className="text-sm underline">Logout</button>
      </form>
    </div>
  );
}