import { NextResponse } from "next/server";
import { supabaseBrowser } from "@/lib/supabase/client";

export async function GET(req: Request) {
  const url = new URL(req.url);

  // Supabase 会自动把 session 写进 localStorage（browser）
  // 这里我们只负责 redirect
  const next = url.searchParams.get("next") || "/";

  return NextResponse.redirect(
    new URL(next, url.origin)
  );
}