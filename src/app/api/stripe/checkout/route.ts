import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const priceId = process.env.STRIPE_PRICE_ID_PRO!;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/billing/success`,
    cancel_url: `${siteUrl}/billing/cancel`,
  });

  return NextResponse.json({ url: session.url });
}