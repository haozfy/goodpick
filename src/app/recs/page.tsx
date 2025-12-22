"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Sparkles, Loader2, ShoppingBag } from "lucide-react";

function RecsContent() {
  const searchParams = useSearchParams();
  const originId = searchParams.get("originId"); // 获取来源产品的 ID
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!originId) return;

    const fetchAlternatives = async () => {
      const supabase = createClient();
      // 去 scans 表里查这个产品的 alternatives 字段
      const { data, error } = await supabase
        .from("scans")
        .select("alternatives, product_name")
        .eq("id", originId)
        .single();

      if (data?.alternatives) {
        setAlternatives(data.alternatives);
      }
      setLoading(false);
    };

    fetchAlternatives();
  }, [originId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-8">
      {/* 顶部 Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href={originId ? `/scan-result?id=${originId}` : "/"} className="rounded-full bg-white p-2 text-neutral-900 shadow-sm border border-neutral-200">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-black text-neutral-900">Better Choices</h1>
        </div>
        
        <div className="rounded-xl bg-emerald-100 p-4 text-emerald-800 text-sm font-medium">
          Found <strong>{alternatives.length}</strong> healthier alternatives for you based on ingredients.
        </div>
      </div>

      {/* 替代品列表 */}
      <div className="space-y-4">
        {alternatives.length > 0 ? (
          alternatives.map((item, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-neutral-100 transition-all hover:border-emerald-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900">{item.name}</h3>
                    <span className="text-[10px] font-bold bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded">
                      {item.price || "$$"}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="pl-[52px]">
                <p className="text-sm text-neutral-600 leading-relaxed">
                  {item.reason}
                </p>
              </div>
              
              {/* 模拟购买按钮 (可选) */}
              <button className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 py-2.5 text-xs font-bold text-white active:scale-95 transition-transform">
                <ShoppingBag size={14} /> Find in Store
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-neutral-400">
            <p>No specific alternatives found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RecsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-50"></div>}>
      <RecsContent />
    </Suspense>
  );
}