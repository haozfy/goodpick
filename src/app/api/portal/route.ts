import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. 从 profiles 表查找 customer_id
    // 我们之前的逻辑是用 'profiles' 表，保持一致，不要换表名否则前端会崩
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "No billing history found" }, { status: 404 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // 2. 创建 Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl}/account`,
    });
    
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Portal Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
