import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    // 1. 验证用户登录
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. 调用 OpenAI GPT-4o 分析图片
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
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
              ] (Only provide alternatives if grade is black, otherwise empty array)
            }`
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

    const data = await response.json();
    
    // 解析 AI 返回的 JSON 字符串
    let aiResult;
    try {
      const content = data.choices[0].message.content;
      // 清理可能存在的 markdown 符号
      const cleanJson = content.replace(/```json/g, "").replace(/```/g, "").trim();
      aiResult = JSON.parse(cleanJson);
    } catch (e) {
      console.error("AI Parse Error:", data);
      return NextResponse.json({ error: "AI failed to analyze" }, { status: 500 });
    }

    // 3. 将结果存入 Supabase 数据库
    const { data: scanData, error: dbError } = await supabase
      .from("scans")
      .insert({
        user_id: user.id,
        image_url: "base64-image", // 暂时不存大图，省流量，或者后续存 Storage
        product_name: aiResult.product_name,
        score: aiResult.score,
        grade: aiResult.grade,
        analysis: aiResult.analysis,
        alternatives: aiResult.alternatives
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 4. 返回新建的 Scan ID 给前端
    return NextResponse.json({ id: scanData.id });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}