// src/app/account/page.tsx
import { createClient } from "@/lib/supabase/server";
import { LogOut, CreditCard, Settings, ChevronRight, User } from "lucide-react";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 这里的 isPro 逻辑可以根据你的数据库实际字段调整
  // 暂时模拟为 false，你可以读数据库
  const isPro = false;

  return (
    <div className="min-h-screen bg-neutral-50 pb-28">
      {/* 顶部标题 */}
      <header className="px-6 pt-14 pb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Account</h1>
      </header>

      <div className="px-6 space-y-6">
        {/* --- 1. 个人信息卡片 --- */}
        <div className="flex items-center gap-4 rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-neutral-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
            <User size={32} />
          </div>
          <div className="overflow-hidden">
            <h2 className="text-lg font-bold text-neutral-900">
              {user?.email?.split("@")[0] || "Guest User"}
            </h2>
            <p className="truncate text-sm text-neutral-500">
              {user?.email || "No email provided"}
            </p>
          </div>
        </div>

        {/* --- 2. 会员状态 (替代原来的 Status) --- */}
        <div className={`relative overflow-hidden rounded-[24px] p-6 text-white shadow-lg ${isPro ? "bg-neutral-900" : "bg-emerald-500"}`}>
          <div className="relative z-10">
            <h3 className="text-lg font-bold">
              {isPro ? "Pro Member" : "Free Plan"}
            </h3>
            <p className="mt-1 text-sm opacity-90">
              {isPro 
                ? "You have full access to all features." 
                : "Upgrade to unlock unlimited scans."}
            </p>
            
            {!isPro && (
              <button className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-bold text-emerald-600 transition-transform active:scale-95">
                Upgrade to Pro
              </button>
            )}
          </div>
          {/* 装饰圆圈 */}
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white opacity-20 blur-2xl" />
        </div>

        {/* --- 3. 菜单列表 (Settings & Logout) --- */}
        <div className="overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-neutral-100">
          
          {/* Settings */}
          <button className="flex w-full items-center justify-between border-b border-neutral-50 p-5 transition-colors hover:bg-neutral-50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
                <Settings size={20} />
              </div>
              <span className="font-medium text-neutral-900">Settings</span>
            </div>
            <ChevronRight size={20} className="text-neutral-300" />
          </button>

          {/* Billing */}
          <button className="flex w-full items-center justify-between border-b border-neutral-50 p-5 transition-colors hover:bg-neutral-50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
                <CreditCard size={20} />
              </div>
              <span className="font-medium text-neutral-900">Billing</span>
            </div>
            <ChevronRight size={20} className="text-neutral-300" />
          </button>

          {/* Logout (Form Action) */}
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
