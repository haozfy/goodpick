"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = supabaseBrowser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/history`,
      },
    });
  };

  const loginWithPassword = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert(error.message);
    else window.location.href = "/history";
  };

  const createAccount = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) alert(error.message);
    else alert("Account created. You can now log in.");
  };

  const forgotPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) alert(error.message);
    else alert("Check your email for reset link.");
  };

  return (
    <main className="mx-auto max-w-md px-6 py-16 space-y-4">
      <h1 className="text-2xl font-semibold">Login</h1>

      <button onClick={loginWithGoogle} className="w-full border p-3 rounded">
        Continue with Google
      </button>

      <input
        className="w-full border p-3 rounded"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="w-full border p-3 rounded"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={loginWithPassword} className="w-full bg-black text-white p-3 rounded">
        Login
      </button>

      <button onClick={createAccount} className="w-full border p-3 rounded">
        Create account
      </button>

      <button onClick={forgotPassword} className="text-sm underline">
        Forgot password?
      </button>
    </main>
  );
}