import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // 或者 @supabase/ssr，取决于你的版本
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    // 1. 安全检查：不要信任前端传来的 userId，要从 Session 获取
    // 如果你还没有配置好服务端的 auth helper，可以暂时用你原来的 req.json() 方式，但有安全风险
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    const body = await req.json(); // 如果你需要前端传 priceId 可以留着，不需要可以删掉
    
    // 环境变量检查
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const priceId = process.env.STRIPE_PRICE_PRO; 
    
    if (!priceId) {
      console.error("Missing STRIPE_PRICE_PRO");
      return NextResponse.json({ error: "Server config error" }, { status: 500 });
    }

    // 2. 创建 Stripe Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription", // 订阅模式
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      
      success_url: `${siteUrl}/billing?success=1`,
      cancel_url: `${siteUrl}/billing?canceled=1`,

      // 🔥 关键：把 userId 塞进 metadata，这样 Webhook 才能知道是谁付的钱
      metadata: { 
        user_id: userId 
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("Checkout Error:", e);
    return NextResponse.json({ error: e?.message || "Checkout error" }, { status: 500 });
  }
}
