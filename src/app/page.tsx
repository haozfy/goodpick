"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Camera, Loader2, ScanLine, History, ArrowRight, Lock } from "lucide-react";

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [scanCount, setScanCount] = useState(0); 
  const [isPro, setIsPro] = useState(false);
  const FREE_LIMIT = 3;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: scans, count } = await supabase
        .from("scans")
        .select("*", { count: 'exact' })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (scans) {
        setRecentScans(scans.slice(0, 2));
        setScanCount(count || 0);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_pro")
        .eq("id", user.id)
        .single();
      
      if (profile) setIsPro(profile.is_pro);
    };

    fetchUserData();
  }, []);

  const handleScanClick = () => {
    if (!isPro && scanCount >= FREE_LIMIT) {
      if (confirm("Free limit reached. Upgrade for unlimited scans?")) {
        router.push("/account");
      }
      return;
    }
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

        if (response.status === 403 && data.code === "LIMIT_REACHED") {
           alert("Free limit reached! Please upgrade to continue.");
           router.push("/account");
           setIsAnalyzing(false);
           return;
        }

        if (!response.ok) throw new Error(data.error);
        router.push(`/scan-result?id=${data.id}`);

      } catch (error: any) {
        alert(error.message || "Something went wrong");
        setIsAnalyzing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-neutral-50/50 px-6 pt-16 pb-24 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      {/* Header */}
      <div className="mb-8 text-center relative z-10">
        <div className="inline-flex items-center justify-center p-3 mb-4 bg-white rounded-2xl shadow-sm border border-neutral-100">
          <ScanLine size={28} className="text-emerald-600" />
        </div>
        <h1 className="text-5xl font-black text-neutral-900 tracking-tighter leading-tight">
          Good<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Pick</span>
        </h1>
        
        {/* 👇 核心修改在这里：只有达到限制了才显示提示 */}
        <div className="mt-4 flex justify-center min-h-[24px]"> 
          {isPro ? (
             <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-200 to-yellow-400 px-3 py-1 text-xs font-bold text-yellow-900 shadow-sm animate-in fade-in slide-in-from-bottom-2">
               👑 PRO: Unlimited Scans
             </span>
          ) : scanCount >= FREE_LIMIT ? (
             <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600 animate-pulse">
               <Lock size={10}/>
               Scan limit reached (3/3)
             </span>
          ) : null}
          {/* 如果是免费用户且没用完次数，这里显示 null (什么都没有)，界面更干净 */}
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />

      {/* 按钮部分 (逻辑保持不变：用完次数后变灰并加锁) */}
      <div className="relative z-10 group">
        {!isAnalyzing && <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping-slow pointer-events-none"></div>}
        <button 
          onClick={handleScanClick}
          disabled={isAnalyzing}
          className={`relative flex h-56 w-56 items-center justify-center rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-4 transition-all duration-300 active:scale-95 disabled:scale-100 overflow-hidden
            ${!isPro && scanCount >= FREE_LIMIT 
              ? 'bg-neutral-800 border-neutral-700 grayscale cursor-not-allowed' // 用完变灰
              : 'bg-gradient-to-br from-neutral-900 to-neutral-800 border-neutral-800/50' // 正常黑色
            }`}
        >
          <div className="flex flex-col items-center gap-3 relative z-10">
            {isAnalyzing ? (
              <>
                <Loader2 size={56} className="text-emerald-400 animate-spin" />
                <span className="font-bold text-white text-sm tracking-[0.2em] animate-pulse">ANALYZING</span>
              </>
            ) : (
              <>
                {/* 用光了显示大锁头，没用光显示相机 */}
                {!isPro && scanCount >= FREE_LIMIT ? (
                  <>
                    <Lock size={48} className="text-neutral-500" />
                    <span className="font-bold text-neutral-500 text-lg">LIMIT REACHED</span>
                  </>
                ) : (
                  <>
                    <Camera size={56} className="text-white" />
                    <span className="font-black text-2xl text-white tracking-wider">SCAN</span>
                  </>
                )}
              </>
            )}
          </div>
        </button>
      </div>

      {/* 底部最近记录 */}
      <div className="mt-auto w-full max-w-sm relative z-10">
         <div className="flex items-center justify-between mb-4 px-1">
           <h2 className="text-sm font-bold text-neutral-700 flex items-center gap-2">
             <History size={16} className="text-neutral-400"/> Recent Activity
           </h2>
           {recentScans.length > 0 && <Link href="/dashboard" className="text-xs font-bold text-emerald-600">View All</Link>}
         </div>
         <div className="space-y-3">
            {recentScans.length === 0 ? (
               <div className="rounded-2xl bg-white p-4 shadow-sm border border-neutral-100/50 flex items-center gap-3 opacity-60">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 font-bold">?</div>
                  <div>
                    <h3 className="font-bold text-neutral-700 text-sm">No scans yet</h3>
                    <p className="text-xs text-neutral-400">Your history will appear here</p>
                  </div>
               </div>
            ) : (
               recentScans.map((scan) => (
                 <Link href={`/scan-result?id=${scan.id}`} key={scan.id} className="block group">
                   <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-neutral-100 transition-all hover:border-emerald-200">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-black text-white ${scan.grade === 'green' ? 'bg-emerald-500' : 'bg-neutral-900'}`}>
                          {scan.score}
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="font-bold text-neutral-800 truncate max-w-[150px]">{scan.product_name || "Unknown"}</h3>
                          <p className="text-xs text-neutral-400">{new Date(scan.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-neutral-300"/>
                   </div>
                 </Link>
               ))
            )}
         </div>
      </div>
    </main>
  );
}