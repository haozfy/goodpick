// src/app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Stripe webhook 必须用 raw text
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

  const svc = supabaseAdmin();

  // checkout 完成：升 Pro
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = (session.metadata?.user_id ?? null) as string | null;

    if (userId && session.customer && session.subscription) {
      await svc
        .from("user_entitlements")
        .update({
          plan: "pro",
          scans_limit: 999999999,
          stripe_customer_id: String(session.customer),
          stripe_subscription_id: String(session.subscription),
          stripe_subscription_status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }
  }

  // 订阅更新/取消：active/trialing => pro，否则 free
  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    const userId = (sub.metadata?.user_id ?? null) as string | null;
    const status = sub.status;

    if (userId) {
      const isPro = status === "active" || status === "trialing";

      await svc
        .from("user_entitlements")
        .update({
          plan: isPro ? "pro" : "free",
          scans_limit: isPro ? 999999999 : 3,
          stripe_subscription_id: sub.id,
          stripe_subscription_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }
  }

  return NextResponse.json({ received: true });
}