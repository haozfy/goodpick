// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";

  // 没有 code 就直接回首页
  if (!code) {
    return NextResponse.redirect(new URL(next, url.origin));
  }

  // 需要你在环境变量里有这两个（服务端可用的）
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnon);

  // supabase-js v2 支持 exchangeCodeForSession
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=oauth`, url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}