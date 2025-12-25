// src/components/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, User, ArrowRightLeft, Camera } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed bottom-6 left-6 right-6 z-50">
      <div
        className={[
          "relative flex h-16 items-center justify-between",
          "rounded-full px-3",
          // 更高级的“玻璃”质感：亮但不廉价
          "bg-white/80 backdrop-blur-xl",
          "shadow-[0_18px_50px_-20px_rgba(0,0,0,0.45)]",
          "ring-1 ring-neutral-200/70",
        ].join(" ")}
      >
        {/* 左侧：Recs */}
        <NavLink
          href="/recs"
          icon={<ArrowRightLeft size={22} />}
          label="Recs"
          active={isActive("/recs")}
        />

        {/* 中间：主按钮 Scan */}
        <PrimaryScanButton href="/scan" active={isActive("/scan")} />

        {/* 右侧：History + Account */}
        <div className="flex items-center gap-2">
          <NavLink
            href="/dashboard"
            icon={<Clock size={22} />}
            label="History"
            active={isActive("/dashboard")}
          />
          <NavLink
            href="/account"
            icon={<User size={22} />}
            label="Account"
            active={isActive("/account")}
          />
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "group flex h-12 w-12 items-center justify-center rounded-full",
        "transition-all duration-200",
        active
          ? [
              // Active 更克制：不再大黑块，而是“浅底+深字”
              "bg-neutral-900/6 text-neutral-900",
              "ring-1 ring-neutral-900/10",
              "shadow-[0_10px_30px_-18px_rgba(0,0,0,0.35)]",
            ].join(" ")
          : [
              "text-neutral-500",
              "hover:bg-neutral-900/5 hover:text-neutral-800",
            ].join(" "),
      ].join(" ")}
      aria-label={label}
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
        // 浮起
        "absolute left-1/2 -translate-x-1/2 -top-7",
        "h-[68px] w-[68px] rounded-full",
        "flex items-center justify-center",
        "transition-all duration-200",
        // 更像“硬件按钮”的质感：深色渐变 + 高光边 + 阴影
        "bg-gradient-to-b from-neutral-900 to-neutral-800 text-white",
        "shadow-[0_22px_60px_-24px_rgba(0,0,0,0.75)]",
        "ring-1 ring-white/25",
        // Hover/Active
        "hover:brightness-105 active:scale-[0.98]",
        active ? "outline outline-2 outline-neutral-900/10" : "",
      ].join(" ")}
      aria-label="Scan another"
    >
      <Camera size={26} />
    </Link>
  );
}