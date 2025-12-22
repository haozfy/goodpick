import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe"; // ✅ 使用统一的 Stripe 实例
import { createClient } from "@/lib/supabase/server"; // ✅ 使用标准的 Supabase Server 客户端

export async function POST(req: Request) {
  try {
    // 1. 获取当前登录用户
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. 准备参数
    const userId = user.id;
    const userEmail = user.email;
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"; // 你的前端地址
    const priceId = process.env.STRIPE_PRICE_ID; // 你的 $9.99 价格 ID

    if (!priceId) {
      return NextResponse.json({ error: "Price ID not configured" }, { status: 500 });
    }

    // 3. 创建 Stripe Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/account?success=true`,
      cancel_url: `${siteUrl}/account?canceled=true`,
      customer_email: userEmail, // 自动填入用户邮箱
      metadata: { 
        userId: userId // 关键：把 Supabase 的 userId 传给 Stripe
      }, 
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("Checkout Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
