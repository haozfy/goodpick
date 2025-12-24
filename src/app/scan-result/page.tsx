"use client";

import { useEffect, useState, Suspense, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  ScanLine,
} from "lucide-react";

const ANON_KEY = "goodpick_anon_id";
const GUEST_KEY = "gp_last_scan"; // 你首页存的 sessionStorage key

type Grade = "green" | "yellow" | "black";
type Verdict = "good" | "caution" | "avoid";

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getOrCreateAnonId() {
  if (typeof window === "undefined") return null;
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

function gradeFromData(d: any): Grade {
  const g = String(d?.grade || "").toLowerCase();
  if (g === "green" || g === "yellow" || g === "black") return g;

  const v = String(d?.verdict || "").toLowerCase() as Verdict;
  if (v === "good") return "green";
  if (v === "caution") return "yellow";
  if (v === "avoid") return "black";

  const s = Number(d?.score ?? 0);
  if (s >= 80) return "green";
  if (s >= 50) return "yellow";
  return "black";
}

function ResultContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id"); // may be null

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Share/Download 反馈提示
  const [saveMsg, setSaveMsg] = useState<string>("");

  // ✅ 下载图片用
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!alive) return;
      setLoading(true);

      const commit = (payload: any) => {
        if (!alive) return;
        setData(payload);
        setLoading(false);
      };

      // A) 没有 id：兜底读 sessionStorage（理论上 B 模式下很少发生）
      if (!id) {
        const raw =
          typeof window !== "undefined"
            ? sessionStorage.getItem(GUEST_KEY)
            : null;
        commit(safeJsonParse<any>(raw));
        return;
      }

      // B) 有 id：查 Supabase
      const supabase = createClient();

      // 1) 登录：按 id + user_id 查
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user ?? null;

      if (user) {
        const { data: scan, error } = await supabase
          .from("scans")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!error && scan) {
          commit(scan);
          return;
        }
        // 登录用户也可能是登录前扫的（anon_id），继续兜底
      }

      // 2) 匿名兜底：按 id + anon_id 查
      const anonId = getOrCreateAnonId();

      if (anonId) {
        const { data: anonScan } = await supabase
          .from("scans")
          .select("*")
          .eq("id", id)
          .eq("anon_id", anonId)
          .maybeSingle();

        if (anonScan) {
          commit(anonScan);
          return;
        }
      }

      // C) 最后兜底：再读 sessionStorage（防止“有 id 但库没写”的情况）
      const raw =
        typeof window !== "undefined"
          ? sessionStorage.getItem(GUEST_KEY)
          : null;

      commit(safeJsonParse<any>(raw));
    };

    run();

    return () => {
      alive = false;
    };
  }, [id]);

  // ✅ 关键：所有 hooks / memo 都必须在任何 return 之前执行
  const grade = useMemo(() => gradeFromData(data), [data]);
  const score = Number(data?.score ?? 0);
  const productName = data?.product_name || "Unknown Product";
  const analysis = data?.analysis || "No analysis details provided.";

  const theme = useMemo(() => {
    if (grade === "black") {
      return {
        bg: "bg-neutral-900",
        cardBg: "bg-neutral-800",
        text: "text-white",
        subText: "text-neutral-400",
        ringBg: "border-neutral-700",
        ringFg: "border-red-500",
        badge: "bg-red-500/20 text-red-200",
        icon: <AlertTriangle size={16} />,
        gradeText: "Black Card • Avoid",
        topLabel: "text-white/40",
        backBtn: "bg-white/10 text-white hover:bg-white/20",
        pillBtn: "bg-white/10 text-white hover:bg-white/20",
        brandText: "text-white/40 hover:text-white/70",
      };
    }
    if (grade === "yellow") {
      return {
        bg: "bg-amber-50",
        cardBg: "bg-white",
        text: "text-neutral-900",
        subText: "text-amber-900/70",
        ringBg: "border-amber-100",
        ringFg: "border-amber-500",
        badge: "bg-amber-100 text-amber-800",
        icon: <ShieldAlert size={16} />,
        gradeText: "Yellow Card • Caution",
        topLabel: "text-amber-900/40",
        backBtn: "bg-white text-neutral-900 shadow-sm hover:bg-amber-100",
        pillBtn: "bg-white text-neutral-900 shadow-sm hover:bg-amber-100",
        brandText: "text-amber-900/40 hover:text-amber-900/70",
      };
    }
    return {
      bg: "bg-emerald-50",
      cardBg: "bg-white",
      text: "text-neutral-900",
      subText: "text-emerald-900/70",
      ringBg: "border-emerald-100",
      ringFg: "border-emerald-500",
      badge: "bg-emerald-100 text-emerald-700",
      icon: <CheckCircle size={16} />,
      gradeText: "Green Card • Good",
      topLabel: "text-emerald-900/40",
      backBtn: "bg-white text-neutral-900 shadow-sm hover:bg-emerald-100",
      pillBtn: "bg-white text-neutral-900 shadow-sm hover:bg-emerald-100",
      brandText: "text-emerald-900/40 hover:text-emerald-900/70",
    };
  }, [grade]);

  const showAlternatives = grade !== "green";

  // ✅ Share：永远分享“永久链接”（/scan-result?id=xxx）
  const handleShare = async () => {
    try {
      setSaveMsg("");

      const origin =
        typeof window !== "undefined" ? window.location.origin : "";

      if (!id || !origin) {
        setSaveMsg("Nothing to share");
        setTimeout(() => setSaveMsg(""), 1200);
        return;
      }

      const shareUrl = `${origin}/scan-result?id=${encodeURIComponent(id)}`;

      const verdictText =
        grade === "green" ? "Good" : grade === "yellow" ? "Caution" : "Avoid";

      const text = `GoodPick result: ${verdictText} (${
        Number.isFinite(score) ? score : 0
      }) — ${productName}`;

      // 1) 系统分享（iOS/Android 最好用）
      if ((navigator as any)?.share) {
        await (navigator as any).share({
          title: "GoodPick",
          text,
          url: shareUrl,
        });
        setSaveMsg("Shared");
        setTimeout(() => setSaveMsg(""), 1200);
        return;
      }

      // 2) 复制链接
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setSaveMsg("Link copied");
        setTimeout(() => setSaveMsg(""), 1200);
        return;
      }

      // 3) 最后兜底
      setSaveMsg("Copied");
      setTimeout(() => setSaveMsg(""), 1200);
    } catch {
      setSaveMsg("Couldn’t share");
      setTimeout(() => setSaveMsg(""), 1400);
    }
  };

  // ✅ Download：下载结果卡片图片（不提示登录）
  const handleDownload = async () => {
    try {
      setSaveMsg("");

      const el = cardRef.current;
      if (!el) {
        setSaveMsg("Couldn’t download");
        setTimeout(() => setSaveMsg(""), 1400);
        return;
      }

      // npm i html-to-image
      const mod = await import("html-to-image");
      const dataUrl = await mod.toPng(el, { pixelRatio: 2 });

      const safeName = (productName || "result")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `goodpick-${safeName || "result"}.png`;
      a.click();

      setSaveMsg("Downloaded");
      setTimeout(() => setSaveMsg(""), 1200);
    } catch {
      setSaveMsg("Couldn’t download");
      setTimeout(() => setSaveMsg(""), 1400);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-neutral-500 font-medium animate-pulse">
          Retrieving analysis...
        </p>
      </div>
    );
  }

  // Not found
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
        <Link
          href="/"
          className="rounded-xl bg-neutral-900 px-6 py-3 text-white font-bold"
        >
          Scan Again
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${theme.bg} px-6 py-8 transition-colors duration-500`}
    >
      {/* Top nav */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className={`rounded-full p-2 transition-colors ${theme.backBtn}`}
        >
          <ArrowLeft size={20} />
        </Link>

        <span
          className={`text-xs font-bold tracking-[0.2em] uppercase ${theme.topLabel}`}
        >
          Analysis Result
        </span>

        <div className="w-9" />
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        className={`relative z-10 mx-auto w-full max-w-sm rounded-[2rem] ${theme.cardBg} p-8 shadow-2xl transition-all duration-500`}
      >
        {/* Score ring */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div
              className={`h-40 w-40 rounded-full border-[10px] ${theme.ringBg}`}
            />
            <div
              className={`absolute inset-0 rounded-full border-[10px] ${theme.ringFg}`}
            />
            <div
              className={`absolute inset-0 flex items-center justify-center text-6xl font-black ${theme.text}`}
            >
              {Number.isFinite(score) ? score : 0}
            </div>
          </div>
        </div>

        {/* Name */}
        <h1
          className={`mb-3 text-center text-2xl font-black leading-tight ${theme.text}`}
        >
          {productName}
        </h1>

        {/* Badge */}
        <div className="mb-8 flex justify-center">
          <span
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide ${theme.badge}`}
          >
            {theme.icon}
            {theme.gradeText}
          </span>
        </div>

        {/* Analysis */}
        <div
          className={`mb-8 text-center text-sm leading-relaxed font-medium ${theme.subText}`}
        >
          {analysis}
        </div>

        {/* ✅ Brand + Share/Download */}
        <div className="mb-10 flex items-center justify-between">
          <a
            href="https://goodpick.app"
            target="_blank"
            rel="noreferrer"
            className={`text-[11px] font-bold tracking-[0.14em] uppercase ${theme.brandText}`}
          >
            goodpick.app
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className={`rounded-full px-3 py-1.5 text-[11px] font-black tracking-wide transition-colors ${theme.pillBtn}`}
            >
              {saveMsg ? saveMsg : "Share"}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className={`rounded-full px-3 py-1.5 text-[11px] font-black tracking-wide transition-colors ${theme.pillBtn}`}
            >
              Download
            </button>
          </div>
        </div>

        {/* CTA */}
        {showAlternatives ? (
          <div className="space-y-3">
            <Link
              href={id ? `/recs?originId=${id}` : "/recs"}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-900/15 transition-transform active:scale-95 hover:bg-emerald-500"
            >
              See Healthy Alternatives
            </Link>
            <p className="text-center text-[10px] text-neutral-500 uppercase tracking-wider">
              Cleaner options in the same category
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