import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { email } = await req.json();
  await supabaseAdmin.from("gp_users").upsert({ email });
  return NextResponse.json({ ok: true });
}