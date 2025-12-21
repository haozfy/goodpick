import { NextResponse } from "next/server";
import Stripe from "stripe";
import stripe from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs"; 
// 注意：如果你部署在 Vercel Edge Runtime，这里需要改，但连接数据库通常建议用 nodejs

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  const body = await req.text(); // Next.js App Router 必须用 text() 读取 raw body
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

  // 验证通过，开始处理业务
  const admin = supabaseAdmin();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;

    // 打印日志方便调试
    console.log(`Payment success for user: ${userId}`);

    if (userId) {
      // 更新 Supabase
      const { error } = await admin
        .from("user_entitlements")
        .upsert({ // 建议用 upsert 防止 update 找不到记录
          user_id: userId,
          plan: "pro",
          scans_limit: 999999999,
          stripe_subscription_id: session.subscription as string,
          updated_at: new Date().toISOString(),
        });
      
      if (error) {
        console.error("Supabase update error:", error);
        return NextResponse.json({ error: "Database update failed" }, { status: 500 });
      }
    }
  }

  // 重要：必须返回 200 OK，否则 Stripe 会认为失败并重试
  return NextResponse.json({ received: true });
}
