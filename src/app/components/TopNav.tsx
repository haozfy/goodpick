// src/app/components/TopNav.tsx
import Link from "next/link";
import UserMenu from "@/app/components/UserMenu";

export default function TopNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-semibold">
            Goodpick
          </Link>
          <span className="text-sm text-neutral-500">Scan food. Get a better pick.</span>
        </div>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-neutral-700 hover:text-black">
            Scan
          </Link>
          <Link href="/history" className="text-neutral-700 hover:text-black">
            History
          </Link>
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}