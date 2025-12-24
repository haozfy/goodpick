// src/app/layout.tsx
import "./globals.css";
import { Inter } from "next/font/google";
import BottomNav from "@/components/BottomNav"; // 引入新组件

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "GoodPick",
  description: "Scan smarter, eat better.",
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