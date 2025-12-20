import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20" as any,
});

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const upsertSub = async (userId: string, patch: any) => {
    await admin.from("gp_user_subscriptions").upsert(
      { user_id: userId, ...patch, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  };

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    const userId = (s.metadata?.user_id || s.client_reference_id) as
      | string
      | undefined;

    if (userId) {
      await upsertSub(userId, {
        is_pro: true,
        stripe_customer_id: typeof s.customer === "string" ? s.customer : null,
        stripe_subscription_id:
          typeof s.subscription === "string" ? s.subscription : null,
      });
    }
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.user_id;

    if (userId) {
      const active = sub.status === "active" || sub.status === "trialing";

      // ✅ 兼容拿 period end：优先 item-level，其次 root-level，最后 null
      const periodEndUnix =
        (sub.items?.data?.[0] as any)?.current_period_end ??
        (sub as any).current_period_end ??
        null;

      await upsertSub(userId, {
        is_pro: active,
        stripe_subscription_id: sub.id,
        stripe_price_id: sub.items?.data?.[0]?.price?.id ?? null,
        current_period_end: periodEndUnix
          ? new Date(periodEndUnix * 1000).toISOString()
          : null,
      });
    }
  }

  return NextResponse.json({ ok: true });
}