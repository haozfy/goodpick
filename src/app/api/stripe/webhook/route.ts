import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

export const runtime = "nodejs";

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function setProByUserId(userId: string, customerId?: string | null, subId?: string | null) {
  const admin = supabaseAdmin();
  const { error } = await admin
    .from("profiles")
    .update({
      is_pro: true,
      plan: "pro",
      stripe_customer_id: customerId ?? null,
      stripe_subscription_id: subId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

async function setFreeByCustomerId(customerId: string) {
  const admin = supabaseAdmin();
  const { error } = await admin
    .from("profiles")
    .update({
      is_pro: false,
      plan: "free",
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customerId);
  if (error) throw new Error(error.message);
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ ok: false, error: "missing_signature" }, { status: 400 });

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId =
        (session.metadata?.user_id as string | undefined) ||
        (session.client_reference_id as string | undefined);

      if (userId) {
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;

        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        await setProByUserId(userId, customerId ?? null, subId ?? null);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      await setFreeByCustomerId(customerId);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "webhook_error" }, { status: 500 });
  }
}