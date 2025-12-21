import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="flex justify-between items-center px-6 py-4 border-b">
          <div className="font-semibold">Goodpick</div>
          <nav className="flex gap-4 text-sm">
            <a href="/scan">Scan</a>
            <a href="/history">History</a>
            <a href="/login">Login</a>
          </nav>
        </header>

        {children}
      </body>
    </html>
  );
}