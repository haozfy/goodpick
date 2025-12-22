import { createClient } from "@/lib/supabase/server";
import { LogOut, CreditCard, Settings, ChevronRight, User } from "lucide-react";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isPro = false;

  if (user) {
    const admin = supabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_pro")
      .eq("id", user.id)
      .single();

    isPro = !!profile?.is_pro;
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-28">
      <header className="px-6 pt-14 pb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Account</h1>
      </header>

      <div className="px-6 space-y-6">
        <div className="flex items-center gap-4 rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-neutral-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
            <User size={32} />
          </div>
          <div className="overflow-hidden">
            <h2 className="text-lg font-bold text-neutral-900">
              {user?.email?.split("@")[0] || "Guest User"}
            </h2>
            <p className="truncate text-sm text-neutral-500">
              {user?.email || "Not signed in"}
            </p>
          </div>
        </div>

        <div className={`relative overflow-hidden rounded-[24px] p-6 text-white shadow-lg ${isPro ? "bg-neutral-900" : "bg-emerald-500"}`}>
          <div className="relative z-10">
            <h3 className="text-lg font-bold">{isPro ? "Pro Member" : "Free Plan"}</h3>
            <p className="mt-1 text-sm opacity-90">
              {isPro ? "You have full access to all features." : "Upgrade to unlock unlimited scans."}
            </p>

            {!isPro && (
              <Link
                href="/paywall"
                className="mt-4 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-bold text-emerald-600 transition-transform active:scale-95"
              >
                Upgrade to Pro
              </Link>
            )}
          </div>
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white opacity-20 blur-2xl" />
        </div>

        <div className="overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-neutral-100">
          <button className="flex w-full items-center justify-between border-b border-neutral-50 p-5 transition-colors hover:bg-neutral-50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
                <Settings size={20} />
              </div>
              <span className="font-medium text-neutral-900">Settings</span>
            </div>
            <ChevronRight size={20} className="text-neutral-300" />
          </button>

          <button className="flex w-full items-center justify-between border-b border-neutral-50 p-5 transition-colors hover:bg-neutral-50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
                <CreditCard size={20} />
              </div>
              <span className="font-medium text-neutral-900">Billing</span>
            </div>
            <ChevronRight size={20} className="text-neutral-300" />
          </button>

          <form action="/auth/signout" method="post">
            <button type="submit" className="flex w-full items-center justify-between p-5 transition-colors hover:bg-rose-50 group">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500 group-hover:bg-rose-100">
                  <LogOut size={20} />
                </div>
                <span className="font-medium text-rose-600">Log Out</span>
              </div>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}