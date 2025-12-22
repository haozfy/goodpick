// src/app/scan-result/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation"; // 读取 URL 参数
import { ScoreRing } from "@/components/ScoreRing";
import { ArrowLeft, CheckCircle, AlertTriangle, XCircle, Share2 } from "lucide-react";
import { Suspense } from "react";

function ScanResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 从 URL 获取数据
  const name = searchParams.get("name") || "Unknown Food";
  const score = parseInt(searchParams.get("score") || "0");
  const reason = searchParams.get("reason") || "No analysis provided.";
  
  // 根据分数决定颜色和建议
  let colorClass = "text-emerald-600";
  let bgClass = "bg-emerald-50";
  let icon = <CheckCircle className="text-emerald-500" size={24} />;
  let verdict = "Excellent Choice";

  if (score < 40) {
    colorClass = "text-rose-600";
    bgClass = "bg-rose-50";
    icon = <XCircle className="text-rose-500" size={24} />;
    verdict = "Try to Avoid";
  } else if (score < 70) {
    colorClass = "text-amber-600";
    bgClass = "bg-amber-50";
    icon = <AlertTriangle className="text-amber-500" size={24} />;
    verdict = "Consume in Moderation";
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 backdrop-blur-md">
        <button 
          onClick={() => router.push("/")} // 返回首页
          className="rounded-full bg-white/80 p-2 shadow-sm transition-transform active:scale-95"
        >
          <ArrowLeft size={20} className="text-neutral-600" />
        </button>
        <h1 className="text-sm font-bold text-neutral-900">Analysis Result</h1>
        <button className="rounded-full bg-white/80 p-2 shadow-sm">
          <Share2 size={20} className="text-neutral-600" />
        </button>
      </div>

      <div className="flex flex-col items-center px-6 pt-4">
        {/* 1. 结果大标题 */}
        <h1 className="text-center text-3xl font-bold text-neutral-900 leading-tight">
          {name}
        </h1>
        <div className={`mt-3 flex items-center gap-2 rounded-full px-4 py-1.5 ${bgClass}`}>
          {icon}
          <span className={`text-sm font-bold ${colorClass}`}>{verdict}</span>
        </div>

        {/* 2. 核心评分环 */}
        <div className="mt-10 mb-10 scale-125">
          <ScoreRing score={score} size="large" />
        </div>

        {/* 3. AI 分析原因卡片 */}
        <div className="w-full rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-neutral-100">
          <h3 className="mb-3 text-sm font-bold text-neutral-400 uppercase tracking-wide">
            Why this score?
          </h3>
          <p className="text-lg font-medium text-neutral-800 leading-relaxed">
            "{reason}"
          </p>
        </div>

        {/* 4. 底部行动按钮 */}
        <div className="mt-8 w-full space-y-3">
          <button 
            onClick={() => router.push("/recs")} 
            className="w-full rounded-2xl bg-neutral-900 py-4 text-center font-bold text-white shadow-lg active:scale-95 transition-transform"
          >
            Find Better Alternatives
          </button>
          <button 
            onClick={() => router.push("/")}
            className="w-full rounded-2xl bg-white py-4 text-center font-bold text-neutral-900 shadow-sm ring-1 ring-neutral-200 active:scale-95 transition-transform"
          >
            Scan Another
          </button>
        </div>
      </div>
    </div>
  );
}

// 必须用 Suspense 包裹，因为用到了 useSearchParams
export default function ScanResultPage() {
  return (
    <Suspense fallback={<div>Loading result...</div>}>
      <ScanResultContent />
    </Suspense>
  );
}
