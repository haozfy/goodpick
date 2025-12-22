"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, CheckCircle, AlertTriangle, Loader2, ScanLine } from "lucide-react";

// 1. 子组件：负责读取参数和显示内容
function ResultContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 页面加载时，去数据库查这个 ID 的数据
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      const supabase = createClient();
      const { data: scan, error } = await supabase
        .from("scans")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) {
        console.error("Error fetching scan:", error);
      } else {
        setData(scan);
      }
      setLoading(false);
    };

    fetchData();
  }, [id]);

  // --- Loading 状态 UI ---
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-neutral-500 font-medium animate-pulse">Retrieving analysis...</p>
      </div>
    );
  }

  // --- 没找到数据 UI ---
  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 text-center">
        <div className="rounded-full bg-neutral-100 p-4 mb-4">
          <ScanLine className="h-8 w-8 text-neutral-400" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900">Scan not found</h2>
        <p className="mt-2 text-neutral-500 mb-8">We couldn't find the analysis results for this item.</p>
        <Link href="/" className="rounded-xl bg-neutral-900 px-6 py-3 text-white font-bold">
          Scan Again
        </Link>
      </div>
    );
  }

  // --- 正常显示结果 ---
  const isBlackCard = data.grade === "black";
  const score = data.score;
  const productName = data.product_name || "Unknown Product";
  const analysis = data.analysis || "No analysis details provided.";

  // 根据黑卡/绿卡决定配色
  const theme = isBlackCard
    ? {
        bg: "bg-neutral-900",
        cardBg: "bg-neutral-800",
        text: "text-white",
        subText: "text-neutral-400",
        accent: "text-red-400",
        border: "border-red-500",
        badge: "bg-red-500/20 text-red-200",
        icon: <AlertTriangle size={16} />,
        gradeText: "Black Card • Avoid"
      }
    : {
        bg: "bg-emerald-50",
        cardBg: "bg-white",
        text: "text-neutral-900",
        subText: "text-emerald-800/70",
        accent: "text-emerald-500",
        border: "border-emerald-500",
        badge: "bg-emerald-100 text-emerald-700",
        icon: <CheckCircle size={16} />,
        gradeText: "Green Card • Safe"
      };

  return (
    <div className={`min-h-screen ${theme.bg} px-6 py-8 transition-colors duration-500`}>
      {/* 顶部导航 */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className={`rounded-full p-2 transition-colors ${isBlackCard ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-neutral-900 shadow-sm hover:bg-emerald-100'}`}>
          <ArrowLeft size={20} />
        </Link>
        <span className={`text-xs font-bold tracking-[0.2em] uppercase ${isBlackCard ? 'text-white/40' : 'text-emerald-900/40'}`}>
          Analysis Result
        </span>
        <div className="w-9"></div> {/* 占位符，保持标题居中 */}
      </div>

      {/* 核心卡片 */}
      <div className={`relative z-10 mx-auto w-full max-w-sm rounded-[2rem] ${theme.cardBg} p-8 shadow-2xl transition-all duration-500`}>
        
        {/* 分数大圆环 */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            {/* 背景圈 */}
            <div className={`h-40 w-40 rounded-full border-[10px] ${isBlackCard ? 'border-neutral-700' : 'border-emerald-100'}`}></div>
            {/* 前景圈 (简单模拟) */}
            <div className={`absolute inset-0 flex items-center justify-center rounded-full border-[10px] ${theme.border} bg-transparent text-6xl font-black ${theme.text}`}>
              {score}
            </div>
            {/* 这里的 score 颜色 */}
            <div className={`absolute inset-0 flex items-center justify-center text-6xl font-black ${isBlackCard ? 'text-white' : 'text-neutral-900'}`}>
              {score}
            </div>
          </div>
        </div>

        {/* 产品名称 */}
        <h1 className={`mb-3 text-center text-2xl font-black leading-tight ${theme.text}`}>
          {productName}
        </h1>
        
        {/* 黑卡/绿卡 标签 */}
        <div className="mb-8 flex justify-center">
          <span className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide ${theme.badge}`}>
            {theme.icon}
            {theme.gradeText}
          </span>
        </div>

        {/* AI 分析短评 */}
        <div className={`mb-10 text-center text-sm leading-relaxed font-medium ${theme.subText}`}>
          "{analysis}"
        </div>

        {/* 底部按钮逻辑 */}
        {isBlackCard ? (
          // 如果是黑卡 -> 推荐替代品
          <div className="space-y-3">
             <Link 
              href={`/recs?originId=${id}`} // 这里的 link 可以带上来源 ID，方便推荐页查询
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 font-bold text-white shadow-lg shadow-emerald-900/20 transition-transform active:scale-95 hover:bg-emerald-400"
            >
              See Healthy Alternatives
            </Link>
            <p className="text-center text-[10px] text-neutral-500 uppercase tracking-wider">
              We found better options for you
            </p>
          </div>
        ) : (
          // 如果是绿卡 -> 继续扫下一个
          <Link href="/" className="flex w-full items-center justify-center rounded-xl bg-neutral-900 py-4 font-bold text-white shadow-lg transition-transform active:scale-95 hover:bg-neutral-800">
            Scan Next Item
          </Link>
        )}
      </div>
    </div>
  );
}

// 2. 主页面：必须用 Suspense 包裹，否则 build 会报错
export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    }>
      <ResultContent />
    </Suspense>
  );
}