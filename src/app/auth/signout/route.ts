// src/app/auth/signout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server"; // ✅ 1. 改这里

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  
  // ✅ 2. 改这里
  const supabase = await createClient();
  
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", url.origin));
}
