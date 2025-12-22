"use client"; // 为了演示交互，先用 client，实际最好用 server component 读参数

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";

export default function ResultPage() {
  const searchParams = useSearchParams();
  // 实际开发中，这里应该根据 id 去 Supabase fetch 数据
  // 现在我们先 Mock 一下数据来展示 UI 效果
  const isBlackCard = true; // 假设这是一个黑卡产品
  const score = 35; 
  
  return (
    <div className={`min-h-screen ${isBlackCard ? 'bg-neutral-900' : 'bg-emerald-50'} px-6 py-8`}>
      {/* 顶部导航 */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className={`rounded-full p-2 ${isBlackCard ? 'bg-white/10 text-white' : 'bg-white text-neutral-900'}`}>
          <ArrowLeft size={20} />
        </Link>
        <span className={`text-sm font-bold tracking-widest uppercase ${isBlackCard ? 'text-white/50' : 'text-emerald-900/50'}`}>
          Analysis Result
        </span>
        <div className="w-9"></div> {/* 占位 */}
      </div>

      {/* 核心卡片 */}
      <div className="relative z-10 mx-auto w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl transition-all">
        
        {/* 分数大圆环 */}
        <div className="mb-6 flex justify-center">
          <div className={`flex h-32 w-32 items-center justify-center rounded-full border-8 text-5xl font-black ${isBlackCard ? 'border-neutral-900 text-neutral-900' : 'border-emerald-500 text-emerald-500'}`}>
            {score}
          </div>
        </div>

        <h1 className="mb-2 text-center text-2xl font-black text-neutral-900">
          Coke Zero
        </h1>
        
        {/* 标签 */}
        <div className="mb-6 flex justify-center">
          <span className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide ${isBlackCard ? 'bg-neutral-100 text-neutral-600' : 'bg-emerald-100 text-emerald-700'}`}>
            {isBlackCard ? <AlertTriangle size={14}/> : <CheckCircle size={14}/>}
            {isBlackCard ? 'Black Card • Avoid' : 'Green Card • Safe'}
          </span>
        </div>

        <div className="mb-8 space-y-4 text-sm text-neutral-600">
          <p>⚠️ <strong>High Processed:</strong> Contains Aspartame and other artificial sweeteners.</p>
          <p>📉 <strong>Gut Health:</strong> May negatively impact gut microbiome.</p>
        </div>

        {/* 行动按钮 */}
        {isBlackCard ? (
          <Link href="/recs" className="flex w-full items-center justify-center rounded-xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-200 transition-transform active:scale-95">
            See Healthy Alternatives
          </Link>
        ) : (
          <Link href="/" className="flex w-full items-center justify-center rounded-xl bg-neutral-900 py-4 font-bold text-white transition-transform active:scale-95">
            Scan Next Item
          </Link>
        )}
      </div>
    </div>
  );
}