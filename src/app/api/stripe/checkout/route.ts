import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getSessionKey } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20" as any,
});

type Plan = "monthly" | "yearly";

export async function POST(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { ok: false, error: "Missing STRIPE_SECRET_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const plan = (body?.plan as Plan) || "monthly";

    const priceId =
      plan === "yearly"
        ? process.env.PRICE_ID_YEARLY_PRO
        : process.env.PRICE_ID_MONTHLY_PRO;

    if (!priceId) {
      return NextResponse.json(
        { ok: false, error: "Missing PRICE_ID_* env" },
        { status: 500 }
      );
    }

    const origin = new URL(req.url).origin;

    const sessionKey = await getSessionKey();

    const supabase = supabaseAdmin();

    // 可选：确保 gp_sessions 里有这条 session（用于后面 pro 校验/绑定）
    await supabase
      .from("gp_sessions")
      .upsert({ session_key: sessionKey }, { onConflict: "session_key" });

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/pro?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pro?canceled=1`,
      client_reference_id: sessionKey,
      metadata: { session_key: sessionKey, plan },
      subscription_data: {
        metadata: { session_key: sessionKey, plan },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ ok: true, url: checkout.url });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: e?.message || "checkout_error" },
      { status: 500 }
    );
  }
}