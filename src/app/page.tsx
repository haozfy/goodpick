"use client";

import { useRouter } from "next/navigation";
import { Scan, Search, Camera, Loader2, ChevronRight } from "lucide-react";
import { useState, useRef } from "react";
import Link from "next/link"; // 确保引入 Link

export default function HomePage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "processing" | "analyzing">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBigButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("processing");

    try {
      // 1. 压缩图片 (解决 payload too large 问题)
      const compressedBase64 = await compressImage(file);
      
      setStatus("analyzing");

      // 2. 发送给后端
      const response = await fetch("/api/analyze-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: compressedBase64 }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Server error");
      }

      // --- AI Analysis Success ---
      const aiData = result.data;
      console.log("AI Result:", aiData);
      
      // 使用英文弹窗
      alert(`AI Analysis Result:\n\nFood: ${aiData.name}\nScore: ${aiData.score}\nReason: ${aiData.reason}`);

      // TODO: 将来这里可以跳转
      // router.push(...)

    } catch (error: any) {
      console.error("Error details:", error);
      // 英文错误提示
      alert(`Analysis failed: ${error.message || "Please try again."}`);
    } finally {
      setStatus("idle");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isLoading = status !== "idle";

  return (
    <div className="min-h-screen bg-neutral-50 pb-28">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        // capture="environment" // 手机上取消注释这行
        className="hidden" 
      />

      <header className="px-6 pt-14 pb-6">
        <h1 className="text-3xl font-bold text-neutral-900 leading-tight">
          Hello, <br />
          <span className="text-emerald-600">Health Seeker</span>
        </h1>
      </header>

      <div className="px-6 mb-8">
        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm ring-1 ring-neutral-100">
          <Search size={20} className="text-neutral-400" />
          <input type="text" placeholder="Search product..." className="w-full bg-transparent outline-none text-neutral-900" />
        </div>
      </div>

      {/* Hero Card */}
      <div className="px-6 mb-10">
        <div 
            onClick={isLoading ? undefined : handleBigButtonClick} 
            className={`relative overflow-hidden rounded-[32px] bg-neutral-900 p-8 text-white shadow-xl shadow-neutral-200 transition-transform ${isLoading ? "opacity-90 cursor-not-allowed" : "cursor-pointer active:scale-95"}`}
        >
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 ring-4 ring-emerald-500/20 ${isLoading ? "animate-pulse" : ""}`}>
              {isLoading ? (
                <Loader2 size={32} className="animate-spin" />
              ) : (
                <Camera size={32} strokeWidth={2.5} />
              )}
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight">
              {status === "processing" && "Compressing..."}
              {status === "analyzing" && "AI Analyzing..."}
              {status === "idle" && "Snap & Judge Food"}
            </h2>
            <p className="mt-2 text-neutral-400 max-w-[200px]">
              {isLoading 
                ? "Please wait a moment." 
                : "Take a photo, let AI judge its healthiness."}
            </p>
            
            <button className="mt-8 w-full rounded-2xl bg-white py-4 text-sm font-bold text-neutral-900">
              {isLoading ? "Processing..." : "Take a Photo"}
            </button>
          </div>
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-neutral-800 opacity-50 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-900 opacity-40 blur-3xl" />
        </div>
      </div>

      <div className="px-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-neutral-900">Recent Scans</h3>
          <span className="text-sm font-medium text-emerald-600">See all</span>
        </div>
        <div className="space-y-3">
             <HistoryItem href="/product/123" name="Oat Milk Original" brand="Oatly" score={92} time="2m ago" />
             <HistoryItem href="/product/456" name="Tomato Ketchup" brand="Heinz" score={45} time="1h ago" />
        </div>
      </div>
    </div>
  );
}

// --- 核心修复：图片压缩函数 ---
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        // 限制最大宽度为 800px，高度按比例缩放
        const MAX_WIDTH = 800;
        const scale = MAX_WIDTH / img.width;
        
        // 如果图片本来就很小，就不缩放
        if (scale >= 1) {
            resolve(event.target?.result as string);
            return;
        }

        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // 转换为 JPEG，质量 0.7
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
        resolve(compressedDataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

function HistoryItem({ href, name, brand, score, time }: any) {
    let colorClass = "bg-emerald-500";
    if (score < 40) colorClass = "bg-rose-500";
    else if (score < 70) colorClass = "bg-amber-400";
  
    return (
      <Link href={href} className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm ring-1 ring-neutral-100 transition-all hover:bg-neutral-50 active:scale-[0.99]">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 flex-shrink-0 rounded-xl bg-neutral-100 flex items-center justify-center text-xs text-neutral-400">
              Img
              <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white ${colorClass} flex items-center justify-center text-[8px] font-bold text-white`}>
                  {score}
              </div>
          </div>
          <div>
            <h4 className="font-semibold text-neutral-900 leading-tight">{name}</h4>
            <p className="text-xs text-neutral-500 mt-0.5">{brand}</p>
          </div>
        </div>
        <div className="flex items-center text-neutral-400 gap-1">
          <span className="text-xs">{time}</span>
          <ChevronRight size={16} />
        </div>
      </Link>
    );
}
