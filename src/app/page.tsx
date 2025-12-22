// src/app/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { Scan, Search, Camera, Loader2, ChevronRight } from "lucide-react";
import { useState, useRef } from "react";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  
  // 状态：idle | processing(压缩) | analyzing(图片AI) | searching(文字AI)
  const [status, setStatus] = useState<"idle" | "processing" | "analyzing" | "searching">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState(""); // 存储搜索词

  // --- 1. 处理文字搜索 ---
  const handleSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      setStatus("searching");
      
      try {
        const response = await fetch("/api/search-food", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        const aiData = result.data;

        // 构造 URL 并跳转到结果页 (复用 Scan Result 页！)
        const params = new URLSearchParams({
          name: aiData.name,
          score: aiData.score.toString(),
          reason: aiData.reason,
        });
        
        router.push(`/scan-result?${params.toString()}`);

      } catch (error) {
        alert("Search failed. Please try again.");
        setStatus("idle");
      }
    }
  };

  // --- 2. 处理图片上传 (保持不变，省略部分重复代码) ---
  const handleBigButtonClick = () => fileInputRef.current?.click();
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
     // ... (这里保持你之前的图片上传代码不变) ...
     // 只要注意 setStatus 的类型现在多了 'searching'
  };
  
  // 辅助函数
  const isLoading = status !== "idle";

  return (
    <div className="min-h-screen bg-neutral-50 pb-28">
      {/* 隐藏的文件输入框 */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      <header className="px-6 pt-14 pb-6">
        <h1 className="text-3xl font-bold text-neutral-900 leading-tight">
          Hello, <br />
          <span className="text-emerald-600">Health Seeker</span>
        </h1>
      </header>

      {/* --- 搜索栏 (已升级) --- */}
      <div className="px-6 mb-8">
        <div className={`flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm ring-1 ring-neutral-100 transition-all ${status === 'searching' ? 'opacity-50' : ''}`}>
          {status === 'searching' ? (
             <Loader2 size={20} className="text-emerald-500 animate-spin" />
          ) : (
             <Search size={20} className="text-neutral-400" />
          )}
          
          <input 
            type="text" 
            placeholder={status === 'searching' ? "AI is thinking..." : "Search e.g. 'Coke', 'Oreo'..."}
            className="w-full bg-transparent outline-none text-neutral-900 placeholder:text-neutral-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch} // 监听回车键
            disabled={isLoading}
          />
        </div>
      </div>

      {/* --- 拍照卡片 (保持不变) --- */}
      <div className="px-6 mb-10">
        <div 
            onClick={isLoading ? undefined : handleBigButtonClick} 
            className={`relative overflow-hidden rounded-[32px] bg-neutral-900 p-8 text-white shadow-xl shadow-neutral-200 transition-transform ${isLoading ? "opacity-90 cursor-not-allowed" : "cursor-pointer active:scale-95"}`}
        >
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 ring-4 ring-emerald-500/20 ${isLoading ? "animate-pulse" : ""}`}>
              {status === 'analyzing' || status === 'processing' ? (
                <Loader2 size={32} className="animate-spin" />
              ) : (
                <Camera size={32} strokeWidth={2.5} />
              )}
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight">
              {status === "processing" && "Compressing..."}
              {status === "analyzing" && "AI Analyzing..."}
              {status === "searching" && "Searching..."} 
              {status === "idle" && "Snap & Judge Food"}
            </h2>
             {/* ... */}
          </div>
          {/* ... */}
        </div>
      </div>
      
      {/* ... 历史记录 (保持不变) ... */}
    </div>
  );
}

// ... compressImage 和 HistoryItem 保持不变 ...
