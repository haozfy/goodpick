import "./globals.css";
import TopNav from "@/components/TopNav";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50">
        <TopNav />
        <div className="mx-auto max-w-xl">{children}</div>
      </body>
    </html>
  );
}