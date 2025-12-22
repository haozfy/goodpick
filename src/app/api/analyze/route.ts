import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ============================================================
    // 🚦 核心限流逻辑开始
    // ============================================================
    
    // 1. 获取用户的会员状态
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_pro")
      .eq("id", user.id)
      .single();

    const isPro = profile?.is_pro || false;
    const FREE_LIMIT = 3; // 设定免费次数为 3 次

    // 2. 如果不是会员，检查已使用次数
    if (!isPro) {
      // count: 'exact' 会只返回数量，不返回具体数据，速度极快
      const { count, error: countError } = await supabase
        .from("scans")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (countError) throw new Error("Failed to check quota");

      // 3. 如果超过限制，直接返回 403 禁止访问
      if (count !== null && count >= FREE_LIMIT) {
        return NextResponse.json(
          { error: "Free limit reached", code: "LIMIT_REACHED" }, 
          { status: 403 }
        );
      }
    }
    // ============================================================
    // 🚦 核心限流逻辑结束 (后面继续调用 OpenAI)
    // ============================================================

    // ... (后续的 OpenAI 调用代码保持不变)
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      // ... 保持原有代码 ...
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
           // ... 保持原有 Prompt ...
           {
            role: "system",
            content: `You are a strict nutritionist AI. Analyze the food product image. 
            Return ONLY a valid JSON object (no markdown, no backticks) with this structure:
            {
              "product_name": "Name of product",
              "score": 0-100 integer (100 is healthiest),
              "grade": "green" (healthy) or "black" (unhealthy),
              "analysis": "Short punchy reason why. Max 15 words.",
              "alternatives": [
                {"name": "Alt 1", "reason": "Why better", "price": "$"},
                {"name": "Alt 2", "reason": "Why better", "price": "$$"}
              ] 
            }
            If grade is green, alternatives should be an empty array.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this food label/product." },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        max_tokens: 500,
      }),
    });

    // ... (后面的解析 JSON 和 存入数据库代码保持不变) ...
    // 为防万一，把你之前的解析和存库代码贴在下面：
    
    const data = await response.json();
    let aiResult;
    try {
        if (!data.choices || !data.choices[0]?.message?.content) throw new Error("Invalid AI response");
        let content = data.choices[0].message.content;
        content = content.replace(/```json/g, "").replace(/```/g, "").trim();
        aiResult = JSON.parse(content);
    } catch (e) {
        return NextResponse.json({ error: "AI failed to analyze" }, { status: 500 });
    }

    const { data: scanData, error: dbError } = await supabase
      .from("scans")
      .insert({
        user_id: user.id,
        image_url: "", 
        product_name: aiResult.product_name,
        score: aiResult.score,
        grade: aiResult.grade?.toLowerCase() || "black",
        analysis: aiResult.analysis,
        alternatives: aiResult.alternatives
      })
      .select()
      .single();

    if (dbError) throw new Error(dbError.message);
    return NextResponse.json({ id: scanData.id });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}