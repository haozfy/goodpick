import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe"; 
import { createClient } from "@/lib/supabase/server"; 

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    const userEmail = user.email;
    
    // ⚠️ 核心修改：使用你 Vercel 里实际配置的变量名
    const priceId = process.env.PRICE_ID_MONTHLY_PRO; 

    // 增加一个检查日志，方便你调试
    if (!priceId) {
      console.error("Error: Missing PRICE_ID_MONTHLY_PRO in environment variables.");
      return NextResponse.json({ error: "Server Error: Price ID not configured" }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/account?success=true`,
      cancel_url: `${siteUrl}/account?canceled=true`,
      customer_email: userEmail,
      metadata: { 
        userId: userId 
      }, 
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("Checkout Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
