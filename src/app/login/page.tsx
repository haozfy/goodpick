// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const router = useRouter();
  const supabase = createClient();

  const ACCOUNT_PATH = "/account";

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErrorMsg("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // ✅ 你原来就对：邮箱确认链接回来走 callback
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (error) throw error;

        // ✅ 比 alert 更温和：先给明确提示
        setErrorMsg("✅ Success! Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // ✅ 用 replace：避免登录后按返回又回到 /login
        router.replace(ACCOUNT_PATH);
        router.refresh();
      }
    } catch (error: any) {
      setErrorMsg(error?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;

    setErrorMsg("");
    setLoading(true);

    try {
      const next = encodeURIComponent(ACCOUNT_PATH);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // ✅ 仍回 /account（不搞 redirect 参数，不引入 useSearchParams）
          redirectTo: `${location.origin}/auth/callback?next=${next}`,
        },
      });

      if (error) throw error;
      // OAuth 会跳走，这里不需要 setLoading(false)
    } catch (error: any) {
      setErrorMsg(error?.message || "Google login failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-neutral-900">
            Good<span className="text-emerald-600">Pick</span>
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            {isSignUp
              ? "Create an account to verify food."
              : "Welcome back, health seeker."}
          </p>
        </div>

        {/* 错误 / 提示 */}
        {errorMsg ? (
          <div className="mb-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
            {errorMsg}
          </div>
        ) : null}

        {/* --- Google 登录按钮 --- */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mb-6 flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white py-3.5 font-bold text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-all active:scale-95 disabled:opacity-70"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-neutral-50 px-2 text-neutral-400">
              Or with email
            </span>
          </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Mail
                className="absolute left-3 top-3.5 text-neutral-400"
                size={20}
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-10 pr-4 text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-70"
                required
              />
            </div>

            <div className="relative">
              <Lock
                className="absolute left-3 top-3.5 text-neutral-400"
                size={20}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-10 pr-4 text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-70"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3.5 font-bold text-white transition-transform active:scale-95 disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {isSignUp ? "Sign Up" : "Log In"}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => {
              if (loading) return;
              setErrorMsg("");
              setIsSignUp(!isSignUp);
            }}
            className="text-sm font-medium text-neutral-500 hover:text-emerald-600"
          >
            {isSignUp
              ? "Already have an account? Log In"
              : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}