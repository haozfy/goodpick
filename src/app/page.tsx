"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Camera, Loader2, ScanLine, History, ArrowRight, Lock } from "lucide-react";

const ANON_KEY = "goodpick_anon_id"; // ✅ NEW

function getOrCreateAnonId() {
  if (typeof window === "undefined") return null;
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [scanCount, setScanCount] = useState(0);
  const [isPro, setIsPro] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false); // ✅ NEW (判断是否登录)
  const FREE_LIMIT = 3;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // ✅ NEW：提前生成 anonId（仅在客户端）
  const anonId = useMemo(() => getOrCreateAnonId(), []);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      // ✅ NEW：未登录就不查 scans / profiles（避免你现在“没登录不能跑”的链路）
      if (!user) {
        setIsAuthed(false);
        setRecentScans([]);
        setScanCount(0);
        setIsPro(false);
        return;
      }

      setIsAuthed(true);

      const { data: scans, count } = await supabase
        .from("scans")
        .select("*", { count: "exact" })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScanClick = () => {
    // ✅ 保持你原来的限流逻辑：只对“已登录且非 Pro”生效
    if (isAuthed && !isPro && scanCount >= FREE_LIMIT) {
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
          // ✅ NEW：把 anonId 一起传过去（登录与否都传，后端自行决定用不用）
          body: JSON.stringify({
            imageBase64: reader.result,
            anonId, // ✅ NEW
          }),
        });

        const data = await response.json();

        if (response.status === 403 && data.code === "LIMIT_REACHED") {
          alert("Free limit reached! Please upgrade to continue.");
          router.push("/account");
          setIsAnalyzing(false);
          return;
        }

        if (!response.ok) throw new Error(data.error);

        // ✅ 统一跳结果页（后端返回 id）
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

        {/* ✅ 登录用户显示 Pro/限流提示；未登录保持干净 */}
        <div className="mt-4 flex justify-center min-h-[24px]">
          {isAuthed ? (
            isPro ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-200 to-yellow-400 px-3 py-1 text-xs font-bold text-yellow-900 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                👑 PRO: Unlimited Scans
              </span>
            ) : scanCount >= FREE_LIMIT ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600 animate-pulse">
                <Lock size={10} />
                Scan limit reached (3/3)
              </span>
            ) : null
          ) : null}
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Scan Button */}
      <div className="relative z-10 group">
        {!isAnalyzing && (
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping-slow pointer-events-none"></div>
        )}

        <button
          onClick={handleScanClick}
          disabled={isAnalyzing}
          className={`relative flex h-56 w-56 items-center justify-center rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-4 transition-all duration-300 active:scale-95 disabled:scale-100 overflow-hidden
            ${
              // ✅ 仅登录+非pro+用完才变灰锁
              isAuthed && !isPro && scanCount >= FREE_LIMIT
                ? "bg-neutral-800 border-neutral-700 grayscale cursor-not-allowed"
                : "bg-gradient-to-br from-neutral-900 to-neutral-800 border-neutral-800/50"
            }`}
        >
          <div className="flex flex-col items-center gap-3 relative z-10">
            {isAnalyzing ? (
              <>
                <Loader2 size={56} className="text-emerald-400 animate-spin" />
                <span className="font-bold text-white text-sm tracking-[0.2em] animate-pulse">
                  ANALYZING
                </span>
              </>
            ) : (
              <>
                {isAuthed && !isPro && scanCount >= FREE_LIMIT ? (
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

      {/* Recent */}
      <div className="mt-auto w-full max-w-sm relative z-10">
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-sm font-bold text-neutral-700 flex items-center gap-2">
            <History size={16} className="text-neutral-400" /> Recent Activity
          </h2>

          {/* ✅ 未登录不显示 View All */}
          {isAuthed && recentScans.length > 0 && (
            <Link href="/dashboard" className="text-xs font-bold text-emerald-600">
              View All
            </Link>
          )}
        </div>

        <div className="space-y-3">
          {!isAuthed ? (
            // ✅ 未登录提示（你想更狠一点：放个 Login 按钮也行）
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-neutral-100/50 flex items-center gap-3 opacity-70">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 font-bold">
                i
              </div>
              <div>
                <h3 className="font-bold text-neutral-700 text-sm">Guest mode</h3>
                <p className="text-xs text-neutral-400">
                  Scans work. Log in to save history & insights.
                </p>
              </div>
            </div>
          ) : recentScans.length === 0 ? (
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-neutral-100/50 flex items-center gap-3 opacity-60">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 font-bold">
                ?
              </div>
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
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-black text-white ${
                        scan.grade === "green" ? "bg-emerald-500" : "bg-neutral-900"
                      }`}
                    >
                      {scan.score}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-neutral-800 truncate max-w-[150px]">
                        {scan.product_name || "Unknown"}
                      </h3>
                      <p className="text-xs text-neutral-400">
                        {new Date(scan.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-neutral-300" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}