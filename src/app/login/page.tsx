"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = supabaseBrowser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Email + password 注册
  const onSignUp = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) alert(error.message);
    else alert("Account created. You can now log in.");
  };

  // Email + password 登录
  const onSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert(error.message);
    else window.location.href = "/history";
  };

  // 忘记密码
  const onReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    if (error) alert(error.message);
    else alert("Check your email to reset password.");
  };

  // Google 登录
  const onGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/history`,
      },
    });
  };

  return (
    <main className="mx-auto max-w-sm px-6 py-16 space-y-4">
      <h1 className="text-2xl font-semibold">Login</h1>

      <button onClick={onGoogleLogin} className="w-full h-11 border rounded">
        Continue with Google
      </button>

      <div className="text-xs text-neutral-400 text-center">or</div>

      <input
        className="w-full h-11 border rounded px-3"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="w-full h-11 border rounded px-3"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={onSignIn} className="w-full h-11 bg-black text-white rounded">
        Login
      </button>

      <button onClick={onSignUp} className="w-full h-11 border rounded">
        Create account
      </button>

      <button onClick={onReset} className="w-full text-xs text-neutral-500">
        Forgot password?
      </button>
    </main>
  );
}