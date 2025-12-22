// src/app/api/analyze-food/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

// ❌ 删除这里的顶层初始化
// const openai = new OpenAI({ ... });

export async function POST(req: Request) {
  try {
    // ✅ 改为：在函数内部初始化
    // 这样在 Build 构建阶段不会因为缺少 Key 而报错
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a nutritional expert AI. Your job is to identify food from an image and judge its healthiness.
          Return ONLY a strict JSON object with no other text. The structure must be:
          {
            "name": "Short name of the food",
            "score": An integer between 0 (unhealthy) and 100 (very healthy),
            "reason": "A very short, one-sentence reason for the score."
          }`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this food image." },
            {
              type: "image_url",
              image_url: {
                url: image,
                detail: "low"
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
       throw new Error("No analysis result from AI");
    }

    const cleanedContent = content.replace(/```json|```/g, '').trim();
    const analysisResult = JSON.parse(cleanedContent);

    console.log("AI Analysis Success:", analysisResult.name);

    return NextResponse.json({ ok: true, data: analysisResult });

  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze image" },
      { status: 500 }
    );
  }
}
