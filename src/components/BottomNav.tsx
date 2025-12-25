// src/components/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScanLine, ArrowRightLeft, Clock, User } from "lucide-react";

type Item = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  match?: (pathname: string) => boolean;
};

const items: Item[] = [
  {
    href: "/scan",
    label: "Scan",
    Icon: ScanLine,
    match: (p) => p.startsWith("/scan"),
  },
  {
    href: "/recs",
    label: "Recs",
    Icon: ArrowRightLeft,
    match: (p) => p.startsWith("/recs"),
  },
  {
    href: "/",
    label: "History",
    Icon: Clock,
    match: (p) => p === "/" || p.startsWith("/history"),
  },
  {
    href: "/account",
    label: "Account",
    Icon: User,
    match: (p) => p.startsWith("/account"),
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
            {items.map(({ href, label, Icon, match }) => {
              const active = match ? match(pathname) : pathname === href;

              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  className="group flex w-20 flex-col items-center justify-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
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
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}