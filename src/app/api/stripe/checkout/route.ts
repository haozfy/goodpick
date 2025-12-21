import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const priceId = process.env.STRIPE_PRICE_ID_PRO!;

  const admin = supabaseAdmin();

  // 取/建 stripe customer
  const { data: ent } = await admin
    .from("user_entitlements")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  let customerId = ent?.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });

    customerId = customer.id;

    await admin
      .from("user_entitlements")
      .upsert(
        { user_id: user.id, stripe_customer_id: customerId, plan: "free", scans_used: 0, scans_limit: 3 },
        { onConflict: "user_id" }
      );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/?paid=1`,
    cancel_url: `${siteUrl}/pro?canceled=1`,
    allow_promotion_codes: true,
    subscription_data: { metadata: { user_id: user.id } },
    metadata: { user_id: user.id },
  });

  return NextResponse.json({ ok: true, url: session.url });
}