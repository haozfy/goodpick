"use client";

import { ScoreRing } from "@/components/ScoreRing";
import { ChevronRight, Share2, Bookmark, AlertCircle } from "lucide-react"; // 确保安装 lucide-react

export default function ProductDetail() {
  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* --- 顶部导航 (透明) --- */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 backdrop-blur-md">
        <button className="rounded-full bg-white/80 p-2 shadow-sm">
          <ChevronRight className="rotate-180 text-neutral-600" />
        </button>
        <div className="flex gap-3">
          <button className="rounded-full bg-white/80 p-2 shadow-sm">
            <Share2 size={20} className="text-neutral-600" />
          </button>
          <button className="rounded-full bg-white/80 p-2 shadow-sm">
            <Bookmark size={20} className="text-neutral-600" />
          </button>
        </div>
      </div>

      {/* --- Hero 区域：产品与评分 --- */}
      <div className="flex flex-col items-center px-6 pt-2 pb-8">
        {/* 产品图 (带光晕背景) */}
        <div className="relative mb-6 flex h-48 w-48 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-amber-400 opacity-10 blur-3xl"></div>
          {/* 这里放 <Image /> */}
          <div className="relative h-40 w-32 rounded-lg bg-neutral-200 shadow-lg" /> 
        </div>

        {/* 标题 */}
        <h1 className="text-center text-2xl font-bold text-neutral-900">
          Multi-Grain Baked Crackers
        </h1>
        <p className="mt-1 text-neutral-500">Crunchmaster</p>

        {/* 核心评分组件 */}
        <div className="mt-8">
          <ScoreRing score={38} size="large" />
        </div>
      </div>

      {/* --- 营养分析卡片 (优化版) --- */}
      <div className="px-4 space-y-4">
        {/* 缺点卡片 (默认展开) */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-neutral-100">
          <div className="flex items-center justify-between bg-rose-50 px-5 py-3">
            <h3 className="font-semibold text-rose-600">Negatives</h3>
            <span className="text-xs font-medium text-rose-600 bg-white px-2 py-1 rounded-full">3 issues</span>
          </div>
          <div className="p-5 space-y-6">
            {/* 单项指标：高钠 */}
            <NutritionRow 
              label="Sodium" 
              value="170mg" 
              level="high" 
              context="40% of daily limit" 
            />
            <NutritionRow 
              label="Saturated Fat" 
              value="1.5g" 
              level="medium" 
              context="A bit too fatty"
            />
          </div>
        </div>

        {/* 优点卡片 (折叠状态示例，实际可交互) */}
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-neutral-100 flex justify-between items-center">
             <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">👍</div>
                <h3 className="font-semibold text-neutral-900">Positives</h3>
             </div>
             <ChevronRight className="text-neutral-400" />
        </div>
      </div>

      {/* --- 更好的替代品 (横向滑动) --- */}
      <div className="mt-8">
        <div className="px-6 flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-neutral-900">✨ Better Alternatives</h2>
          <span className="text-sm font-medium text-emerald-600">See all</span>
        </div>
        
        {/* 滑动容器 */}
        <div className="flex gap-4 overflow-x-auto px-6 pb-8 snap-x">
            {/* 替代品卡片 1 */}
            <AlternativeCard name="Whole Grain Crisp" score={85} />
            {/* 替代品卡片 2 */}
            <AlternativeCard name="Organic Seeds" score={92} />
             {/* 替代品卡片 3 */}
            <AlternativeCard name="Rice Thins" score={78} />
        </div>
      </div>
    </div>
  );
}

// 辅助组件：营养行
function NutritionRow({ label, value, level, context }: any) {
  const color = level === 'high' ? 'bg-rose-500' : 'bg-amber-400';
  const width = level === 'high' ? 'w-3/4' : 'w-1/2';
  
  return (
    <div>
      <div className="flex justify-between items-end mb-2">
        <span className="font-medium text-neutral-700">{label}</span>
        <span className="font-bold text-neutral-900">{value}</span>
      </div>
      {/* 进度条 */}
      <div className="h-2 w-full rounded-full bg-neutral-100">
        <div className={`h-2 rounded-full ${color} ${width}`} />
      </div>
      <p className="mt-1 text-xs text-neutral-400">{context}</p>
    </div>
  );
}

// 辅助组件：替代品卡片
function AlternativeCard({ name, score }: { name: string, score: number }) {
    return (
        <div className="min-w-[160px] snap-center rounded-2xl bg-white p-3 shadow-sm ring-1 ring-neutral-100">
            <div className="relative mb-3 h-24 w-full rounded-xl bg-neutral-50 flex items-center justify-center">
                {/* 模拟图片 */}
                <div className="h-16 w-12 bg-neutral-200 rounded shadow-sm" />
                <div className="absolute top-2 right-2">
                   <div className="h-6 w-6 rounded-full bg-emerald-500 text-[10px] text-white flex items-center justify-center font-bold">
                       {score}
                   </div>
                </div>
            </div>
            <h4 className="font-semibold text-sm text-neutral-800 leading-tight">{name}</h4>
            <span className="text-xs text-emerald-600 font-medium">Excellent match</span>
        </div>
    )
}
