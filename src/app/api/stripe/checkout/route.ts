// src/app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const { priceId, userId } = body as { priceId?: string; userId?: string };

  if (!priceId || !userId) {
    return NextResponse.json({ error: "Missing priceId or userId" }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/billing?success=1`,
    cancel_url: `${siteUrl}/billing?canceled=1`,
    metadata: { userId },
  });

  return NextResponse.json({ url: session.url });
}