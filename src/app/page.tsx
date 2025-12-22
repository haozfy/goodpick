"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client"; // 引入客户端 Supabase
import { Camera, Loader2, ScanLine, History, ArrowRight } from "lucide-react";

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recentScans, setRecentScans] = useState<any[]>([]); // 👈 新增状态：存储最近记录
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // ✅ 新增：页面加载时，自动去数据库抓取最近的 2 条记录
  useEffect(() => {
    const fetchRecent = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("scans")
        .select("*")
        .eq("user_id", user.id) // 只看自己的
        .order("created_at", { ascending: false }) // 按时间倒序
        .limit(2); // 只取前 2 条

      if (data) setRecentScans(data);
    };

    fetchRecent();
  }, []);

  const handleScanClick = () => {
    if (!isAnalyzing) fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: reader.result }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        router.push(`/scan-result?id=${data.id}`);
      } catch (error: any) {
        alert(error.message);
        setIsAnalyzing(false);
      }
    };
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-neutral-50/50 px-6 pt-16 pb-24 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-400/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      {/* Header */}
      <div className="mb-12 text-center relative z-10">
        <div className="inline-flex items-center justify-center p-3 mb-4 bg-white rounded-2xl shadow-sm border border-neutral-100">
          <ScanLine size={28} className="text-emerald-600" />
        </div>
        <h1 className="text-5xl font-black text-neutral-900 tracking-tighter leading-tight">
          Good<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Pick</span>
        </h1>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />

      {/* 扫描按钮 */}
      <div className="relative z-10 group">
        {!isAnalyzing && <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping-slow pointer-events-none"></div>}
        <button 
          onClick={handleScanClick}
          disabled={isAnalyzing}
          className="relative flex h-56 w-56 items-center justify-center rounded-full bg-gradient-to-br from-neutral-900 to-neutral-800 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-4 border-neutral-800/50 transition-all duration-300 active:scale-95 disabled:scale-100 overflow-hidden"
        >
          <div className={`absolute inset-2 rounded-full border-[3px] transition-all duration-500 ${isAnalyzing ? 'border-emerald-500/80 animate-spin-slow' : 'border-white/10 group-hover:border-emerald-500/50'}`}></div>
          <div className="flex flex-col items-center gap-3 relative z-10">
            {isAnalyzing ? (
              <>
                <Loader2 size={56} className="text-emerald-400 animate-spin" />
                <span className="font-bold text-white text-sm tracking-[0.2em] animate-pulse">ANALYZING</span>
              </>
            ) : (
              <>
                <Camera size={56} className="text-white" />
                <span className="font-black text-2xl text-white tracking-wider">SCAN</span>
              </>
            )}
          </div>
        </button>
      </div>
      
      <p className="mt-8 text-sm font-semibold text-neutral-400 uppercase tracking-widest relative z-10">
        Tap to verify food
      </p>

      {/* 👇 3. 真实最近记录展示区 (核心修改点) */}
      <div className="mt-auto w-full max-w-sm relative z-10">
         <div className="flex items-center justify-between mb-4 px-1">
           <h2 className="text-sm font-bold text-neutral-700 flex items-center gap-2">
             <History size={16} className="text-neutral-400"/> Recent Activity
           </h2>
           {recentScans.length > 0 && (
             <Link href="/dashboard" className="text-xs font-bold text-emerald-600">View All</Link>
           )}
         </div>

         <div className="space-y-3">
           {recentScans.length === 0 ? (
             // 如果没数据，显示占位符
             <div className="rounded-2xl bg-white p-4 shadow-sm border border-neutral-100/50 flex items-center gap-3 opacity-60">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 font-bold">?</div>
                <div>
                  <h3 className="font-bold text-neutral-700 text-sm">No scans yet</h3>
                  <p className="text-xs text-neutral-400">Your history will appear here</p>
                </div>
             </div>
           ) : (
             // 如果有数据，显示真实的最近记录
             recentScans.map((scan) => (
               <Link href={`/scan-result?id=${scan.id}`} key={scan.id} className="block group">
                 <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-neutral-100 transition-all hover:border-emerald-200 hover:shadow-md">
                    <div className="flex items-center gap-3">
                      {/* 分数圆圈 */}
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-black text-white ${scan.grade === 'green' ? 'bg-emerald-500' : 'bg-neutral-900'}`}>
                        {scan.score}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="font-bold text-neutral-800 truncate max-w-[150px]">{scan.product_name || "Unknown"}</h3>
                        <p className="text-xs text-neutral-400">{new Date(scan.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-neutral-300 group-hover:text-emerald-500 transition-colors"/>
                 </div>
               </Link>
             ))
           )}
         </div>
      </div>
    </main>
  );
}