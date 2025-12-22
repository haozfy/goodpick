import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin"; // ✅ 使用 Admin 权限操作数据库
import Stripe from "stripe";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  const body = await req.text(); // 必须读取 raw body
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: "Webhook Error" }, { status: 400 });
  }

  // --- 处理业务逻辑 ---
  
  // 1. 支付/订阅成功
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    // 获取 Stripe 客户 ID (可能在 customer 对象里，也可能是字符串)
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

    console.log(`💰 Payment success for user: ${userId}`);

    if (userId && customerId) {
      // 使用 upsert 更新 profiles 表
      // 保持 is_pro = true
      const { error } = await supabaseAdmin
        .from("profiles")
        .upsert({ 
          id: userId, // 依据 ID 更新
          is_pro: true,
          plan: "pro",
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        });
      
      if (error) {
        console.error("Supabase update error:", error);
        return NextResponse.json({ error: "Database update failed" }, { status: 500 });
      }
    }
  }

  // 2. 订阅删除/过期 (退订生效)
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    if (customerId) {
      console.log(`🚫 Subscription deleted for customer: ${customerId}`);
      
      // 把 is_pro 改回 false
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ is_pro: false, plan: "free" })
        .eq("stripe_customer_id", customerId);

      if (error) console.error("Supabase update error:", error);
    }
  }

  return NextResponse.json({ received: true });
}
