import "./globals.css";
import AuthNav from "./components/AuthNav";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900">
        <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
          <div>
            <div className="text-sm font-semibold">Goodpick</div>
            <div className="text-xs text-neutral-500">Scan food. Get a better pick.</div>
          </div>

          <AuthNav />
        </header>

        <main className="mx-auto max-w-3xl px-6">{children}</main>
      </body>
    </html>
  );
}