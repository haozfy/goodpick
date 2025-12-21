// src/app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs"; // Stripe webhooks 需要 node runtime

function getCustomerId(customer: Stripe.Event.Data.Object["customer"]): string | null {
  if (typeof customer === "string") return customer;
  if (customer && typeof customer === "object" && "id" in customer && typeof customer.id === "string") {
    return customer.id;
  }
  return null;
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing stripe-signature or STRIPE_WEBHOOK_SECRET" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err?.message ?? "unknown"}` }, { status: 400 });
  }

  try {
    // ✅ 你按需要处理你关心的事件
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const customerId = getCustomerId(session.customer);
      const email = session.customer_details?.email ?? null;
      const userId = (session.metadata?.userId as string | undefined) ?? null;

      // 示例：把 stripe customer id 写回 supabase（按你自己的表结构改）
      if (userId && customerId) {
        await supabaseAdmin
          .from("profiles")
          .update({ stripe_customer_id: customerId, stripe_email: email })
          .eq("id", userId);
      }
    }

    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = getCustomerId(sub.customer);

      // 示例：同步订阅状态（按你自己的表结构改）
      if (customerId) {
        await supabaseAdmin
          .from("subscriptions")
          .upsert({
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Webhook handler error" }, { status: 500 });
  }
}