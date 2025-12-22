// src/app/api/analyze-food/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

// 初始化 OpenAI 客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    // 1. 接收前端传来的图片数据 (Base64 格式)
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // 2. 调用 GPT-4o-mini
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
                // 告诉 OpenAI 这是一个 Base64 图像
                url: image,
                detail: "low" // "low" 更便宜更快，对于简单识别足够了
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    // 3. 处理 OpenAI 的返回结果
    const content = response.choices[0]?.message?.content;
    
    if (!content) {
       throw new Error("No analysis result from AI");
    }

    // 解析 JSON 结果
    // 注意：有时候 AI 可能会返回 Markdown 代码块格式 (```json ... ```)，需要去除
    const cleanedContent = content.replace(/```json|```/g, '').trim();
    const analysisResult = JSON.parse(cleanedContent);

    console.log("AI Analysis Success:", analysisResult.name);

    // 4. 将结果返回给前端
    return NextResponse.json({ ok: true, data: analysisResult });

  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze image" },
      { status: 500 }
    );
  }
}
