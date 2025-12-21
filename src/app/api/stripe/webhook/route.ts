import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ ok: false }, { status: 400 });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const admin = supabaseAdmin();

  // 订阅生效 => pro
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = (session.metadata?.user_id ?? null) as string | null;

    if (userId && session.customer && session.subscription) {
      await admin
        .from("user_entitlements")
        .upsert(
          {
            user_id: userId,
            plan: "pro",
            scans_limit: 999999999,
            stripe_customer_id: String(session.customer),
            stripe_subscription_id: String(session.subscription),
            stripe_subscription_status: "active",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
    }
  }

  // 订阅状态变化（取消/欠费）=> 回 free
  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    const userId = (sub.metadata?.user_id ?? null) as string | null;
    const status = sub.status;

    if (userId) {
      const isPro = status === "active" || status === "trialing";

      await admin
        .from("user_entitlements")
        .upsert(
          {
            user_id: userId,
            plan: isPro ? "pro" : "free",
            scans_limit: isPro ? 999999999 : 3,
            stripe_subscription_id: sub.id,
            stripe_subscription_status: status,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
    }
  }

  return NextResponse.json({ received: true });
}