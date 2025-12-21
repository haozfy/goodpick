import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/account";

  if (!code) {
    return NextResponse.redirect(new URL(`/login?e=missing_code`, url.origin));
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(`/login?e=${encodeURIComponent(error.message)}`, url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}