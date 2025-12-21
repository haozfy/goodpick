import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server"; // ✅ 引用新建的文件

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 假设你的 user_entitlements 表里存了 stripe_customer_id
    const { data: entitlement } = await supabase
      .from("user_entitlements")
      .select("stripe_subscription_id") // 通常是用 customer id，这里假设你存了
      .eq("user_id", user.id)
      .single();
    
    // 如果你没有存 customer_id，Stripe Portal 可能开不起来
    // 这里简单处理：如果没有 customer ID，可以报错或者去 Stripe 现查
    // 简单起见，这里假设你有了。
    
    // ... Portal 逻辑 ...
    
    return NextResponse.json({ error: "Portal not fully implemented yet" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
