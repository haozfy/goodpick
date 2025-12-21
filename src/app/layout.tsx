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
        {/* 1. 这里如果你之前有 <TopNav />，建议先注释掉或删除。
              因为新设计每个页面都有自己独特的顶部标题。
        */}
        
        {/* 页面内容 */}
        {children}

        {/* 2. 全局底部导航栏 */}
        <BottomNav />
      </body>
    </html>
  );
}
