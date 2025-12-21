import { NextResponse } from "next/server";
import Stripe from "stripe";
import stripe from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // 1. 获取签名
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    console.error("Webhook Error: Missing stripe-signature");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // 2. 获取原始请求体 (必须是 text，不能是 json)
  const body = await req.text();

  let event: Stripe.Event;

  // 3. 验证签名 (防止伪造请求)
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook Signature Error: ${err.message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  // 4. 处理 "支付成功" 事件
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // 从 metadata 获取 userId (这是你在 checkout 接口里塞进去的)
    const userId = session.metadata?.user_id;

    if (userId) {
      console.log(`✅ Payment successful for User: ${userId}`);

      // 5. 更新数据库 (推荐使用 upsert 而不是 update)
      const { error } = await admin
        .from("user_entitlements")
        .upsert({ 
          user_id: userId, // 唯一键
          plan: "pro",
          scans_limit: 999999999,
          stripe_subscription_id: session.subscription as string, // 记录订阅ID方便以后取消
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' }); // 确保按 user_id 冲突处理

      if (error) {
        console.error("Supabase Write Error:", error);
        // 这里返回 500，Stripe 会在稍后重试这个 Webhook，防止漏单
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
    } else {
      console.warn("⚠️ Webhook received but no user_id in metadata");
    }
  }

  // 6. 必须返回 200，告诉 Stripe "我收到了"
  return NextResponse.json({ received: true });
}
