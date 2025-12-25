// src/app/layout.tsx
import "./globals.css";
import { Inter } from "next/font/google";
import type { Metadata } from "next";
import BottomNav from "@/components/BottomNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://goodpick.app"),

  title: "GoodPick — Food Scanner",
  description: "Scan packaged foods and get a clean score + healthier alternatives.",

  openGraph: {
    title: "GoodPick — Food Scanner",
    description: "Scan packaged foods and get a clean score + healthier alternatives.",
    url: "https://goodpick.app",
    siteName: "GoodPick",
    type: "website",

    images: [
      {
        // ✅ 用绝对 URL（最稳）
        url: "https://goodpick.app/api/og/scan?v=3",
        width: 1200,
        height: 630,
        alt: "GoodPick Food Scanner",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "GoodPick — Food Scanner",
    description: "Scan packaged foods and get a clean score + healthier alternatives.",
    // ✅ 同样用绝对 URL（避免预览抓不到图）
    images: ["https://goodpick.app/api/og/scan?v=3"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-neutral-50 text-neutral-900`}>
        <div className="pb-[calc(84px+env(safe-area-inset-bottom))]">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}