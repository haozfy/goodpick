// src/components/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Clock, User, ArrowRightLeft, Camera } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed bottom-6 left-6 right-6 z-50">
      <div className="relative flex h-16 items-center justify-around rounded-full bg-white/90 px-2 shadow-2xl ring-1 ring-neutral-200/50 backdrop-blur-lg">
        {/* 左侧两个 tab */}
        <NavLink
          href="/"
          icon={<Search size={24} />}
          active={isActive("/")}
        />
        <NavLink
          href="/recs"
          icon={<ArrowRightLeft size={24} />}
          active={isActive("/recs")}
        />

        {/* 中间主按钮：拍下一张 */}
        <PrimaryScanButton href="/scan" active={isActive("/scan")} />

        {/* 右侧两个 tab */}
        <NavLink
          href="/dashboard"
          icon={<Clock size={24} />}
          active={isActive("/dashboard")}
        />
        <NavLink
          href="/account"
          icon={<User size={24} />}
          active={isActive("/account")}
        />
      </div>
    </nav>
  );
}

function NavLink({
  href,
  icon,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
        active
          ? "bg-neutral-900 text-white shadow-md transform scale-105"
          : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {icon}
    </Link>
  );
}

function PrimaryScanButton({ href, active }: { href: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={[
        // 让按钮“浮”起来
        "absolute left-1/2 -translate-x-1/2 -top-6",
        "h-16 w-16 rounded-full",
        "flex items-center justify-center",
        "shadow-2xl ring-1 ring-neutral-200/60",
        // 视觉主色：默认黑（你以后换品牌色就改这里）
        active ? "bg-neutral-900 text-white" : "bg-neutral-900 text-white hover:opacity-95",
        "transition-all",
      ].join(" ")}
      aria-label="拍下一张"
    >
      <Camera size={26} />
    </Link>
  );
}