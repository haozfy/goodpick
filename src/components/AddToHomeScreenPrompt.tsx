'use client';

import { useEffect, useMemo, useState } from 'react';

const KEY = 'gp_a2hs_dismissed_v1';

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isAndroid() {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  // iOS added-to-home-screen
  const nav: any = typeof navigator !== 'undefined' ? navigator : {};
  const iosStandalone = nav.standalone === true;

  // Android/Chrome PWA display-mode
  const mql =
    typeof window !== 'undefined' &&
    typeof window.matchMedia !== 'undefined' &&
    window.matchMedia('(display-mode: standalone)').matches;

  return iosStandalone || !!mql;
}

export default function AddToHomeScreenPrompt({
  delayMs = 800,
}: {
  delayMs?: number;
}) {
  const [open, setOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [mode, setMode] = useState<'ios' | 'android' | null>(null);

  const shouldRun = useMemo(() => {
    if (typeof window === 'undefined') return false;
    if (isInStandaloneMode()) return false;
    const dismissed = localStorage.getItem(KEY) === '1';
    if (dismissed) return false;

    // iOS：只能引导
    if (isIOS()) return true;

    // Android：只有捕获到 beforeinstallprompt 才弹
    if (isAndroid()) return true;

    return false;
  }, []);

  // Android: 捕获 “Install” 事件
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e: any) => {
      // 关键：阻止浏览器默认 mini-infobar
      e.preventDefault();
      setDeferredPrompt(e);
      setMode('android');
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // 决定弹窗类型：iOS 直接提示；Android 只有拿到 deferredPrompt 才提示
  useEffect(() => {
    if (!shouldRun) return;

    const t = setTimeout(() => {
      if (isIOS()) {
        setMode('ios');
        setOpen(true);
        return;
      }
      // Android：必须拿到 deferredPrompt 才值得弹
      if (isAndroid() && deferredPrompt) {
        setMode('android');
        setOpen(true);
        return;
      }
    }, delayMs);

    return () => clearTimeout(t);
  }, [shouldRun, deferredPrompt, delayMs]);

  if (!open || !mode) return null;

  const close = () => {
    localStorage.setItem(KEY, '1');
    setOpen(false);
  };

  const installAndroid = async () => {
    try {
      if (!deferredPrompt) return;
      // 弹出安装对话框
      await deferredPrompt.prompt();
      // 等用户选择
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
      close();
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-20 z-[9999] px-4">
      <div className="mx-auto max-w-sm rounded-2xl bg-neutral-900 text-white shadow-2xl">
        <div className="p-4">
          {mode === 'ios' ? (
            <>
              <div className="text-sm font-bold">Add GoodPick to your Home Screen</div>
              <div className="mt-2 text-[13px] text-white/80 leading-relaxed">
                Tap Safari’s <span className="font-semibold">Share</span> button
                (square with ↑), then choose{' '}
                <span className="font-semibold">“Add to Home Screen”</span>.
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold"
                  onClick={close}
                >
                  Got it
                </button>
                <button
                  className="flex-1 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-neutral-900"
                  onClick={close}
                >
                  OK
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-sm font-bold">Install GoodPick</div>
              <div className="mt-2 text-[13px] text-white/80 leading-relaxed">
                Install the app for faster access and a cleaner full-screen experience.
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold"
                  onClick={close}
                >
                  Not now
                </button>
                <button
                  className="flex-1 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-neutral-900"
                  onClick={installAndroid}
                >
                  Install
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}