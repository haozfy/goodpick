import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

type Body = { plan?: "month" | "year" };

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    const userEmail = user.email;

    const body = (await req.json().catch(() => ({}))) as Body;
    const plan: "month" | "year" = body.plan === "year" ? "year" : "month";

    // ✅ 两个价格 ID（订阅 price）
    const priceId =
      plan === "year"
        ? process.env.PRICE_ID_YEARLY_PRO
        : process.env.PRICE_ID_MONTHLY_PRO;

    if (!priceId) {
      console.error(`Missing price id for plan=${plan}`);
      return NextResponse.json(
        { error: "Server Error: Price ID not configured" },
        { status: 500 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      // ⭐⭐⭐ 关键：允许用户在 Stripe Checkout 输入折扣码
      allow_promotion_codes: true,

      success_url: `${siteUrl}/account?success=true`,
      cancel_url: `${siteUrl}/account?canceled=true`,

      customer_email: userEmail,

      metadata: {
        userId,
        plan,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("Checkout Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}