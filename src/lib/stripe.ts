// src/lib/stripe.ts
import Stripe from 'stripe';

// 确保这里用的是 process.env.STRIPE_SECRET_KEY
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia', // 或者你可以删掉这行使用默认版本
  typescript: true,
});

export default stripe;
