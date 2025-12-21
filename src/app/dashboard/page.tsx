"use client";

import { Scan, Search } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-10">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">Health Overview</h1>

      {/* --- 核心图表：环形图 --- */}
      <div className="relative mb-8 flex flex-col items-center justify-center rounded-[32px] bg-white p-8 shadow-sm ring-1 ring-neutral-100">
        {/* CSS 简单的环形图模拟 */}
        <div 
            className="relative h-48 w-48 rounded-full"
            style={{
                background: `conic-gradient(
                    #2ECC71 0% 60%, 
                    #F1C40F 60% 85%, 
                    #E74C3C 85% 100%
                )`
            }}
        >
            {/* 中间挖空 */}
            <div className="absolute inset-4 rounded-full bg-white flex flex-col items-center justify-center">
                <span className="text-sm text-neutral-400 uppercase tracking-wide">Score</span>
                <span className="text-5xl font-bold text-neutral-900">85</span>
                <span className="text-emerald-500 font-medium bg-emerald-50 px-2 py-0.5 rounded-full text-xs mt-1">Excellent</span>
            </div>
        </div>
        <p className="mt-6 text-center text-sm text-neutral-500">
           You scanned <span className="font-semibold text-neutral-900">24 products</span> this week. <br/> Keep up the good work!
        </p>
      </div>

      {/* --- 数据统计卡片 (Grid 布局) --- */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Excellent" count={12} color="bg-emerald-500" />
        <StatCard label="Good" count={8} color="bg-emerald-400" />
        <StatCard label="Poor" count={3} color="bg-amber-400" />
        <StatCard label="Bad" count={1} color="bg-rose-500" />
      </div>

      {/* --- 底部 (模拟 Tab Bar) --- */}
      {/* 实际项目中这里应该是 Layout 里的组件 */}
      <div className="fixed bottom-6 left-6 right-6 h-16 rounded-full bg-neutral-900 text-white flex items-center justify-around shadow-2xl">
         <div className="opacity-50">History</div>
         <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center -mt-8 border-4 border-neutral-50">
            <Scan size={24} />
         </div>
         <div className="opacity-100 font-medium">Stats</div>
      </div>
    </div>
  );
}

function StatCard({ label, count, color }: { label: string, count: number, color: string }) {
    return (
        <div className="flex flex-col items-start rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-100">
            <div className={`h-2 w-2 rounded-full ${color} mb-2`} />
            <span className="text-3xl font-bold text-neutral-900">{count}</span>
            <span className="text-sm text-neutral-500">{label}</span>
        </div>
    )
}
