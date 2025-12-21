import { NextResponse } from "next/server";
import stripe from "@/lib/stripe"; // ✅ 修正：去掉花括号 { }
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 获取用户在数据库存的 stripe_customer_id (你需要确保你有存这个)
    const { data: entitlement } = await supabase
      .from("user_entitlements")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!entitlement?.stripe_customer_id) {
        return NextResponse.json({ error: "No customer ID found" }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: entitlement.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
