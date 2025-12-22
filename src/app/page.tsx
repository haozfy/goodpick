"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Loader2, ArrowRight, ScanLine, History, Sparkles } from "lucide-react";

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleScanClick = () => {
    if (!isAnalyzing) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    console.log("Photo selected:", file.name);
    
    // Simulate analysis delay
    setTimeout(() => {
      router.push("/scan-result?id=demo-123");
    }, 2000);
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-neutral-50/50 px-6 pt-16 pb-24 relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-400/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      {/* 1. Header & Branding */}
      <div className="mb-16 text-center relative z-10">
        <div className="inline-flex items-center justify-center p-3 mb-4 bg-white rounded-2xl shadow-sm border border-neutral-100">
          <ScanLine size={28} className="text-emerald-600" />
        </div>
        <h1 className="text-5xl font-black text-neutral-900 tracking-tighter leading-tight">
          Good<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Pick</span>
        </h1>
        <p className="mt-4 text-lg font-medium text-neutral-500 max-w-xs mx-auto leading-relaxed">
          Your pocket food analyst. Spot hidden traps instantly.
        </p>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* 2. Main Action: The Scanner Button */}
      <div className="relative z-10 group">
        {/* Pulsing effect behind the button */}
        {!isAnalyzing && (
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping-slow pointer-events-none"></div>
        )}
        <button 
          onClick={handleScanClick}
          disabled={isAnalyzing}
          className="relative flex h-56 w-56 items-center justify-center rounded-full bg-gradient-to-br from-neutral-900 to-neutral-800 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-4 border-neutral-800/50 transition-all duration-300 active:scale-95 active:shadow-[0_10px_30px_rgba(0,0,0,0.2)] disabled:opacity-90 disabled:scale-100 overflow-hidden"
        >
          {/* Inner glowing ring */}
          <div className={`absolute inset-2 rounded-full border-[3px] transition-all duration-500 ${isAnalyzing ? 'border-emerald-500/80 animate-spin-slow' : 'border-white/10 group-hover:border-emerald-500/50'}`}></div>
          
          <div className="flex flex-col items-center gap-3 relative z-10">
            {isAnalyzing ? (
              <>
                <Loader2 size={56} className="text-emerald-400 animate-spin drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                <span className="font-bold text-white text-sm tracking-[0.2em] animate-pulse">ANALYZING</span>
              </>
            ) : (
              <>
                <Camera size={56} className="text-white transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]" />
                <span className="font-black text-2xl text-white tracking-wider">SCAN</span>
              </>
            )}
          </div>
          
          {/* Subtle scanline animation effect */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent animate-scan pointer-events-none"></div>
          )}
        </button>
      </div>
      
      <p className="mt-8 text-sm font-semibold text-neutral-400 uppercase tracking-widest relative z-10">
        Tap to snap ingredients
      </p>

      {/* 3. Recent History Preview (Placeholder) */}
      <div className="mt-auto w-full max-w-sm relative z-10">
         <div className="flex items-center justify-between mb-4 px-1">
           <h2 className="text-sm font-bold text-neutral-700 flex items-center gap-2">
             <History size={16} className="text-neutral-400"/> Recent Activity
           </h2>
         </div>
         {/* Mock Recent Item */}
         <div className="rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-neutral-100/50 flex items-center justify-between opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0 cursor-not-allowed">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-lg font-black text-neutral-400">
                ?
              </div>
              <div>
                <h3 className="font-bold text-neutral-700 text-sm">No recent scans</h3>
                <p className="text-xs text-neutral-400">Your history will appear here</p>
              </div>
            </div>
         </div>
      </div>
    </main>
  );
}