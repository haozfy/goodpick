"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Camera,
  Loader2,
  ArrowRight,
  History,
  ShieldCheck,
  Zap,
  ChartLine,
  Dot,
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [recentScans, setRecentScans] = useState<any[]>([]);

  useEffect(() => {
    const run = async () => {
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
        .select("id, created_at, product_name, score, grade")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(2);

      setRecentScans(scans || []);
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickFile = () => {
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

        if (response.status === 403 && data?.code === "LIMIT_REACHED") {
          const go = confirm(
            "Trial completed.\n\nLog in to save history and unlock unlimited scans."
          );
          if (go) router.push("/login");
          setIsAnalyzing(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        if (!response.ok) throw new Error(data?.error || "Something went wrong");

        // ✅ logged-in: go to scan-result by id
        if (data?.id) {
          router.push(`/scan-result?id=${data.id}`);
          return;
        }

        // ✅ guest: store in session and go to guest result
        if (data?.scan) {
          sessionStorage.setItem("gp_last_scan", JSON.stringify(data.scan));
          router.push("/scan-result?guest=1");
          return;
        }

        throw new Error("No result returned");
      } catch (err: any) {
        alert(err?.message || "Something went wrong");
        setIsAnalyzing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
  };

  const gradePill = (grade: string) => {
    if (grade === "green")
      return "bg-emerald-100 text-emerald-800 ring-emerald-200";
    if (grade === "yellow")
      return "bg-amber-100 text-amber-800 ring-amber-200";
    if (grade === "red") return "bg-rose-100 text-rose-800 ring-rose-200";
    if (grade === "avoid")
      return "bg-neutral-900 text-white ring-neutral-900/10";
    if (grade === "caution")
      return "bg-amber-100 text-amber-900 ring-amber-200";
    if (grade === "good")
      return "bg-emerald-100 text-emerald-900 ring-emerald-200";
    return "bg-neutral-100 text-neutral-800 ring-neutral-200";
  };

  // ✅ Demo: chocolate → chocolate swaps
  const demo = useMemo(
    () => ({
      product: "Milk chocolate bar",
      score: 45,
      gradeLabel: "AVOID",
      title: "Marketing ≠ healthy",
      oneLine:
        "We flag what matters, then give you one next step — no nutrition report vibe.",
      topSignal: "Added sugar",
      signals: ["Added sugar", "Ultra-processed", "Many additives"],
      focus: ["Sugar", "Cholesterol", "Trans fats", "Additives"],
      next: "Swap to a darker bar (70%+) or keep the same treat but smaller portions.",
      swaps: [
        {
          name: "70–85% dark chocolate",
          reason: "Less sugar, more cocoa — still chocolate.",
          price: "$$",
        },
        {
          name: "Mini chocolate squares (portion-pack)",
          reason: "Same treat, easier to keep sugar down.",
          price: "$$",
        },
        {
          name: "Cacao nibs + a little dark chocolate",
          reason: "More cocoa flavor with less sweet hit.",
          price: "$$",
        },
      ],
    }),
    []
  );

  return (
    <main className="relative min-h-screen bg-neutral-50 px-6 pt-10 pb-10 flex flex-col items-center overflow-hidden">
      {/* background */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[860px] h-[860px] rounded-full bg-emerald-400/10 blur-3xl -z-10" />
      <div className="pointer-events-none absolute top-36 right-[-140px] w-[420px] h-[420px] rounded-full bg-neutral-900/5 blur-3xl -z-10" />

      <div className="w-full max-w-sm">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 ring-1 ring-neutral-200/60 px-3 py-1.5 backdrop-blur">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-white text-xs font-black">
              GP
            </span>
            <span className="text-xs font-black tracking-wide text-neutral-800">
              GoodPick
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isAuthed ? (
              <Link
                href="/dashboard"
                className="text-xs font-bold text-neutral-700 hover:text-neutral-900"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-xs font-bold text-neutral-700 hover:text-neutral-900"
              >
                Log in
              </Link>
            )}
          </div>
        </div>

        {/* HERO (tight, high-ticket) */}
        <div className="mt-8 text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 ring-1 ring-neutral-200/60 px-3 py-1.5 backdrop-blur">
            <span className="text-[11px] font-black tracking-wide text-neutral-800">
              Decision-grade food picks
            </span>
          </div>

          <h1 className="mt-4 text-[38px] leading-[1.03] font-black tracking-tight text-neutral-900">
            Stop guessing.
            <br />
            <span className="text-emerald-600">See what’s really in it.</span>
          </h1>

          <p className="mt-3 text-sm font-semibold text-neutral-700 leading-relaxed">
            Most “healthy” food is marketing. We score reality — then give you{" "}
            <span className="text-neutral-900 font-black">one next step</span>.
          </p>

          {/* trust row (minimal) */}
          <div className="mt-5 flex items-center gap-2 text-[11px] text-neutral-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 ring-1 ring-neutral-200/60 px-2 py-1">
              <Zap size={14} className="text-neutral-700" /> Seconds
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 ring-1 ring-neutral-200/60 px-2 py-1">
              <ShieldCheck size={14} className="text-neutral-700" /> Private
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 ring-1 ring-neutral-200/60 px-2 py-1">
              <ChartLine size={14} className="text-neutral-700" /> Trends
            </span>
          </div>
        </div>

        {/* hidden input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* PRIMARY CTA (single action) */}
        <div className="mt-7 rounded-3xl bg-white ring-1 ring-neutral-200/60 shadow-[0_18px_45px_rgba(0,0,0,0.10)] p-4">
          <button
            onClick={pickFile}
            disabled={isAnalyzing}
            className="w-full rounded-2xl bg-neutral-900 text-white py-5 active:scale-[0.99] transition disabled:opacity-80"
          >
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={28} />
                <div className="text-[11px] tracking-[0.28em] font-bold opacity-80">
                  ANALYZING
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between px-5">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Camera size={22} />
                  </div>
                  <div className="text-left">
                    <div className="text-base font-black tracking-wide">
                      Scan a label
                    </div>
                    <div className="text-[11px] opacity-70">
                      score → signals → next step
                    </div>
                  </div>
                </div>
                <ArrowRight className="opacity-80" size={18} />
              </div>
            )}
          </button>

          <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500">
            <span>No signup required</span>
            <span className="font-semibold">Works best on packaged labels</span>
          </div>
        </div>

        {/* PROOF (short, not feature-list) */}
        <div className="mt-5 rounded-3xl bg-white/80 ring-1 ring-neutral-200/60 backdrop-blur p-4">
          <div className="text-xs font-black text-neutral-700">How it helps</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white ring-1 ring-neutral-200/60 p-3">
              <div className="text-[11px] font-black text-neutral-900">Score</div>
              <div className="text-[10px] text-neutral-500">
                clear & comparable
              </div>
            </div>
            <div className="rounded-2xl bg-white ring-1 ring-neutral-200/60 p-3">
              <div className="text-[11px] font-black text-neutral-900">
                Signals
              </div>
              <div className="text-[10px] text-neutral-500">
                what’s driving it
              </div>
            </div>
            <div className="rounded-2xl bg-white ring-1 ring-neutral-200/60 p-3">
              <div className="text-[11px] font-black text-neutral-900">
                Next step
              </div>
              <div className="text-[10px] text-neutral-500">one small swap</div>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-neutral-500 leading-relaxed">
            Flags issues tied to{" "}
            <span className="font-semibold text-neutral-900">sugar</span>,{" "}
            <span className="font-semibold text-neutral-900">cholesterol</span>,{" "}
            <span className="font-semibold text-neutral-900">trans fats</span>, and{" "}
            <span className="font-semibold text-neutral-900">additives</span> —
            without the “nutrition report” vibe.
          </div>
        </div>

        {/* PREVIEW (conversion driver) */}
        <div className="mt-5 rounded-3xl bg-white/80 ring-1 ring-neutral-200/60 backdrop-blur p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black text-neutral-700">
              Preview{" "}
              <span className="font-semibold text-neutral-400">(example)</span>
            </div>
            <span
              className={[
                "text-[11px] font-black rounded-full px-2 py-1 ring-1",
                gradePill("avoid"),
              ].join(" ")}
            >
              {demo.gradeLabel} · score {demo.score}
            </span>
          </div>

          <div className="mt-3 text-base font-black tracking-tight text-neutral-900">
            {demo.title}
          </div>
          <div className="mt-1 text-xs text-neutral-600 leading-relaxed">
            {demo.oneLine}
          </div>

          <div className="mt-3 rounded-2xl bg-white ring-1 ring-neutral-200/60 p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-neutral-500">
                  Example item
                </div>
                <div className="mt-1 text-sm font-black text-neutral-900 truncate">
                  {demo.product}
                </div>
                <div className="mt-1 text-xs text-neutral-500">
                  Top signal:{" "}
                  <span className="font-semibold text-neutral-800">
                    {demo.topSignal}
                  </span>
                </div>
              </div>

              <div className="shrink-0 ml-3">
                <span
                  className={[
                    "inline-flex items-center justify-center h-9 w-9 rounded-full font-black text-sm ring-4",
                    "bg-neutral-900 text-white ring-neutral-200",
                  ].join(" ")}
                >
                  {demo.score}
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {demo.signals.map((s) => (
                <span
                  key={s}
                  className="text-[11px] font-semibold text-neutral-700 rounded-full bg-neutral-100 px-2 py-1"
                >
                  {s}
                </span>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {demo.focus.map((t) => (
                <span
                  key={t}
                  className="text-[11px] font-semibold text-neutral-600 rounded-full bg-white ring-1 ring-neutral-200/60 px-2 py-1 inline-flex items-center gap-1"
                >
                  <Dot size={16} className="text-neutral-300 -ml-1" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* ✅ Smart swaps: chocolate → chocolate (same aisle) */}
          <div className="mt-3 rounded-2xl bg-white ring-1 ring-neutral-200/60 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black text-neutral-800">
                Smart swaps
              </div>
              <div className="text-[11px] font-semibold text-neutral-500">
                same category
              </div>
            </div>

            <div className="mt-2 space-y-2">
              {demo.swaps.map((x) => (
                <div
                  key={x.name}
                  className="rounded-2xl bg-neutral-50 ring-1 ring-neutral-200/60 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-neutral-900 truncate">
                        {x.name}
                      </div>
                      <div className="mt-1 text-xs text-neutral-600 leading-relaxed">
                        {x.reason}
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] font-black rounded-full bg-white ring-1 ring-neutral-200/60 px-2 py-1 text-neutral-700">
                      {x.price}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 rounded-2xl bg-neutral-900 text-white p-3">
            <div className="text-[11px] font-bold opacity-80">Next step</div>
            <div className="text-sm font-black">{demo.next}</div>
            <div className="mt-1 text-[11px] opacity-70">
              One small swap per week improves your trend.
            </div>
          </div>

          <div className="mt-3 text-[11px] text-neutral-500">
            This is what you’ll see after scanning.
          </div>
        </div>

        {/* Auth section / recent */}
        <div className="mt-6">
          {isAuthed ? (
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-black text-neutral-800">
                <History size={16} className="text-neutral-400" />
                Recent scans
              </div>
              <Link
                href="/dashboard"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                View all
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl bg-white ring-1 ring-neutral-200/60 p-4">
              <div className="text-sm font-black text-neutral-900">
                Keep history + trends
              </div>
              <div className="mt-1 text-xs text-neutral-600">
                Log in to save Insights, track patterns, and unlock unlimited scans.
              </div>
              <Link
                href="/login"
                className="mt-3 inline-flex items-center justify-center w-full rounded-xl bg-emerald-600 text-white py-3 text-sm font-black"
              >
                Unlock history
                <ArrowRight size={16} className="ml-2 opacity-90" />
              </Link>
            </div>
          )}

          {isAuthed && (
            <div className="space-y-2">
              {recentScans.length === 0 ? (
                <div className="rounded-2xl bg-white ring-1 ring-neutral-200/60 p-4 text-sm text-neutral-500">
                  No scans yet.
                </div>
              ) : (
                recentScans.map((scan) => (
                  <Link
                    href={`/scan-result?id=${scan.id}`}
                    key={scan.id}
                    className="block rounded-2xl bg-white ring-1 ring-neutral-200/60 p-4 hover:ring-emerald-200 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={[
                              "text-[11px] font-black rounded-full px-2 py-1 ring-1",
                              gradePill(scan.grade),
                            ].join(" ")}
                          >
                            {String(scan.grade || "").toUpperCase()} · {scan.score}
                          </span>
                        </div>
                        <div className="mt-2 font-bold text-neutral-900 truncate">
                          {scan.product_name || "Unknown"}
                        </div>
                        <div className="text-xs text-neutral-400">
                          {new Date(scan.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-neutral-300" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-[11px] text-neutral-400">
          Tip: one small swap per week changes your trend.
        </div>
      </div>
    </main>
  );
}