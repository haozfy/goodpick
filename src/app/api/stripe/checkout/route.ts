import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const priceId = body?.priceId as string | undefined;
    const userId = body?.userId as string | undefined; // 你自己系统的用户id
    const customerEmail = body?.customerEmail as string | undefined;

    if (!priceId) return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // ✅ 订阅模式（subscription）
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/billing/cancel`,
      customer_email: customerEmail, // 可选；如果你自己有 customerId 也可以传 customer
      metadata: { userId },          // ✅ webhook 里会拿到，写回 supabase
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Checkout error" }, { status: 500 });
  }
}