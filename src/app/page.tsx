"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// 如果你已有 supabase client 工具函数，用你自己的路径替换
import { createClient } from "@/lib/supabase/client";

type ScanResponse =
  | { scanId: string }
  | { code: "LIMIT_REACHED"; message?: string }
  | { error: string; message?: string };

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function HomePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [showLimit, setShowLimit] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setUserEmail(data.user?.email ?? null);
    });
    return () => {
      alive = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = () => fileRef.current?.click();

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setErr("请上传图片文件（jpg/png/heic等）。");
      return;
    }
    setErr(null);
    setFile(f);
  };

  const onScan = async () => {
    if (!file) {
      setErr("先拍一张或上传一张图片。");
      return;
    }
    setErr(null);
    setBusy(true);

    try {
      const fd = new FormData();
      fd.append("image", file);

      const res = await fetch("/api/scan", { method: "POST", body: fd });
      const data = (await res.json()) as ScanResponse;

      if ("code" in data && data.code === "LIMIT_REACHED") {
        setShowLimit(true);
        return;
      }

      // 你也可以改成 data.id / data.scan_id，按你后端实际返回调整
      if ("scanId" in data && data.scanId) {
        router.push(`/scan/result?scanId=${encodeURIComponent(data.scanId)}`);
        return;
      }

      setErr(("message" in data && data.message) || "扫描失败，请稍后重试。");
    } catch (e) {
      setErr("网络或服务器错误，请稍后重试。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-white text-zinc-900">
      {/* 顶部条：极简，不要导航 */}
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-zinc-900" />
          <div className="leading-tight">
            <div className="text-sm font-semibold">GoodPick</div>
            <div className="text-xs text-zinc-500">拍一下就知道</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
            免费 3 次
          </span>

          {userEmail ? (
            <Link
              href="/me"
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50"
            >
              {userEmail}
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50"
            >
              登录
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-10">
        {/* Hero：一句话 + 一个动作 */}
        <section className="mt-6">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            拍一下，看看这东西值不值得吃
          </h1>
          <p className="mt-3 text-base text-zinc-600">
            不讲营养学大道理，直接给你结论：✅可以 / ⚠️谨慎 / ❌不推荐
          </p>

          {/* 主卡片：拍/传 + 预览 + 扫描 */}
          <div
            className={cn(
              "mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4",
              "shadow-sm"
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-zinc-200 bg-white sm:w-[55%]">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
                    <div className="text-sm font-medium">拖拽图片到这里</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      或点击下方按钮拍照 / 上传
                    </div>
                  </div>
                )}

                {busy && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                    <div className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm">
                      分析中…
                    </div>
                  </div>
                )}
              </div>

              <div className="flex w-full flex-col justify-between sm:w-[45%]">
                <div className="space-y-2">
                  <div className="text-sm font-medium">第一步：拍/上传</div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={pickFile}
                      className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
                      disabled={busy}
                    >
                      📷 拍照 / 上传
                    </button>

                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm hover:bg-zinc-50"
                      disabled={busy || !file}
                    >
                      清空
                    </button>

                    <Link
                      href="/history"
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm hover:bg-zinc-50"
                    >
                      查看历史
                    </Link>
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (!f) return;
                      if (!f.type.startsWith("image/")) {
                        setErr("请上传图片文件（jpg/png/heic等）。");
                        return;
                      }
                      setErr(null);
                      setFile(f);
                    }}
                  />

                  <div className="pt-3 text-sm font-medium">第二步：出结论</div>

                  <button
                    type="button"
                    onClick={onScan}
                    className={cn(
                      "w-full rounded-xl px-4 py-3 text-sm font-semibold",
                      file
                        ? "bg-white hover:bg-zinc-50 border border-zinc-200"
                        : "bg-zinc-200 text-zinc-500 cursor-not-allowed"
                    )}
                    disabled={busy || !file}
                  >
                    立即分析 →
                  </button>

                  {err && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-l-4 px-4 py-3 text-sm text-red-700">
                      {err}
                    </div>
                  )}
                </div>

                {/* 小提示：不解释太多 */}
                <div className="mt-4 rounded-xl bg-white p-3 text-xs text-zinc-600 border border-zinc-200">
                  小提示：拍食品正面+配料表更准。免费用户可用 3 次，升级后无限次。
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 次数用尽弹窗 */}
      {showLimit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="text-lg font-semibold">免费次数已用完</div>
            <div className="mt-2 text-sm text-zinc-600">
              你已使用完免费 3 次。注册并升级 Pro 后可无限次使用。
            </div>
            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm hover:bg-zinc-50"
                onClick={() => setShowLimit(false)}
              >
                先不升级
              </button>
              <Link
                className="flex-1 rounded-xl bg-zinc-900 px-4 py-2 text-center text-sm text-white hover:bg-zinc-800"
                href="/pricing"
              >
                升级 Pro
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}