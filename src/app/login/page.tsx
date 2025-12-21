"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingSignup, setLoadingSignup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  }

  async function handleLogin() {
    setLoadingLogin(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoadingLogin(false);
      return;
    }

    router.push("/scan");
  }

  async function handleSignup() {
    setLoadingSignup(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoadingSignup(false);
      return;
    }

    router.push("/scan");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow">
        <h1 className="text-xl font-semibold mb-4">Login</h1>

        <button
          onClick={handleGoogle}
          className="w-full border rounded px-4 py-2 mb-4 hover:bg-neutral-50"
        >
          Continue with Google
        </button>

        <div className="text-center text-sm text-neutral-400 mb-4">or</div>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-2"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-4"
        />

        {error && (
          <div className="text-sm text-red-600 mb-3">{error}</div>
        )}

        <button
          onClick={handleLogin}
          disabled={loadingLogin}
          className="w-full bg-black text-white rounded px-4 py-2 mb-2 disabled:opacity-50"
        >
          {loadingLogin ? "Logging in..." : "Login"}
        </button>

        <button
          onClick={handleSignup}
          disabled={loadingSignup}
          className="w-full border rounded px-4 py-2 mb-3 disabled:opacity-50"
        >
          {loadingSignup ? "Creating account..." : "Create account"}
        </button>

        <div className="mt-4 text-center">
          <a
            href="/"
            className="text-sm text-neutral-500 underline"
          >
            Continue as guest (limited)
          </a>
        </div>
      </div>
    </div>
  );
}