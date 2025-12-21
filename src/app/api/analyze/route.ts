import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const LIMIT = 3;

export async function POST(req: Request) {
  // 1) 如果已登录：不走 guest 限制（或你也可以走登录用户限制）
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  if (!user) {
    // 2) 未登录：按设备 guest_id 限制 3 次
    const guestId = cookies().get("gp_guest")?.value;
    if (!guestId) {
      return NextResponse.json({ ok: false, error: "no_guest_cookie" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // upsert 保证有记录
    const { data: row, error: upsertErr } = await admin
      .from("gp_guest_quota")
      .upsert({ guest_id: guestId }, { onConflict: "guest_id" })
      .select("used")
      .single();

    if (upsertErr) {
      return NextResponse.json({ ok: false, error: upsertErr.message }, { status: 500 });
    }

    if ((row?.used ?? 0) >= LIMIT) {
      return NextResponse.json(
        { ok: false, error: "guest_limit_reached", limit: LIMIT },
        { status: 402 }
      );
    }

    // 扣 1 次（原子更新）
    const { error: incErr } = await admin
      .from("gp_guest_quota")
      .update({ used: (row?.used ?? 0) + 1 })
      .eq("guest_id", guestId);

    if (incErr) {
      return NextResponse.json({ ok: false, error: incErr.message }, { status: 500 });
    }
  }

  // 3) 你的原本扫描逻辑继续
  const body = await req.json();
  // ... do scan ...
  return NextResponse.json({ ok: true /*, result... */ });
}