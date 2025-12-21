// src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const supabase = await supabaseServer();
  await supabase.auth.exchangeCodeForSession(code);

  return NextResponse.redirect(new URL("/", url.origin));
}