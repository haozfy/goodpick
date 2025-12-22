import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function RecsPage() {
  // Mock 数据：这应该来自 scans 表里的 alternatives 字段
  const alternatives = [
    { name: "Olipop Vintage Cola", reason: "Low sugar, high fiber", price: "$$" },
    { name: "Zevia", reason: "Stevia sweetened, no additives", price: "$" },
    { name: "Poppi", reason: "Prebiotics for gut health", price: "$$" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/scan-result" className="rounded-full bg-white p-2 text-neutral-900 shadow-sm border border-neutral-200">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-neutral-900">Better Choices</h1>
      </div>

      <div className="space-y-4">
        {alternatives.map((item, i) => (
          <div key={i} className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm border border-neutral-100">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900">{item.name}</h3>
              <p className="text-sm text-neutral-500">{item.reason}</p>
              <span className="mt-2 inline-block rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                PRICE: {item.price}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}