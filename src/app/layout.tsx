import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Goodpick",
  description: "Scan food. Get a better pick.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <div>
              <b>Goodpick</b>
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                Scan food. Get a better pick.
              </div>
            </div>

            <nav style={{ display: "flex", gap: 16, fontSize: 14 }}>
              <Link href="/history">History</Link>
              <Link href="/login">Login</Link>
            </nav>
          </header>

          {children}

          <footer style={{ fontSize: 11, opacity: 0.4, marginTop: 48 }}>
            Not medical advice. For decision support only.
          </footer>
        </div>
      </body>
    </html>
  );
}