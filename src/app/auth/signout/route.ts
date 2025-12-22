// src/app/auth/signout/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  
  // 检查是否登录
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    await supabase.auth.signOut();
  }

  // 重定向回登录页
  return NextResponse.redirect(new URL("/login", req.url), {
    status: 302,
  });
}
