import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20" as any,
});

export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { plan } = await req.json().catch(() => ({ plan: "monthly" }));
  const priceId = plan === "yearly" ? process.env.PRICE_ID_YEARLY_PRO : process.env.PRICE_ID_MONTHLY_PRO;
  if (!priceId) return NextResponse.json({ error: "missing_price_id" }, { status: 500 });

  const site = (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, "");

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${site}/result?paid=1`,
    cancel_url: `${site}/pro?canceled=1`,
    client_reference_id: auth.user.id,
    metadata: { user_id: auth.user.id, plan },
    subscription_data: { metadata: { user_id: auth.user.id, plan } },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}