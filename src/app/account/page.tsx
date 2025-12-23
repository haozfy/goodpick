// src/app/account/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  LogOut,
  Settings,
  ChevronRight,
  User,
  Loader2,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AccountPage() {
  const [loading, setLoading] = useState(false); // 升级按钮 Loading
  const [portalLoading, setPortalLoading] = useState(false); // 门户按钮 Loading
  const router = useRouter();

  const [user, setUser] = useState({
    email: "user@example.com",
    isPro: false,
  });

  // 获取真实用户数据（profiles.is_pro）
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_pro")
          .eq("id", authUser.id)
          .single();

        setUser({
          email: authUser.email || "No Email",
          isPro: profile?.is_pro || false,
        });
      }
    };

    fetchUser();
  }, []);

  // 升级付费
  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Failed to start checkout");
    } catch {
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // 管理订阅
  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Failed to open portal. (Are you sure you have a subscription?)");
    } catch {
      alert("Error opening portal");
    } finally {
      setPortalLoading(false);
    }
  };

  // 登出
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-28">
      {/* 顶部标题 */}
      <header className="px-6 pt-14 pb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Account</h1>
      </header>

      <div className="px-6 space-y-6">
        {/* 1) 个人信息卡片 */}
        <div className="flex items-center gap-4 rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-neutral-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
            <User size={32} />
          </div>
          <div className="overflow-hidden">
            <h2 className="text-lg font-bold text-neutral-900">
              {user.email?.split("@")[0] || "Guest"}
            </h2>
            <p className="truncate text-sm text-neutral-500">{user.email}</p>
          </div>
        </div>

        {/* 2) 会员状态卡片 */}
        <div
          className={`relative overflow-hidden rounded-[24px] p-6 text-white shadow-lg transition-all ${
            user.isPro ? "bg-neutral-900" : "bg-emerald-500"
          }`}
        >
          <div className="relative z-10">
            <h3 className="text-lg font-bold flex items-center gap-2">
              {user.isPro ? "Pro Member" : "Free Plan"}
              {user.isPro && <Sparkles size={18} className="text-yellow-400" />}
            </h3>

            <p className="mt-1 text-sm opacity-90 max-w-[260px] leading-relaxed">
              {user.isPro
                ? "You have full access to unlimited scans and personalized preferences."
                : "Upgrade to unlock unlimited scans and more personalized recommendations."}
            </p>

            {!user.isPro && (
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={loading}
                className="mt-6 flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-600 shadow-sm active:scale-95 transition-transform disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <CreditCard size={16} />
                )}
                {loading ? "Processing..." : "Upgrade for $9.99"}
              </button>
            )}
          </div>

          {/* 装饰背景 */}
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white opacity-20 blur-2xl" />
          <div className="absolute bottom-0 right-0 p-6 opacity-10">
            <CreditCard size={64} />
          </div>
        </div>

        {/* 3) 设置列表 */}
        <div className="overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-neutral-100">
          {/* ✅ App Settings 入口：跳转到 /account/settings */}
          <button
            type="button"
            onClick={() => router.push("/account/settings")}
            className="flex w-full items-center justify-between border-b border-neutral-50 p-5 hover:bg-neutral-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Settings size={20} className="text-neutral-400" />
              <div className="text-left">
                <div className="font-medium text-neutral-900">App Settings</div>
                <div className="text-xs text-neutral-500">
                  Diet preferences (low sodium, low sugar, no sweeteners…)
                </div>
              </div>
            </div>
            <ChevronRight size={20} className="text-neutral-300" />
          </button>

          {/* 仅 Pro 用户显示：管理订阅 */}
          {user.isPro && (
            <button
              type="button"
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="flex w-full items-center justify-between border-b border-neutral-50 p-5 hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                {portalLoading ? (
                  <Loader2 size={20} className="text-emerald-500 animate-spin" />
                ) : (
                  <CreditCard size={20} className="text-neutral-400" />
                )}
                <span className="font-medium text-neutral-900">
                  {portalLoading ? "Opening Portal..." : "Manage Subscription"}
                </span>
              </div>
              <ChevronRight size={20} className="text-neutral-300" />
            </button>
          )}

          {/* 登出 */}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center justify-between p-5 hover:bg-rose-50 text-rose-600 group transition-colors"
          >
            <div className="flex items-center gap-3">
              <LogOut size={20} className="text-rose-400 group-hover:text-rose-600" />
              <span className="font-medium">Log Out</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
