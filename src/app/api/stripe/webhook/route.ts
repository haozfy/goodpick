import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });

  let event: any;

  try {
    // ✅ App Router 要用 raw text
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ✅ 用户完成 checkout（订阅模式时这里能拿到 subscription / customer）
      case "checkout.session.completed": {
        const session = event.data.object as any;

        const userId = session?.metadata?.userId;
        const customerId = session?.customer as string | null;
        const subscriptionId = session?.subscription as string | null;

        if (userId && subscriptionId) {
          // 拉一次 subscription，拿到状态/周期
          const sub = await stripe.subscriptions.retrieve(subscriptionId);

          const priceId = sub.items.data?.[0]?.price?.id ?? null;
          const status = sub.status ?? null;
          const currentPeriodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null;

          await supabaseAdmin.from("subscriptions").upsert(
            {
              user_id: String(userId),
              customer_id: customerId,
              subscription_id: subscriptionId,
              price_id: priceId,
              status,
              current_period_end: currentPeriodEnd,
              cancel_at_period_end: !!sub.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "subscription_id" }
          );
        }
        break;
      }

      // ✅ 订阅状态更新（续费、取消、换套餐都会触发）
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as any;

        const subscriptionId = sub.id as string;
        const customerId = sub.customer as string;
        const status = sub.status as string;
        const priceId = sub.items?.data?.[0]?.price?.id ?? null;
        const currentPeriodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;

        await supabaseAdmin.from("subscriptions").update({
          customer_id: customerId,
          price_id: priceId,
          status,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: !!sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }).eq("subscription_id", subscriptionId);

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Webhook handler error" }, { status: 500 });
  }
}