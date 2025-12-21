import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  // 登录成功后统一去 scan（别用 /account，避免 404）
  const next = url.searchParams.get("next") || "/scan";

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?e=missing_code", url.origin)
    );
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/login?e=oauth_failed", url.origin)
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}