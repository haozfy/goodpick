// src/components/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, ArrowRightLeft, ScanLine, PieChart } from "lucide-react";

type Item = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  kind?: "normal" | "primary";
  match?: (pathname: string) => boolean;
};

const items: Item[] = [
  {
    href: "/",
    label: "History",
    Icon: Clock,
    kind: "normal",
    match: (p) => p === "/" || p.startsWith("/history"),
  },
  {
    href: "/recs",
    label: "Recs",
    Icon: ArrowRightLeft,
    kind: "normal",
    match: (p) => p.startsWith("/recs"),
  },
  {
    href: "/scan",
    label: "Scan",
    Icon: ScanLine,
    kind: "primary",
    match: (p) => p.startsWith("/scan"),
  },
  {
    href: "/overview",
    label: "Overview",
    Icon: PieChart,
    kind: "normal",
    match: (p) => p.startsWith("/overview"),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed bottom-0 left-0 right-0 z-50 pb-[max(env(safe-area-inset-bottom),12px)]"
    >
      <div className="mx-auto w-full max-w-md px-4">
        <div className="rounded-2xl bg-white/85 shadow-[0_10px_30px_rgba(0,0,0,0.10)] ring-1 ring-black/5 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-2">
            {items.map((it) => {
              const active = it.match ? it.match(pathname) : pathname === it.href;
              return (
                <NavItem key={it.href} item={it} active={active} />
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavItem({ item, active }: { item: Item; active: boolean }) {
  const { href, label, Icon, kind = "normal" } = item;

  // 主按钮（Scan）略强调：更大一点、按压反馈更清晰
  if (kind === "primary") {
    return (
      <Link
        href={href}
        aria-label={label}
        className={[
          "group relative flex w-20 flex-col items-center justify-center",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        ].join(" ")}
      >
        <div
          className={[
            "flex h-12 w-12 items-center justify-center rounded-xl transition-all",
            active
              ? "bg-neutral-900 text-white shadow-sm"
              : "bg-neutral-900 text-white shadow-sm opacity-90 group-hover:opacity-100",
            "active:scale-[0.97]",
          ].join(" ")}
        >
          <Icon size={22} strokeWidth={2.2} />
        </div>
        <span
          className={[
            "mt-1 text-[11px] transition-colors",
            active ? "text-neutral-900" : "text-neutral-500",
          ].join(" ")}
        >
          {label}
        </span>
      </Link>
    );
  }

  // 普通按钮：克制的高亮（不加圆背景、不缩放）
  return (
    <Link
      href={href}
      aria-label={label}
      className={[
        "group flex w-20 flex-col items-center justify-center gap-1",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
          active
            ? "text-neutral-900"
            : "text-neutral-400 group-hover:text-neutral-600",
        ].join(" ")}
      >
        <Icon size={22} strokeWidth={active ? 2.2 : 1.9} />
      </div>
      <span
        className={[
          "text-[11px] transition-colors",
          active ? "text-neutral-900" : "text-neutral-500",
        ].join(" ")}
      >
        {label}
      </span>
    </Link>
  );
}