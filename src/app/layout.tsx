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
        <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
          <header style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <b>Goodpick</b>
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                Scan food. Get a better pick.
              </div>
            </div>
            <Link href="/history">History</Link>
          </header>

          {children}

          <footer style={{ fontSize: 11, opacity: 0.4, marginTop: 40 }}>
            Not medical advice. For decision support only.
          </footer>
        </div>
      </body>
    </html>
  );
}