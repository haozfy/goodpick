"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Camera, Loader2, ArrowRight, History } from "lucide-react";

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

        // ✅ 登录：直接进 scan-result
        if (data?.id) {
          router.push(`/scan-result?id=${data.id}`);
          return;
        }

        // ✅ 未登录：走 guest scan-result
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

  return (
    <main className="min-h-screen bg-neutral-50 px-6 pt-14 pb-10 flex flex-col items-center">
      {/* subtle glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[680px] h-[680px] rounded-full bg-emerald-400/10 blur-3xl -z-10" />

      {/* HEADER */}
      <div className="w-full max-w-sm text-center">
        <h1 className="text-4xl font-black tracking-tight text-neutral-900">
          Good<span className="text-emerald-600">Pick</span>
        </h1>

        {/* 👇 一句话点明是扫食品 */}
        <p className="mt-3 text-base font-semibold text-neutral-800">
          Scan food labels.
        </p>

        {/* 👇 明确“拍哪里” */}
        <p className="mt-1 text-xs text-neutral-500">
          Take a photo of the nutrition facts or ingredients — get a clear verdict in seconds.
        </p>

        {/* 👇 再补一句降低误解 */}
        <p className="mt-1 text-[11px] text-neutral-400">
          Best for packaged foods (nutrition label / ingredients list).
        </p>
      </div>

      {/* hidden input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* MAIN CTA */}
      <div className="mt-10">
        <button
          onClick={pickFile}
          disabled={isAnalyzing}
          className="h-56 w-56 rounded-full bg-neutral-900 text-white shadow-[0_18px_40px_rgba(0,0,0,0.25)] active:scale-95 transition disabled:opacity-80"
        >
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin" size={46} />
              <div className="text-xs tracking-[0.25em] font-bold opacity-80">
                ANALYZING
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3">
              <Camera size={52} />
              <div className="text-lg font-black tracking-wide">
                SCAN FOOD LABEL
              </div>
              <div className="text-[11px] opacity-70">
                NUTRITION & INGREDIENTS
              </div>
            </div>
          )}
        </button>

        <div className="mt-4 text-center text-xs text-neutral-400">
          No signup required to try.
        </div>
      </div>

      {/* BOTTOM */}
      <div className="mt-auto w-full max-w-sm pt-10">
        {isAuthed ? (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-neutral-700">
              <History size={16} className="text-neutral-400" />
              Recent
            </div>
            <Link href="/dashboard" className="text-xs font-bold text-emerald-600">
              View history
            </Link>
          </div>
        ) : (
          <div className="text-center text-xs text-neutral-400">
            Log in to save history and unlock unlimited scans.
          </div>
        )}

        {isAuthed && (
          <div className="space-y-2">
            {recentScans.length === 0 ? (
              <div className="rounded-2xl bg-white border border-neutral-100 p-4 text-sm text-neutral-500">
                No scans yet.
              </div>
            ) : (
              recentScans.map((scan) => (
                <Link
                  href={`/scan-result?id=${scan.id}`}
                  key={scan.id}
                  className="block rounded-2xl bg-white border border-neutral-100 p-4 hover:border-emerald-200 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-black ${
                          scan.grade === "green"
                            ? "bg-emerald-500"
                            : "bg-neutral-900"
                        }`}
                      >
                        {scan.score}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-neutral-900 truncate max-w-[170px]">
                          {scan.product_name || "Unknown"}
                        </div>
                        <div className="text-xs text-neutral-400">
                          {new Date(scan.created_at).toLocaleDateString()}
                        </div>
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
    </main>
  );
}