"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
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
const GUEST_KEY = "gp_last_scan";

type Grade = "green" | "yellow" | "black";
type Verdict = "good" | "caution" | "avoid";

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
  const id = searchParams.get("id");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saveMsg, setSaveMsg] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);

      if (!id) {
        const raw = sessionStorage.getItem(GUEST_KEY);
        setData(raw ? JSON.parse(raw) : null);
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const u = auth?.user ?? null;

      if (u) {
        const { data: scan } = await supabase
          .from("scans")
          .select("*")
          .eq("id", id)
          .eq("user_id", u.id)
          .maybeSingle();

        if (scan) {
          setData(scan);
          setLoading(false);
          return;
        }
      }

      const anonId = localStorage.getItem(ANON_KEY);
      if (anonId) {
        const { data: anonScan } = await supabase
          .from("scans")
          .select("*")
          .eq("id", id)
          .eq("anon_id", anonId)
          .maybeSingle();

        if (anonScan) {
          setData(anonScan);
          setLoading(false);
          return;
        }
      }

      const raw = sessionStorage.getItem(GUEST_KEY);
      setData(raw ? JSON.parse(raw) : null);
      setLoading(false);
    };

    run();
  }, [id]);

  const grade = useMemo(() => gradeFromData(data), [data]);
  const score = Number(data?.score ?? 0);
  const productName = data?.product_name || "Unknown Product";
  const analysis = data?.analysis || "";

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
        backBtn: "bg-white/10 text-white hover:bg-white/20",
        saveBtn: "bg-white/10 text-white hover:bg-white/20",
        brandText: "text-white/40",
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
        backBtn: "bg-white text-neutral-900 hover:bg-amber-100",
        saveBtn: "bg-white text-neutral-900 hover:bg-amber-100",
        brandText: "text-amber-900/40",
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
      backBtn: "bg-white text-neutral-900 hover:bg-emerald-100",
      saveBtn: "bg-white text-neutral-900 hover:bg-emerald-100",
      brandText: "text-emerald-900/40",
    };
  }, [grade]);

  const handleSave = async () => {
    // 🔴 未登录 → 去 login
    if (!user) {
      const next = encodeURIComponent(
        window.location.pathname + window.location.search
      );
      window.location.href = `/login?next=${next}`;
      return;
    }

    // ✅ 已登录：暂时仍然是 share / copy（后续可换成保存图片）
    try {
      setSaveMsg("");

      const origin = window.location.origin;
      const url = id
        ? `${origin}/scan-result?id=${encodeURIComponent(id)}`
        : origin;

      if ((navigator as any).share) {
        await (navigator as any).share({
          title: "GoodPick",
          text: `GoodPick result (${score}) — ${productName}`,
          url,
        });
        setSaveMsg("Saved");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setSaveMsg("Link copied");
      } else {
        setSaveMsg("Saved");
      }

      setTimeout(() => setSaveMsg(""), 1200);
    } catch {
      setSaveMsg("Couldn’t save");
      setTimeout(() => setSaveMsg(""), 1200);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <ScanLine />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} px-6 py-8`}>
      <div className="mb-8 flex justify-between">
        <Link href="/" className={`rounded-full p-2 ${theme.backBtn}`}>
          <ArrowLeft size={20} />
        </Link>
      </div>

      <div className={`mx-auto max-w-sm rounded-2xl ${theme.cardBg} p-8`}>
        <div className="mb-8 flex justify-center">
          <div className="relative h-40 w-40">
            <div className={`absolute inset-0 rounded-full border-[10px] ${theme.ringBg}`} />
            <div className={`absolute inset-0 rounded-full border-[10px] ${theme.ringFg}`} />
            <div className={`absolute inset-0 flex items-center justify-center text-6xl font-black ${theme.text}`}>
              {score}
            </div>
          </div>
        </div>

        <h1 className={`text-center text-2xl font-black ${theme.text}`}>
          {productName}
        </h1>

        <div className="my-6 flex justify-center">
          <span className={`rounded-full px-4 py-2 text-xs font-bold ${theme.badge}`}>
            {theme.icon} {theme.gradeText}
          </span>
        </div>

        <p className={`text-center text-sm ${theme.subText}`}>
          “{analysis}”
        </p>

        <div className="mt-8 flex justify-between items-center">
          <span className={`text-[11px] uppercase ${theme.brandText}`}>
            goodpick.app
          </span>
          <button
            onClick={handleSave}
            className={`rounded-full px-3 py-1.5 text-[11px] font-black ${theme.saveBtn}`}
          >
            {saveMsg || "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<Loader2 className="animate-spin" />}>
      <ResultContent />
    </Suspense>
  );
}