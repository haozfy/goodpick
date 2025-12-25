'use client';

import { useEffect, useState, Suspense, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  ScanLine,
  Share2,
  Download,
} from 'lucide-react';

const ANON_KEY = 'goodpick_anon_id';
const GUEST_KEY = 'gp_last_scan';

type Grade = 'green' | 'yellow' | 'black';
type Verdict = 'good' | 'caution' | 'avoid';

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getOrCreateAnonId() {
  if (typeof window === 'undefined') return null;

  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

function gradeFromData(d: any): Grade {
  const g = String(d?.grade || '').toLowerCase();
  if (g === 'green' || g === 'yellow' || g === 'black') return g;

  const v = String(d?.verdict || '').toLowerCase() as Verdict;
  if (v === 'good') return 'green';
  if (v === 'caution') return 'yellow';
  if (v === 'avoid') return 'black';

  const s = Number(d?.score ?? 0);
  if (s >= 80) return 'green';
  if (s >= 50) return 'yellow';
  return 'black';
}

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isMobile() {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function isWeChat() {
  if (typeof navigator === 'undefined') return false;
  return /MicroMessenger/i.test(navigator.userAgent);
}

function openImagePreview(dataUrl: string) {
  const w = window.open();
  if (!w) return false;

  w.document.write(`
    <html>
      <head>
        <title>GoodPick</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body{margin:0;display:flex;align-items:center;justify-content:center;background:#000;}
          img{max-width:100vw;max-height:100vh;}
          .tip{position:fixed;top:12px;left:12px;right:12px;color:#fff;
            font:14px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial;
            background:rgba(0,0,0,.55);padding:10px 12px;border-radius:12px}
        </style>
      </head>
      <body>
        <div class="tip">${
          isIOS()
            ? 'Long-press the image to save to Photos.'
            : 'Right-click / long-press the image to save.'
        }</div>
        <img src="${dataUrl}" />
      </body>
    </html>
  `);
  w.document.close();
  return true;
}

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id'); // may be null

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [shareMsg, setShareMsg] = useState<string>('');
  const [dlMsg, setDlMsg] = useState<string>('');

  const [exporting, setExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // ✅ 统一 redirect 控制：避免在条件分支里调用 useEffect（会导致你现在的白屏炸掉）
  const [shouldRedirect, setShouldRedirect] = useState(false);

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

      // A) 没有 id：兜底读 sessionStorage
      if (!id) {
        const raw =
          typeof window !== 'undefined' ? sessionStorage.getItem(GUEST_KEY) : null;
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
          .from('scans')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && scan) {
          commit(scan);
          return;
        }
      }

      // 2) 匿名兜底：按 id + anon_id 查
      const anonId = getOrCreateAnonId();

      if (anonId) {
        const { data: anonScan, error: anonErr } = await supabase
          .from('scans')
          .select('*')
          .eq('id', id)
          .eq('anon_id', anonId)
          .maybeSingle();

        if (!anonErr && anonScan) {
          commit(anonScan);
          return;
        }
      }

      // 3) Public fallback（你建的 RPC）
      try {
        const { data: pub, error: pubErr } = await supabase.rpc('get_scan_public', {
          p_id: id,
        });
        if (!pubErr && pub && Array.isArray(pub) && pub[0]) {
          commit(pub[0]);
          return;
        }
      } catch {
        // ignore
      }

      // C) 最后兜底：再读 sessionStorage
      const raw =
        typeof window !== 'undefined' ? sessionStorage.getItem(GUEST_KEY) : null;

      commit(safeJsonParse<any>(raw));
    };

    run();

    return () => {
      alive = false;
    };
  }, [id]);

  // ✅ loading 完成后，如果 data 仍然为空 → 触发 redirect（hook 永远在顶层调用）
  useEffect(() => {
    if (!loading && !data) {
      setShouldRedirect(true);
      const t = setTimeout(() => {
        router.replace('/');
      }, 400);
      return () => clearTimeout(t);
    }
  }, [loading, data, router]);

  const grade = useMemo(() => gradeFromData(data), [data]);
  const score = Number(data?.score ?? 0);
  const productName = data?.product_name || 'Unknown Product';
  const analysis = data?.analysis || 'No analysis details provided.';

  const theme = useMemo(() => {
    if (grade === 'black') {
      return {
        bg: 'bg-neutral-900',
        cardBg: 'bg-neutral-800',
        text: 'text-white',
        subText: 'text-neutral-400',
        ringBg: 'border-neutral-700',
        ringFg: 'border-red-500',
        badge: 'bg-red-500/20 text-red-200',
        icon: <AlertTriangle size={16} />,
        gradeText: 'Black Card • Avoid',
        topLabel: 'text-white/40',
        backBtn: 'bg-white/10 text-white hover:bg-white/20',
        pillBtn: 'bg-white/10 text-white hover:bg-white/20',
        brandText: 'text-white/40 hover:text-white/70',
        exportBg: '#111827',
      };
    }
    if (grade === 'yellow') {
      return {
        bg: 'bg-amber-50',
        cardBg: 'bg-white',
        text: 'text-neutral-900',
        subText: 'text-amber-900/70',
        ringBg: 'border-amber-100',
        ringFg: 'border-amber-500',
        badge: 'bg-amber-100 text-amber-800',
        icon: <ShieldAlert size={16} />,
        gradeText: 'Yellow Card • Caution',
        topLabel: 'text-amber-900/40',
        backBtn: 'bg-white text-neutral-900 shadow-sm hover:bg-amber-100',
        pillBtn: 'bg-white text-neutral-900 shadow-sm hover:bg-amber-100',
        brandText: 'text-amber-900/40 hover:text-amber-900/70',
        exportBg: '#ffffff',
      };
    }
    return {
      bg: 'bg-emerald-50',
      cardBg: 'bg-white',
      text: 'text-neutral-900',
      subText: 'text-emerald-900/70',
      ringBg: 'border-emerald-100',
      ringFg: 'border-emerald-500',
      badge: 'bg-emerald-100 text-emerald-700',
      icon: <CheckCircle size={16} />,
      gradeText: 'Green Card • Good',
      topLabel: 'text-emerald-900/40',
      backBtn: 'bg-white text-neutral-900 shadow-sm hover:bg-emerald-100',
      pillBtn: 'bg-white text-neutral-900 shadow-sm hover:bg-emerald-100',
      brandText: 'text-emerald-900/40 hover:text-emerald-900/70',
      exportBg: '#ffffff',
    };
  }, [grade]);

  const showAlternatives = grade !== 'green';

  const handleShare = async () => {
    try {
      setShareMsg('');

      const origin =
        typeof window !== 'undefined' ? window.location.origin : 'https://goodpick.app';

      if (!id) {
        setShareMsg('Nothing to share');
        setTimeout(() => setShareMsg(''), 1200);
        return;
      }

      // ✅ 分享短链
      const shareUrl = `${origin}/s/${encodeURIComponent(id)}`;

      const verdictText =
        grade === 'green' ? 'Good' : grade === 'yellow' ? 'Caution' : 'Avoid';

      const text = `GoodPick result: ${verdictText} (${
        Number.isFinite(score) ? score : 0
      }) — ${productName}`;

      if ((navigator as any)?.share) {
        await (navigator as any).share({
          title: 'GoodPick',
          text,
          url: shareUrl,
        });
        setShareMsg('Shared');
        setTimeout(() => setShareMsg(''), 1200);
        return;
      }

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShareMsg('Link copied');
        setTimeout(() => setShareMsg(''), 1200);
        return;
      }

      window.prompt('Copy link:', shareUrl);
      setShareMsg('Copied');
      setTimeout(() => setShareMsg(''), 1200);
    } catch {
      setShareMsg('Couldn’t share');
      setTimeout(() => setShareMsg(''), 1400);
    }
  };

  const handleDownload = async () => {
    let blobUrl: string | null = null;

    try {
      setDlMsg('');

      const el = cardRef.current;
      if (!el) throw new Error('no-card');

      setExporting(true);

      await new Promise((r) => setTimeout(r, 80));
      // @ts-ignore
      if (document?.fonts?.ready) {
        // @ts-ignore
        await document.fonts.ready;
      }

      const mod = await import('html-to-image');

      const blob = await mod.toBlob(el, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: theme.exportBg,
      });

      setExporting(false);

      if (blob) {
        const safeName = (productName || 'result')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 40);

        const file = new File([blob], `goodpick-${safeName || 'result'}.png`, {
          type: 'image/png',
        });

        const nav: any = navigator;

        if (nav?.canShare?.({ files: [file] }) && nav?.share) {
          await nav.share({ title: 'GoodPick', files: [file] });
          setDlMsg('Saved');
          setTimeout(() => setDlMsg(''), 1200);
          return;
        }

        blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `goodpick-${safeName || 'result'}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();

        setDlMsg('Downloaded');
        setTimeout(() => setDlMsg(''), 1200);
        return;
      }

      const dataUrl = await mod.toPng(el, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: theme.exportBg,
      });

      setExporting(false);

      if (isMobile() || isWeChat()) {
        const ok = openImagePreview(dataUrl);
        if (ok) {
          setDlMsg('Opened');
          setTimeout(() => setDlMsg(''), 1200);
          return;
        }
      }

      const a2 = document.createElement('a');
      a2.href = dataUrl;
      a2.download = 'goodpick-result.png';
      document.body.appendChild(a2);
      a2.click();
      a2.remove();

      setDlMsg('Downloaded');
      setTimeout(() => setDlMsg(''), 1200);
    } catch {
      setExporting(false);
      setDlMsg('Couldn’t save');
      setTimeout(() => setDlMsg(''), 1400);
    } finally {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
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

  // Not found → 显示 redirect UI（跳转逻辑在上面的 useEffect 里）
  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 text-center">
        <div className="rounded-full bg-neutral-100 p-4 mb-4">
          <ScanLine className="h-8 w-8 text-neutral-400" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900">
          {shouldRedirect ? 'Redirecting…' : 'Not found'}
        </h2>
        <p className="mt-2 text-neutral-500 mb-8">
          We couldn&apos;t find the result. Taking you back to scan.
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
    <div className={`min-h-screen ${theme.bg} px-6 py-8 transition-colors duration-500`}>
      {/* Top nav */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className={`rounded-full p-2 transition-colors ${theme.backBtn}`}>
          <ArrowLeft size={20} />
        </Link>

        <span className={`text-xs font-bold tracking-[0.2em] uppercase ${theme.topLabel}`}>
          Analysis Result
        </span>

        <div className="w-9" />
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        className={`relative z-10 mx-auto w-full max-w-sm rounded-[2rem] ${theme.cardBg} p-8 transition-all duration-500 ${
          exporting ? 'shadow-none' : 'shadow-2xl'
        }`}
      >
        {/* Score ring */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className={`h-40 w-40 rounded-full border-[10px] ${theme.ringBg}`} />
            <div className={`absolute inset-0 rounded-full border-[10px] ${theme.ringFg}`} />
            <div
              className={`absolute inset-0 flex items-center justify-center text-6xl font-black ${theme.text}`}
            >
              {Number.isFinite(score) ? score : 0}
            </div>
          </div>
        </div>

        {/* Name */}
        <h1 className={`mb-3 text-center text-2xl font-black leading-tight ${theme.text}`}>
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
        <div className={`mb-8 text-center text-sm leading-relaxed font-medium ${theme.subText}`}>
          {analysis}
        </div>

        {/* Brand + Share/Download */}
        <div className="mb-10 flex items-center justify-between">
          <a
            href="https://goodpick.app"
            target="_blank"
            rel="noreferrer"
            className={`text-[11px] font-bold tracking-[0.14em] uppercase ${theme.brandText}`}
          >
            goodpick.app
          </a>

          <div className={`flex items-center gap-2 ${exporting ? 'hidden' : ''}`}>
            <button
              type="button"
              onClick={handleShare}
              className={`rounded-full px-3 py-2 text-[11px] font-black tracking-wide transition-colors ${theme.pillBtn}`}
              aria-label="Share"
              title="Share"
            >
              {shareMsg ? <span>{shareMsg}</span> : <Share2 size={14} />}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className={`rounded-full px-3 py-2 text-[11px] font-black tracking-wide transition-colors ${theme.pillBtn}`}
              aria-label="Download"
              title="Download"
            >
              {dlMsg ? <span>{dlMsg}</span> : <Download size={14} />}
            </button>
          </div>
        </div>

        {/* CTA */}
        {showAlternatives ? (
          <div className="space-y-3">
            <Link
              href={id ? `/recs?originId=${id}` : '/recs'}
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