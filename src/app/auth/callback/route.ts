// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // 🚀 强制跳转逻辑：
      // 不管前端传没传 next，也不管是 Google 还是邮箱，
      // 只要验证成功，统一跳到 /account
      return NextResponse.redirect(`${origin}/account`);
    }
  }

  // 验证失败，跳回登录页
  return NextResponse.redirect(`${origin}/login?error=auth_code_error`);
}
