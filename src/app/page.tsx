import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Camera, ArrowRight, History } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 获取最近的 2 条记录
  let recentScans = [];
  if (user) {
    const { data } = await supabase
      .from("scans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2);
    recentScans = data || [];
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-neutral-50 px-6 pt-20">
      {/* 1. 头部 Slogan */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-black text-neutral-900 tracking-tighter">
          Good<span className="text-emerald-600">Pick</span>
        </h1>
        <p className="mt-3 text-neutral-500">Scan food. Spot traps. Eat better.</p>
      </div>

      {/* 2. 核心功能：巨大的拍照按钮 */}
      {/* 这里将来会连接 API，现在先放 UI */}
      <Link href="/scan-result" className="group relative flex h-48 w-48 items-center justify-center rounded-full bg-neutral-900 shadow-2xl transition-transform active:scale-95">
        <div className="absolute inset-0 rounded-full border-2 border-white/20"></div>
        <div className="flex flex-col items-center gap-2">
          <Camera size={48} className="text-emerald-400" />
          <span className="font-bold text-white">SCAN</span>
        </div>
      </Link>
      
      {/* 提示文案 */}
      <p className="mt-6 text-xs font-medium text-neutral-400 uppercase tracking-widest">
        Tap to verify ingredients
      </p>

      {/* 3. 最近记录 (Recent Scans) */}
      {user && recentScans.length > 0 && (
        <div className="mt-16 w-full max-w-sm">
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-neutral-900">Recent Scans</h2>
            <Link href="/dashboard" className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              View All <ArrowRight size={12}/>
            </Link>
          </div>
          
          <div className="space-y-3">
            {recentScans.map((scan) => (
              <div key={scan.id} className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm border border-neutral-100">
                <div className="flex items-center gap-3">
                  {/* 分数圆圈 */}
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-white ${scan.grade === 'green' ? 'bg-emerald-500' : 'bg-neutral-900'}`}>
                    {scan.score}
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-800">{scan.product_name}</h3>
                    <p className="text-xs text-neutral-400">{new Date(scan.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                {/* 这里的 Link 指向结果页 */}
                <Link href={`/scan-result?id=${scan.id}`} className="rounded-full bg-neutral-100 p-2 text-neutral-600">
                  <ArrowRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}