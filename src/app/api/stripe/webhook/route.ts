import { headers } from "next/headers";
import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = headers().get("stripe-signature")!;

  const event = stripe.webhooks.constructEvent(
    body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  // 处理事件
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log("Payment success:", session.id);
  }

  return NextResponse.json({ received: true });
}