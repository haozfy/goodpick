import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/login");

  return (
    <main className="p-4 space-y-2">
      <h1 className="text-xl font-semibold">Account</h1>
      <div className="text-sm text-neutral-600">{data.user.email}</div>
    </main>
  );
}