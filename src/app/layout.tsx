// src/app/layout.tsx
import "./globals.css";
import Link from "next/link";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900">
        <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
          <div>
            <div className="text-sm font-semibold">Goodpick</div>
            <div className="text-xs text-neutral-500">
              Scan food. Get a better pick.
            </div>
          </div>

          <nav className="flex gap-5 text-sm">
            <Link href="/">Scan</Link>
            <Link href="/history">History</Link>
            <Link href="/login">Login</Link>
          </nav>
        </header>

        <main className="mx-auto max-w-3xl px-6">{children}</main>
      </body>
    </html>
  );
}