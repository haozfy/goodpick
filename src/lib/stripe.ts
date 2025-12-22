// src/lib/stripe.ts
import Stripe from "stripe";

// 必须使用 export const 导出
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // ✅ 修复：使用 SDK v20.1.0 要求的最新版本号
  apiVersion: "2025-12-15.clover" as any, 
  typescript: true,
});
