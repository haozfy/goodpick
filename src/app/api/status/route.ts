import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server"; // ✅ 1. 改这里
import { supabaseAdmin } from "@/lib/supabase/admin"; // ✅ 2. 改这里

export async function GET() {
  // ✅ 3. 改为异步创建客户端
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guest (未登录)
  if (!user) {
    return NextResponse.json({
      kind: "guest",
      left: 3,
    });
  }

  // ✅ 4. 使用封装好的 Admin 客户端 (无需再手动传 Key)
  const admin = supabaseAdmin();

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
