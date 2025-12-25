// src/components/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ScanLine,
  Sparkles,
  LineChart,
  UserCircle2,
} from "lucide-react";

type Item = {
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (pathname: string) => boolean;
  primary?: boolean;
};

export default function BottomNav() {
  const pathname = usePathname();

  const items: Item[] = [
    {
      href: "/",
      label: "Scan",
      icon: <ScanLine className="h-[22px] w-[22px]" />,
      match: (p) => p === "/",
      primary: true,
    },
    {
      href: "/recs",
      label: "Recs",
      icon: <Sparkles className="h-[22px] w-[22px]" />,
      match: (p) => p === "/recs" || p.startsWith("/recs/"),
    },
    {
      href: "/dashboard",
      label: "Insight",
      icon: <LineChart className="h-[22px] w-[22px]" />,
      match: (p) => p === "/dashboard" || p.startsWith("/dashboard/"),
    },
    {
      href: "/account",
      label: "Account",
      icon: <UserCircle2 className="h-[22px] w-[22px]" />,
      match: (p) => p === "/account" || p.startsWith("/account/"),
    },
  ];

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-50"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)",
      }}
    >
      <div className="mx-auto max-w-md px-4">
        <div className="rounded-[28px] bg-white/80 backdrop-blur-xl ring-1 ring-black/5 shadow-[0_10px_30px_rgba(0,0,0,0.10)]">
          <div className="grid grid-cols-4 px-2 py-2">
            {items.map((it) => (
              <NavItem
                key={it.href}
                href={it.href}
                label={it.label}
                icon={it.icon}
                active={it.match(pathname)}
                primary={it.primary}
              />
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  icon,
  active,
  primary,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "group flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2",
        "transition active:scale-[0.98]", // 只给按压反馈，不做“潮UI抖动”
        active ? "text-neutral-950" : "text-neutral-500 hover:text-neutral-700",
      ].join(" ")}
    >
      <span
        className={[
          "flex items-center justify-center rounded-2xl",
          primary ? "h-11 w-14" : "h-10 w-12",
          active
            ? "bg-neutral-950 text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)] ring-1 ring-white/10"
            : "bg-transparent group-hover:bg-neutral-100",
        ].join(" ")}
      >
        {icon}
      </span>

      <span
        className={[
          "text-[11px] leading-none tracking-[0.02em]",
          active ? "text-neutral-950" : "text-neutral-500",
        ].join(" ")}
      >
        {label}
      </span>
    </Link>
  );
}