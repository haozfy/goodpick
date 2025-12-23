"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Camera, Loader2, History, ArrowRight, ScanLine } from "lucide-react";

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [isAuthed, setIsAuthed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsAuthed(false);
        setRecentScans([]);
        return;
      }

      setIsAuthed(true);

      const { data: scans } = await supabase
        .from("scans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (scans) setRecentScans(scans.slice(0, 2));
    };

    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScanClick = () => {
    if (!isAnalyzing) fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);

    try {
      // ✅ 你后端已经支持 JSON + multipart。
      // 这里继续走 JSON dataURL（最少改动），稳定。
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

          // ✅ 不显示剩余次数，只在用完后提示
          if (response.status === 403 && data.code === "LIMIT_REACHED") {
            // 你可以把 /login 或 /account 按你策略改
            const go = confirm(
              "Free trial completed.\n\nLog in / upgrade to Pro for unlimited photo scans and saved history."
            );
            if (go) router.push("/login");
            setIsAnalyzing(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
          }

          if (!response.ok) throw new Error(data?.error || "Something went wrong");

          router.push(`/scan-result?id=${data.id}`);
        } catch (err: any) {
          alert(err?.message || "Something went wrong");
          setIsAnalyzing(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
    } catch (err: any) {
      alert(err?.message || "Something went wrong");
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-neutral-50/50 px-6 pt-16 pb-24 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      {/* HERO */}
      <div className="mb-8 text-center relative z-10 max-w-sm">
        <div className="inline-flex items-center justify-center p-3 mb-4 bg-white rounded-2xl shadow-sm border border-neutral-100">
          <ScanLine size={28} className="text-emerald-600" />
        </div>

        <h1 className="text-5xl font-black text-neutral-900 tracking-tighter leading-tight">
          Good
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
            Pick
          </span>
        </h1>

        <h2 className="mt-4 text-2xl font-black text-neutral-900 tracking-tight leading-snug">
          Not sure if it’s healthy?
          <br />
          Just take a photo.
        </h2>

        <p className="mt-3 text-sm text-neutral-600 leading-relaxed">
          GoodPick gives you a clear health verdict and cleaner alternatives — in seconds.
        </p>

        <p className="mt-2 text-xs text-neutral-400">
          No signup needed to try. We’ll ask you to log in only after your free trial.
        </p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* PRIMARY CTA */}
      <div className="relative z-10 group">
        {!isAnalyzing && (
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping-slow pointer-events-none"></div>
        )}

        <button
          onClick={handleScanClick}
          disabled={isAnalyzing}
          className={`relative flex h-56 w-56 items-center justify-center rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-4 transition-all duration-300 active:scale-95 disabled:scale-100 overflow-hidden
            bg-gradient-to-br from-neutral-900 to-neutral-800 border-neutral-800/50`}
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
                <Camera size={56} className="text-white" />
                <span className="font-black text-xl text-white tracking-wide">
                  TAKE A PHOTO
                </span>
                <span className="text-[11px] text-white/60 tracking-wider">
                  GET A CLEAR VERDICT
                </span>
              </>
            )}
          </div>
        </button>
      </div>

      {/* WHAT YOU’LL GET */}
      <div className="mt-8 w-full max-w-sm relative z-10">
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-neutral-100/60 text-left">
          <h3 className="font-extrabold text-neutral-900 text-sm mb-3">
            What you’ll get
          </h3>

          <ul className="space-y-2 text-sm text-neutral-700">
            <li className="flex items-start gap-2">
              <span className="mt-[6px] h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>
                <b>A clear health score (0–100)</b> that’s easy to understand.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-[6px] h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>
                <b>What’s risky — if anything</b> (sugar, sodium, additives, ultra-processing).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-[6px] h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>
                <b>Cleaner alternatives</b> in the same category.
              </span>
            </li>
          </ul>

          <div className="mt-4 text-xs text-neutral-400">
            Designed to help you decide faster — not to overwhelm you with data.
          </div>
        </div>
      </div>

      {/* RECENT / TRY IT */}
      <div className="mt-auto w-full max-w-sm relative z-10">
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-sm font-bold text-neutral-700 flex items-center gap-2">
            <History size={16} className="text-neutral-400" />{" "}
            {isAuthed ? "Recent decisions" : "Try it instantly"}
          </h2>

          {isAuthed && recentScans.length > 0 && (
            <Link href="/dashboard" className="text-xs font-bold text-emerald-600">
              View history
            </Link>
          )}
        </div>

        <div className="space-y-3">
          {!isAuthed ? (
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-neutral-100/50 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 font-black">
                ✓
              </div>
              <div>
                <h3 className="font-bold text-neutral-800 text-sm">Take a photo → get a verdict</h3>
                <p className="text-xs text-neutral-400">
                  Results appear immediately. Log in later to save history and unlock unlimited scans.
                </p>
              </div>
            </div>
          ) : recentScans.length === 0 ? (
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-neutral-100/50 flex items-center gap-3 opacity-70">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 font-black">
                ?
              </div>
              <div>
                <h3 className="font-bold text-neutral-700 text-sm">No decisions yet</h3>
                <p className="text-xs text-neutral-400">Your history will appear here after your first scan.</p>
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