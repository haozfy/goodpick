// src/app/page.tsx
import Link from "next/link";
import { Scan, Search, Clock, User, ChevronRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-50 pb-28">
      {/* --- 顶部问候语 --- */}
      <header className="px-6 pt-14 pb-6">
        <h1 className="text-3xl font-bold text-neutral-900 leading-tight">
          Hello, <br />
          <span className="text-emerald-600">Health Seeker</span>
        </h1>
      </header>

      {/* --- 搜索栏 --- */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm ring-1 ring-neutral-100 transition-all active:scale-[0.98]">
          <Search size={20} className="text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search for a product..." 
            className="w-full bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
          />
        </div>
      </div>

      {/* --- 核心功能：扫描卡片 (Hero Action) --- */}
      <div className="px-6 mb-10">
        <div className="relative overflow-hidden rounded-[32px] bg-neutral-900 p-8 text-white shadow-xl shadow-neutral-200">
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* 扫描图标光晕效果 */}
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 ring-4 ring-emerald-500/20">
              <Scan size={32} strokeWidth={2.5} />
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight">Scan a Barcode</h2>
            <p className="mt-2 text-neutral-400 max-w-[200px]">
              Discover the nutritional truth in seconds.
            </p>
            
            <button className="mt-8 w-full rounded-2xl bg-white py-4 text-sm font-bold text-neutral-900 transition-transform active:scale-95">
              Start Scanning
            </button>
          </div>
          
          {/* 装饰性背景光晕 */}
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-neutral-800 opacity-50 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-900 opacity-40 blur-3xl" />
        </div>
      </div>

      {/* --- 最近扫描记录 (History) --- */}
      <div className="px-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-neutral-900">Recent Scans</h3>
          <Link href="/dashboard" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
            See all
          </Link>
        </div>
        
        <div className="space-y-3">
          {/* 模拟数据列表 - 点击跳转到详情页 */}
          <HistoryItem 
            href="/product" 
            name="Oat Milk Original" 
            brand="Oatly" 
            score={92} 
            time="2m ago"
          />
          <HistoryItem 
            href="/product" 
            name="Tomato Ketchup" 
            brand="Heinz" 
            score={45} 
            time="1h ago"
          />
          <HistoryItem 
            href="/product" 
            name="Dark Chocolate 85%" 
            brand="Lindt" 
            score={78} 
            time="Yesterday"
          />
        </div>
      </div>

      {/* --- 底部导航栏 (Bottom Navigation) --- */}
      {/* 这是一个悬浮的导航条，方便你在各个页面间跳转 */}
      <nav className="fixed bottom-6 left-6 right-6 h-18 rounded-full bg-white/90 backdrop-blur-lg shadow-2xl ring-1 ring-neutral-200/50 z-50 px-2">
        <div className="flex h-full items-center justify-around">
          <NavLink href="/" icon={<Search size={24} />} active />
          <NavLink href="/dashboard" icon={<Clock size={24} />} />
          <NavLink href="/account" icon={<User size={24} />} />
        </div>
      </nav>
    </div>
  );
}

// --- 辅助组件 ---

function HistoryItem({ href, name, brand, score, time }: any) {
  // 根据分数决定颜色
  let colorClass = "bg-emerald-500";
  if (score < 40) colorClass = "bg-rose-500";
  else if (score < 70) colorClass = "bg-amber-400";

  return (
    <Link href={href} className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm ring-1 ring-neutral-100 transition-all hover:bg-neutral-50 active:scale-[0.99]">
      <div className="flex items-center gap-4">
        {/* 产品小图模拟 */}
        <div className="relative h-14 w-14 flex-shrink-0 rounded-xl bg-neutral-100 flex items-center justify-center text-xs text-neutral-400">
            Img
            <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white ${colorClass} flex items-center justify-center text-[8px] font-bold text-white`}>
                {score}
            </div>
        </div>
        
        <div>
          <h4 className="font-semibold text-neutral-900 leading-tight">{name}</h4>
          <p className="text-xs text-neutral-500 mt-0.5">{brand}</p>
        </div>
      </div>
      
      <div className="flex items-center text-neutral-400 gap-1">
        <span className="text-xs">{time}</span>
        <ChevronRight size={16} />
      </div>
    </Link>
  );
}

function NavLink({ href, icon, active }: { href: string; icon: React.ReactNode; active?: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
        active 
          ? "bg-neutral-900 text-white shadow-md" 
          : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
      }`}
    >
      {icon}
    </Link>
  );
}
