import Stripe from "stripe";
import { NextResponse } from "next/server";
import { mustEnv } from "@/lib/env";

export const runtime = "nodejs";

const stripe = new Stripe(mustEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2025-02-24.acacia" as any,
});

export async function POST(req: Request) {
  try {
    const { plan } = (await req.json()) as { plan: "monthly" | "yearly" };
    const priceId =
      plan === "yearly" ? mustEnv("PRICE_ID_YEARLY_PRO") : mustEnv("PRICE_ID_MONTHLY_PRO");

    const origin = req.headers.get("origin") ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/result?paid=1`,
      cancel_url: `${origin}/result?paid=0`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown" }, { status: 400 });
  }
}