// src/app/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Scan, Search, ChevronRight, Camera, Loader2 } from "lucide-react";
import { useState, useRef } from "react";

export default function HomePage() {
  const router = useRouter();
  // 定义状态：闲置 | 处理图片中 | AI分析中
  const [status, setStatus] = useState<"idle" | "processing" | "analyzing">("idle");
  // 隐藏的文件输入框引用
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. 点击大按钮 -> 触发隐藏的文件输入框点击
  const handleBigButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 2. 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("processing");

    try {
      // 将图片转换为 Base64 字符串
      const base64Image = await toBase64(file);
      
      setStatus("analyzing");

      // 发送给我们的后端 API
      const response = await fetch("/api/analyze-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      // --- AI 分析成功！ ---
      const aiData = result.data;
      // 为了简单演示，我们先把结果打印出来，并用弹窗显示
      // 下一步我们会把这个数据传到一个漂亮的详情页里
      console.log("AI Result:", aiData);
      alert(`AI 分析结果:\n\n食物: ${aiData.name}\n得分: ${aiData.score}\n原因: ${aiData.reason}`);
      
      // TODO: 将来我们会在这里跳转到详情页，例如：
      // router.push(`/product/ai-result?data=${encodeURIComponent(JSON.stringify(aiData))}`);

    } catch (error) {
      console.error("Error:", error);
      alert("分析失败，请重试。");
    } finally {
      setStatus("idle");
      // 清空输入框，允许重复选择同一张图
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isLoading = status !== "idle";

  return (
    <div className="min-h-screen bg-neutral-50 pb-28">
      {/* 隐藏的文件输入框：accept="image/*" 允许图片，capture="environment" 优先调用后置摄像头 */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        // capture="environment" // 在手机上取消注释这行可以优先调用摄像头而不是相册
        className="hidden" 
      />

      <header className="px-6 pt-14 pb-6">
        <h1 className="text-3xl font-bold text-neutral-900 leading-tight">
          Hello, <br />
          <span className="text-emerald-600">Health Seeker</span>
        </h1>
      </header>

      {/* ... 搜索栏保持不变 ... */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm ring-1 ring-neutral-100">
          <Search size={20} className="text-neutral-400" />
          <input type="text" placeholder="Search product..." className="w-full bg-transparent outline-none text-neutral-900" />
        </div>
      </div>

      {/* --- 核心功能：拍照分析卡片 --- */}
      <div className="px-6 mb-10">
        <div 
            onClick={isLoading ? undefined : handleBigButtonClick} // 加载时禁用点击
            className={`relative overflow-hidden rounded-[32px] bg-neutral-900 p-8 text-white shadow-xl shadow-neutral-200 transition-transform ${isLoading ? "opacity-90 cursor-not-allowed" : "cursor-pointer active:scale-95"}`}
        >
          <div className="relative z-10 flex flex-col items-center text-center">
            
            {/* 动态图标：加载时旋转 */}
            <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 ring-4 ring-emerald-500/20 ${isLoading ? "animate-pulse" : ""}`}>
              {isLoading ? (
                <Loader2 size={32} className="animate-spin" />
              ) : (
                <Camera size={32} strokeWidth={2.5} />
              )}
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight">
              {status === "processing" && "Processing Image..."}
              {status === "analyzing" && "AI Analyzing..."}
              {status === "idle" && "Snap & Judge Food"}
            </h2>
            <p className="mt-2 text-neutral-400 max-w-[200px]">
              {isLoading 
                ? "Please wait a moment." 
                : "Take a photo, let AI judge its healthiness."}
            </p>
            
            <button className="mt-8 w-full rounded-2xl bg-white py-4 text-sm font-bold text-neutral-900">
              {isLoading ? "Analyzing..." : "Take a Photo"}
            </button>
          </div>
          
          {/* 装饰光晕 */}
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-neutral-800 opacity-50 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-900 opacity-40 blur-3xl" />
        </div>
      </div>

      {/* ... 历史记录保持不变 ... */}
      <div className="px-6">
         {/* ... (省略历史记录代码，与之前相同) ... */}
      </div>
    </div>
  );
}

// 工具函数：将文件转换为 Base64 字符串
const toBase64 = (file: File) => new Promise<string | ArrayBuffer | null>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// HistoryItem 组件也保持不变...
function HistoryItem({ href, name, brand, score, time }: any) {
  // ... (省略代码，与之前相同)
  return <div></div> // 占位
}
