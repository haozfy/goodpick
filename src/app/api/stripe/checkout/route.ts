import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getSessionKey } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
  try {
    const sessionKey = getSessionKey();

    const { data: s } = await supabaseAdmin
      .from("gp_sessions")
      .select("id,stripe_customer_id")
      .eq("session_key", sessionKey)
      .single();

    if (!s) return NextResponse.json({ error: "No session" }, { status: 404 });

    let customerId = s.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create();
      customerId = customer.id;
      await supabaseAdmin.from("gp_sessions").update({ stripe_customer_id: customerId }).eq("id", s.id);
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pro?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pro?canceled=1`,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}