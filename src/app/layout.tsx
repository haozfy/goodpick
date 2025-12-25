// src/app/layout.tsx
import "./globals.css";
import { Inter } from "next/font/google";
import type { Metadata } from "next";
import BottomNav from "@/components/BottomNav";

const inter = Inter({ subsets: ["latin"] });

/**
 * ✅ 全站默认 Metadata（OG / Twitter）
 * - 用于：首页、普通页面、以及 scan-result 在 metadata.ts 未命中的兜底
 * - scan-result?id=xxx 会被 app/scan-result/metadata.ts 覆盖（方案 B）
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://goodpick.app"),

  title: "GoodPick — Food Scanner",
  description: "Scan packaged foods and get a clean score + healthier alternatives.",

  openGraph: {
    title: "GoodPick — Food Scanner",
    description:
      "Scan packaged foods and get a clean score + healthier alternatives.",
    url: "https://goodpick.app",
    siteName: "GoodPick",
    type: "website",

    // ✅ 默认 OG 图（动态）
    // 没有 id 的情况下，也会生成一张“食品评分 App”风格的图
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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