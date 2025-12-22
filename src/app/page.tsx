// src/app/page.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, ScanLine, History } from "lucide-react";

export default function Home() {
  // 状态管理：是否正在分析中
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // 引用隐藏的文件输入框
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // 1. 点击巨大的扫描按钮时的动作
  const handleScanClick = () => {
    // 如果正在分析，点按钮没反应，防止重复提交
    if (!isAnalyzing) {
      // 触发隐藏的 input 点击事件，唤起系统相机/图库
      fileInputRef.current?.click();
    }
  };

  // 2. 用户选中图片后的处理逻辑 (核心!)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 如果用户取消了选择，直接返回
    if (!file) return;

    // 开始 loading 状态
    setIsAnalyzing(true);

    // 使用 FileReader 把图片文件转换为 Base64 字符串
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Img = reader.result as string;

      try {
        console.log("Sending image to AI brain...");
        // 发送 POST 请求给我们的后端 API
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64Img }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Analysis failed");
        }

        console.log("Analysis success! ID:", data.id);
        // 分析成功，拿到数据库里的 ID，跳转到结果页
        router.push(`/scan-result?id=${data.id}`);

      } catch (error: any) {
        console.error("Scan error:", error);
        alert(error.message || "Something went wrong trying to analyze the image.");
        // 发生错误，停止 loading 状态，让用户能再次尝试
        setIsAnalyzing(false);
        // 清空 input，否则同样的图片选第二次不会触发 onChange
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.onerror = () => {
      alert("Failed to read image file.");
      setIsAnalyzing(false);
    };
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-neutral-50/50 px-6 pt-16 pb-24 relative overflow-hidden">
      {/* 背景装饰效果 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-400/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      {/* 1. 头部 Header */}
      <div className="mb-16 text-center relative z-10">
        <div className="inline-flex items-center justify-center p-3 mb-4 bg-white rounded-2xl shadow-sm border border-neutral-100">
          <ScanLine size={28} className="text-emerald-600" />
        </div>
        <h1 className="text-5xl font-black text-neutral-900 tracking-tighter leading-tight">
          Good<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Pick</span>
        </h1>
        <p className="mt-4 text-lg font-medium text-neutral-500 max-w-xs mx-auto leading-relaxed">
          Your pocket food analyst. Spot hidden traps instantly.
        </p>
      </div>

      {/* 隐藏的文件输入框 (用来调用相机) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment" // 优先使用后置摄像头
        className="hidden"
      />

      {/* 2. 核心交互：扫描按钮 */}
      <div className="relative z-10 group">
        {/* 按钮背后的呼吸光环效果 (只在非加载状态显示) */}
        {!isAnalyzing && (
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping-slow pointer-events-none"></div>
        )}
        <button 
          onClick={handleScanClick}
          disabled={isAnalyzing}
          className="relative flex h-56 w-56 items-center justify-center rounded-full bg-gradient-to-br from-neutral-900 to-neutral-800 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-4 border-neutral-800/50 transition-all duration-300 active:scale-95 active:shadow-[0_10px_30px_rgba(0,0,0,0.2)] disabled:opacity-90 disabled:scale-100 overflow-hidden"
        >
          {/* 内部发光环 */}
          <div className={`absolute inset-2 rounded-full border-[3px] transition-all duration-500 ${isAnalyzing ? 'border-emerald-500/80 animate-spin-slow' : 'border-white/10 group-hover:border-emerald-500/50'}`}></div>
          
          <div className="flex flex-col items-center gap-3 relative z-10">
            {isAnalyzing ? (
              // 加载状态显示
              <>
                <Loader2 size={56} className="text-emerald-400 animate-spin drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                <span className="font-bold text-white text-sm tracking-[0.2em] animate-pulse">ANALYZING</span>
              </>
            ) : (
              // 正常状态显示
              <>
                <Camera size={56} className="text-white transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]" />
                <span className="font-black text-2xl text-white tracking-wider">SCAN</span>
              </>
            )}
          </div>
          
          {/* 扫描时的光波动画 */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent animate-scan pointer-events-none"></div>
          )}
        </button>
      </div>
      
      <p className="mt-8 text-sm font-semibold text-neutral-400 uppercase tracking-widest relative z-10">
        Tap to snap ingredients
      </p>

      {/* 3. 最近记录占位符 (下一步我们会让这里显示真数据) */}
      <div className="mt-auto w-full max-w-sm relative z-10">
         <div className="flex items-center justify-between mb-4 px-1">
           <h2 className="text-sm font-bold text-neutral-700 flex items-center gap-2">
             <History size={16} className="text-neutral-400"/> Recent Activity
           </h2>
         </div>
         {/* 暂时用一个灰色占位符表示 */}
         <div className="rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-neutral-100/50 flex items-center justify-between opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0 cursor-not-allowed">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-lg font-black text-neutral-400">
                ?
              </div>
              <div>
                <h3 className="font-bold text-neutral-700 text-sm">No recent scans yet</h3>
                <p className="text-xs text-neutral-400">Your history will appear here</p>
              </div>
            </div>
         </div>
      </div>
    </main>
  );
}