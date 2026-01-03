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

  // ✅ App 图标（桌面 / PWA / iOS）
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },

  openGraph: {
    title: "GoodPick — Food Scanner",
    description:
      "Scan packaged foods and get a clean score + healthier alternatives.",
    url: "https://goodpick.app",
    siteName: "GoodPick",
    type: "website",
    images: [
      {
        url: "/api/og/scan?v=2",
        width: 1200,
        height: 630,
        alt: "GoodPick Food Scanner",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "GoodPick — Food Scanner",
    description:
      "Scan packaged foods and get a clean score + healthier alternatives.",
    images: ["/api/og/scan"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* ✅ 最稳：直接在 head 挂 manifest（兼容所有 Next 版本/类型） */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#ffffff" />
      </head>

      <body className={`${inter.className} bg-neutral-50 text-neutral-900`}>
        {/* 页面内容：给 BottomNav 预留空间，避免被挡 */}
        <div className="pb-[calc(84px+env(safe-area-inset-bottom))]">
          {children}
        </div>

        {/* 全局底部导航栏 */}
        <BottomNav />
      </body>
    </html>
  );
}