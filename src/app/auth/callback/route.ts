// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  // 1. 解析 URL
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  
  // ✅ 关键修改：查看有没有 "next" 参数，如果有就去 next，没有才回首页 "/"
  // 之前的代码可能直接写了 const next = "/";
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // ✅ 登录成功，带你去你想去的地方
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 登录失败，回首页或错误页
  return NextResponse.redirect(`${origin}/login?error=auth_code_error`);
}
