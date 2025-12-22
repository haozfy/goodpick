// src/app/api/search-food/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { query } = await req.json();

    if (!query) return NextResponse.json({ error: "No query provided" }, { status: 400 });

    // 调用 GPT-4o-mini 进行“云搜索”
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a nutritional expert AI.
          The user will search for a food product by name.
          Analyze this food based on your general knowledge.
          Return a JSON object:
          {
            "name": "Standardized Food Name (English)",
            "score": Integer 0-100 (0=unhealthy, 100=healthy),
            "reason": "Short one-sentence reason (English)."
          }`
        },
        {
          role: "user",
          content: `Analyze the food product: "${query}"`
        },
      ],
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("AI returned nothing");

    const result = JSON.parse(content);
    return NextResponse.json({ ok: true, data: result });

  } catch (error: any) {
    console.error("Search Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
