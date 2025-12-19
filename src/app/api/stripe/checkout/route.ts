import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getSessionKey } from "@/lib/session";

export const runtime = "nodejs";

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

export async function POST(req: Request) {
  const stripe = new Stripe(mustEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2024-06-20",
  });

  const appUrl = mustEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");
  const priceId = mustEnv("STRIPE_PRICE_ID");

  const sessionKey = await getSessionKey();

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/pro?success=1`,
    cancel_url: `${appUrl}/pro?canceled=1`,
    client_reference_id: sessionKey,
    metadata: { gp_session: sessionKey },
    subscription_data: { metadata: { gp_session: sessionKey } },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkoutSession.url });
}