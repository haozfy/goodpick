// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // ✅ 关键点：获取 next 参数，如果没传则默认跳回首页 "/"
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // ✅ 登录成功，跳转到指定页面 (比如 /account)
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 如果出错，跳回登录页并带上错误信息
  return NextResponse.redirect(`${origin}/login?error=auth_code_error`);
}
