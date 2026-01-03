"use client";

import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  if (typeof window === "undefined") return false;
  // iOS Safari standalone
  const iosStandalone = (window.navigator as any).standalone === true;
  // Other browsers
  const displayModeStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches;
  return iosStandalone || displayModeStandalone;
}

export default function AddToHomeScreenPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  const ios = useMemo(() => isIOS(), []);
  const standalone = useMemo(() => isInStandaloneMode(), []);

  useEffect(() => {
    if (standalone) return; // 已经安装/桌面打开就不提示

    // Android/Chrome: 监听 beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setHidden(false);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // iOS: 没有 beforeinstallprompt，直接显示引导条
    if (ios) setHidden(false);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [ios, standalone]);

  if (standalone || hidden) return null;

  const onInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
      setHidden(true);
    }
  };

  return (
    <div className="fixed left-0 right-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-50 px-4">
      <div className="mx-auto max-w-md rounded-2xl border border-neutral-200 bg-white/95 backdrop-blur p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Add GoodPick to Home Screen</div>

            {ios ? (
              <div className="mt-1 text-xs text-neutral-600">
                iPhone/iPad：点 Safari 的 <b>Share</b>（方框上箭头）→ <b>Add to Home Screen</b>
              </div>
            ) : (
              <div className="mt-1 text-xs text-neutral-600">
                Install the app for faster scanning and a full-screen experience.
              </div>
            )}
          </div>

          <button
            className="text-xs text-neutral-500 hover:text-neutral-800"
            onClick={() => setHidden(true)}
          >
            ✕
          </button>
        </div>

        {!ios && deferredPrompt && (
          <button
            onClick={onInstallClick}
            className="mt-3 w-full rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            Install
          </button>
        )}
      </div>
    </div>
  );
}