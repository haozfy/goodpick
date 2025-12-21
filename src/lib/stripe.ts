// src/lib/stripe.ts
import Stripe from 'stripe';

// 1. 安全检查：防止运行时因为没环境变量而莫名其妙报错
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is missing. Please set it in your .env.local file.');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // 2. 移除 apiVersion: 
  // 留空会让 SDK 使用它自己支持的默认版本，或者你 Stripe 后台锁定的版本。
  // 这样最不容易报错。
  
  // 3. 移除 typescript: true (新版不需要)

  // 4. (可选) 添加 appInfo 方便在 Stripe 后台追踪请求来源
  appInfo: {
    name: 'GoodPick Application',
    version: '0.1.0',
  },
});

export default stripe;

