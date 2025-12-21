// src/app/layout.tsx
import "./globals.css";
import TopNav from "@/app/components/TopNav";

export const metadata = {
  title: "Goodpick",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TopNav />
        {children}
      </body>
    </html>
  );
}