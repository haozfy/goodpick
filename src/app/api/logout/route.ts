// src/app/api/logout/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  // 你当前不使用 cookie/session，所以这里就是一个“空登出”
  // 以后接 Supabase Auth / Clerk 再补
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
}