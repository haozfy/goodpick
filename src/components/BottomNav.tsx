// src/components/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Clock, User, ArrowRightLeft } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/" || pathname.startsWith("/history");
    return pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-6 left-6 right-6 z-50">
      <div className="flex h-16 items-center justify-around rounded-full bg-white/90 px-2 shadow-2xl ring-1 ring-neutral-200/50 backdrop-blur-lg">
        
        {/* Scan */}
        <NavLink
          href="/scan"
          icon={<Search size={24} />}
          active={isActive("/scan")}
        />

        {/* Recs */}
        <NavLink
          href="/recs"
          icon={<ArrowRightLeft size={24} />}
          active={isActive("/recs")}
        />

        {/* History */}
        <NavLink
          href="/"
          icon={<Clock size={24} />}
          active={isActive("/")}
        />

        {/* Account */}
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
      aria-label={typeof href === "string" ? href : undefined}
      className={[
        "flex h-12 w-12 items-center justify-center rounded-full transition-all",
        active
          ? "bg-neutral-900 text-white shadow-md scale-105"
          : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600",
      ].join(" ")}
    >
      {icon}
    </Link>
  );
}