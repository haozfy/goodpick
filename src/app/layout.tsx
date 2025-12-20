import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Goodpick",
  description: "Scan food. Get a better pick.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900">
        <div className="mx-auto w-full max-w-md px-5 pb-10 pt-6">
          <header className="mb-6 flex items-center justify-between">
            <Link href="/" className="leading-tight">
              <div className="text-sm font-semibold">Goodpick</div>
              <div className="text-xs text-neutral-500">Scan food. Get a better pick.</div>
            </Link>

            <nav className="flex items-center gap-5 text-sm">
              <Link className="text-neutral-700 hover:text-black" href="/history">
                History
              </Link>
              <Link className="text-neutral-700 hover:text-black" href="/login">
                Login
              </Link>
            </nav>
          </header>

          {children}

          <footer className="mt-10 text-center text-[11px] text-neutral-400">
            Not medical advice. For decision support only.
          </footer>
        </div>
      </body>
    </html>
  );
}