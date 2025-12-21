// src/lib/stripe.ts
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

// ✅ 不要手写 2025-12-20，直接用 Stripe SDK 自带的默认版本
export const stripe = new Stripe(secretKey);