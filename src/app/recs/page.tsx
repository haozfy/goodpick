"use client";

import Link from "next/link";
import { ArrowRight, Check, X, ChevronRight } from "lucide-react";

// 模拟数据：你的后台应该返回这种成对的数据 (original vs replacement)
const recommendations = [
  {
    id: 1,
    bad: {
      name: "Chili Pepper Pumpkin Crackers",
      brand: "Eve's Crackers",
      score: 35,
    },
    good: {
      name: "Multi-Grain Baked Crackers",
      brand: "Crunchmaster",
      score: 72,
    },
  },
  {
    id: 2,
    bad: {
      name: "Sweetened Corn Flakes",
      brand: "Kellogg's",
      score: 28,
    },
    good: {
      name: "Organic Oat Bran",
      brand: "Nature's Path",
      score: 95,
    },
  },
  {
    id: 3,
    bad: {
      name: "Hazelnut Spread with Cocoa",
      brand: "Nutella",
      score: 15,
    },
    good: {
      name: "Dark Chocolate Almond Spread",
      brand: "Lindt",
      score: 65,
    },
  },
];

export default function RecommendationsPage() {
  return (
    <div className="min-h-screen bg-neutral-50 pb-28">
      {/* 顶部标题 */}
      <div className="sticky top-0 z-10 bg-neutral-50/80 px-6 pt-14 pb-4 backdrop-blur-md">
        <h1 className="text-3xl font-bold text-neutral-900">Smart Swaps</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Better alternatives based on your history.
        </p>
      </div>

      {/* 列表区域 */}
      <div className="space-y-5 px-6">
        {recommendations.map((item) => (
          <SwapCard key={item.id} data={item} />
        ))}
      </div>
      
      {/* 底部导航占位 (Layout中处理) */}
    </div>
  );
}

// 核心组件：替换卡片
function SwapCard({ data }: { data: any }) {
  return (
    <div className="relative flex items-stretch rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-neutral-100 transition-all active:scale-[0.98]">
      
      {/* 左侧：坏产品 (视觉弱化) */}
      <div className="flex w-[40%] flex-col items-center justify-center opacity-70 grayscale-[0.3]">
        <div className="relative mb-3 h-20 w-20 flex-shrink-0">
           {/* 模拟图片 */}
           <div className="h-full w-full rounded-xl bg-neutral-100 object-cover" />
           
           {/* 红色 X 标记 */}
           <div className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-rose-100">
             <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white">
                <X size={12} strokeWidth={3} />
             </div>
           </div>

           {/* 红色分数标签 */}
           <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-rose-500 shadow-sm ring-1 ring-neutral-100">
             {data.bad.score} Poor
           </div>
        </div>
        <div className="w-full text-center">
           <h3 className="truncate text-xs font-medium text-neutral-600">{data.bad.name}</h3>
           <p className="truncate text-[10px] text-neutral-400">{data.bad.brand}</p>
        </div>
      </div>

      {/* 中间：箭头 (引导视线) */}
      <div className="flex flex-1 flex-col items-center justify-center text-neutral-300">
        <ArrowRight size={20} strokeWidth={2.5} />
      </div>

      {/* 右侧：好产品 (视觉强调 - 更大、更亮) */}
      <Link href="/product" className="group flex w-[45%] flex-col items-center justify-center">
        <div className="relative mb-3 h-24 w-24 flex-shrink-0 transition-transform group-active:scale-95">
           {/* 模拟图片 */}
           <div className="h-full w-full rounded-2xl bg-white object-cover shadow-lg shadow-neutral-200 ring-1 ring-neutral-50" />
           
           {/* 绿色对勾标记 (带光晕) */}
           <div className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-emerald-50">
             <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-200">
                <Check size={14} strokeWidth={3} />
             </div>
           </div>

           {/* 绿色分数标签 (强调) */}
           <div className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-md shadow-emerald-200">
             <span>{data.good.score}</span>
             <span>Good</span>
           </div>
        </div>
        
        <div className="mt-1 w-full text-center">
           <h3 className="truncate text-sm font-bold text-neutral-900">{data.good.name}</h3>
           <p className="truncate text-xs font-medium text-emerald-600">{data.good.brand}</p>
        </div>
      </Link>
    </div>
  );
}
