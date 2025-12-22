import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 获取所有记录
  const { data: scans } = await supabase
    .from("scans")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-neutral-50 px-6 pb-24 pt-8">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/" className="rounded-full bg-white p-2 text-neutral-900 shadow-sm border border-neutral-200">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900">Scan History</h1>
      </div>

      <div className="grid gap-3">
        {scans?.map((scan) => (
          <Link href={`/scan-result?id=${scan.id}`} key={scan.id} className="block">
            <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-neutral-100 transition-colors hover:border-emerald-200">
              <div className="flex items-center gap-4">
                {/* 缩略图 Placeholder */}
                <div className="h-12 w-12 rounded-xl bg-neutral-100 object-cover">
                  {/* 如果有 image_url 可以放 img 标签 */}
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900">{scan.product_name || "Unknown Item"}</h3>
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <span>{new Date(scan.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className={scan.grade === 'black' ? 'text-neutral-500' : 'text-emerald-600'}>
                      {scan.grade === 'black' ? 'Black Card' : 'Green Card'}
                    </span>
                  </div>
                </div>
              </div>
              <div className={`text-lg font-black ${scan.grade === 'green' ? 'text-emerald-500' : 'text-neutral-900'}`}>
                {scan.score}
              </div>
            </div>
          </Link>
        ))}

        {(!scans || scans.length === 0) && (
          <div className="mt-10 text-center text-neutral-400">
            <p>No scans yet.</p>
            <Link href="/" className="mt-4 inline-block text-emerald-600 underline">Start scanning</Link>
          </div>
        )}
      </div>
    </div>
  );
}