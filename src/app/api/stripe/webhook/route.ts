import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function nowIso() {
  return new Date().toISOString();
}

function asStringId(x: unknown): string | null {
  // Stripe 里很多字段是 string | object | null
  if (!x) return null;
  if (typeof x === "string") return x;
  if (typeof x === "object" && x !== null) {
    // @ts-expect-error - Stripe 对象通常会有 id
    const id = (x as any).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

function getMetadataUserId(meta: Stripe.Metadata | null | undefined): string | null {
  if (!meta) return null;
  const v = meta["user_id"];
  return typeof v === "string" && v.length > 0 ? v : null;
}

async function upsertEntitlement(svc: ReturnType<typeof supabaseAdmin>, payload: {
  user_id: string;
  plan: "free" | "pro";
  scans_limit: number;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
}) {
  await svc
    .from("user_entitlements")
    .upsert(
      {
        user_id: payload.user_id,
        plan: payload.plan,
        scans_limit: payload.scans_limit,
        stripe_customer_id: payload.stripe_customer_id ?? null,
        stripe_subscription_id: payload.stripe_subscription_id ?? null,
        stripe_subscription_status: payload.stripe_subscription_status ?? null,
        updated_at: nowIso(),
      },
      { onConflict: "user_id" }
    );
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ ok: false, reason: "no_signature" }, { status: 400 });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false, reason: "missing_webhook_secret" }, { status: 500 });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_signature" }, { status: 400 });
  }

  const svc = supabaseAdmin();

  // 1) checkout 完成：尽量从 session / subscription metadata 拿 user_id
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    let userId = getMetadataUserId(session.metadata);

    // 如果 session 没写到 metadata（偶发），就去 subscription 里拿（更可靠）
    const subId = asStringId(session.subscription);
    if (!userId && subId) {
      const sub = await stripe.subscriptions.retrieve(subId);
      userId = getMetadataUserId(sub.metadata);
    }

    if (userId) {
      await upsertEntitlement(svc, {
        user_id: userId,
        plan: "pro",
        scans_limit: 999999999,
        stripe_customer_id: asStringId(session.customer),
        stripe_subscription_id: subId,
        stripe_subscription_status: "active",
      });
    }
  }

  // 2) 订阅更新/删除：根据 status 回写 free/pro
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = getMetadataUserId(sub.metadata);

    if (userId) {
      const status = sub.status;
      const isPro = status === "active" || status === "trialing";

      await upsertEntitlement(svc, {
        user_id: userId,
        plan: isPro ? "pro" : "free",
        scans_limit: isPro ? 999999999 : 3,
        stripe_subscription_id: sub.id,
        stripe_subscription_status: status,
      });
    }
  }

  // 3) 付费成功兜底（强烈建议开启这个事件）
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;

    const subId = asStringId(invoice.subscription);
    if (subId) {
      const sub = await stripe.subscriptions.retrieve(subId);
      const userId = getMetadataUserId(sub.metadata);

      if (userId) {
        await upsertEntitlement(svc, {
          user_id: userId,
          plan: "pro",
          scans_limit: 999999999,
          stripe_subscription_id: sub.id,
          stripe_subscription_status: sub.status,
          stripe_customer_id: asStringId(invoice.customer),
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}