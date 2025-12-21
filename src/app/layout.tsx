// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import TopNav from "@/components/TopNav";

export const metadata: Metadata = {
  title: "Goodpick",
  description: "Scan food. Get a better pick.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-neutral-900">
        <TopNav />
        <div className="mx-auto w-full max-w-3xl px-4 py-6">{children}</div>
      </body>
    </html>
  );
}