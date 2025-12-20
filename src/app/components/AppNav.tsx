"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Scan" },
  { href: "/history", label: "History" },
  { href: "/login", label: "Login" },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5">
        <div>
          <div className="text-sm font-semibold">Goodpick</div>
          <div className="text-xs text-neutral-500">Scan food. Get a better pick.</div>
        </div>

        <nav className="flex items-center gap-5 text-sm">
          {items.map((it) => {
            const active = pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={
                  active
                    ? "font-medium text-black"
                    : "text-neutral-600 hover:text-black"
                }
              >
                {it.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}