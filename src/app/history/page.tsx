import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function HistoryPage() {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">History</h1>
      <p className="mt-2 text-sm text-neutral-600">Signed in as: {data.user.email}</p>
    </main>
  );
}