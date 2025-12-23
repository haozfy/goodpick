"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, CheckCircle, AlertTriangle, Loader2, ScanLine } from "lucide-react";

const ANON_KEY = "goodpick_anon_id";

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ 防止你截图那种 id=eq.null
    if (!id) {
      setLoading(false);
      setData(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 1) 登录：按 id + user_id 查
      if (user) {
        const { data: scan, error } = await supabase
          .from("scans")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!error && scan) {
          setData(scan);
          setLoading(false);
          return;
        }

        // 登录用户也可能在“登录前”扫过（anon_id 数据），继续走匿名分支兜底
      }

      // 2) 匿名：按 id + anon_id 查
      const anonId =
        typeof window !== "undefined" ? localStorage.getItem(ANON_KEY) : null;

      if (!anonId) {
        setData(null);
        setLoading(false);
        return;
      }

      const { data: anonScan, error: anonErr } = await supabase
        .from("scans")
        .select("*")
        .eq("id", id)
        .eq("anon_id", anonId)
        .maybeSingle();

      if (anonErr) {
        console.error("Error fetching anon scan:", anonErr);
        setData(null);
      } else {
        setData(anonScan ?? null);
      }

      setLoading(false);
    };

    fetchData();
  }, [id]);

  // --- Loading ---
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-neutral-500 font-medium animate-pulse">Retrieving analysis...</p>
      </div>
    );
  }

  // --- Not found ---
  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 text-center">
        <div className="rounded-full bg-neutral-100 p-4 mb-4">
          <ScanLine className="h-8 w-8 text-neutral-400" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900">Scan not found</h2>
        <p className="mt-2 text-neutral-500 mb-8">
          We couldn't find the analysis results for this item.
        </p>
        <Link href="/" className="rounded-xl bg-neutral-900 px-6 py-3 text-white font-bold">
          Scan Again
        </Link>
      </div>
    );
  }

  // --- Normal ---
  const isBlackCard = data.grade === "black";
  const score = data.score ?? 0;
  const productName = data.product_name || "Unknown Product";
  const analysis = data.analysis || "No analysis details provided.";

  const theme = isBlackCard
    ? {
        bg: "bg-neutral-900",
        cardBg: "bg-neutral-800",
        text: "text-white",
        subText: "text-neutral-400",
        border: "border-red-500",
        badge: "bg-red-500/20 text-red-200",
        icon: <AlertTriangle size={16} />,
        gradeText: "Black Card • Avoid",
      }
    : {
        bg: "bg-emerald-50",
        cardBg: "bg-white",
        text: "text-neutral-900",
        subText: "text-emerald-800/70",
        border: "border-emerald-500",
        badge: "bg-emerald-100 text-emerald-700",
        icon: <CheckCircle size={16} />,
        gradeText: "Green Card • Safe",
      };

  return (
    <div className={`min-h-screen ${theme.bg} px-6 py-8 transition-colors duration-500`}>
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className={`rounded-full p-2 transition-colors ${
            isBlackCard ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-neutral-900 shadow-sm hover:bg-emerald-100"
          }`}
        >
          <ArrowLeft size={20} />
        </Link>
        <span className={`text-xs font-bold tracking-[0.2em] uppercase ${isBlackCard ? "text-white/40" : "text-emerald-900/40"}`}>
          Analysis Result
        </span>
        <div className="w-9" />
      </div>

      <div className={`relative z-10 mx-auto w-full max-w-sm rounded-[2rem] ${theme.cardBg} p-8 shadow-2xl transition-all duration-500`}>
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className={`h-40 w-40 rounded-full border-[10px] ${isBlackCard ? "border-neutral-700" : "border-emerald-100"}`} />
            <div className={`absolute inset-0 rounded-full border-[10px] ${theme.border}`} />
            <div className={`absolute inset-0 flex items-center justify-center text-6xl font-black ${isBlackCard ? "text-white" : "text-neutral-900"}`}>
              {score}
            </div>
          </div>
        </div>

        <h1 className={`mb-3 text-center text-2xl font-black leading-tight ${theme.text}`}>
          {productName}
        </h1>

        <div className="mb-8 flex justify-center">
          <span className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide ${theme.badge}`}>
            {theme.icon}
            {theme.gradeText}
          </span>
        </div>

        <div className={`mb-10 text-center text-sm leading-relaxed font-medium ${theme.subText}`}>
          "{analysis}"
        </div>

        {isBlackCard ? (
          <div className="space-y-3">
            <Link
              href={`/recs?originId=${id}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 font-bold text-white shadow-lg shadow-emerald-900/20 transition-transform active:scale-95 hover:bg-emerald-400"
            >
              See Healthy Alternatives
            </Link>
            <p className="text-center text-[10px] text-neutral-500 uppercase tracking-wider">
              We found better options for you
            </p>
          </div>
        ) : (
          <Link
            href="/"
            className="flex w-full items-center justify-center rounded-xl bg-neutral-900 py-4 font-bold text-white shadow-lg transition-transform active:scale-95 hover:bg-neutral-800"
          >
            Scan Next Item
          </Link>
        )}
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-50">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}