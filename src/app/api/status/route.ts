import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guest
  if (!user) {
    return NextResponse.json({
      kind: "guest",
      left: 3,
    });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await admin
    .from("profiles")
    .select("is_pro")
    .eq("id", user.id)
    .single();

  if (profile?.is_pro) {
    return NextResponse.json({ kind: "pro" });
  }

  return NextResponse.json({
    kind: "free",
    left: 3,
  });
}