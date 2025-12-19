import { NextResponse } from "next/server";

export const runtime = "nodejs";

function j(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

async function fileToBase64DataUrl(file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function GET() {
  return j({ error: "Method not allowed" }, 405);
}

export async function POST(req: Request) {
  try {
    const ct = req.headers.get("content-type") || "";

    // ✅ 1) 支持 JSON 测试请求（不会 500）
    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      return j({
        ok: true,
        mode: "json",
        echo: body,
        result: {
          product_name: "Test Food",
          score: 72,
          notes_free: ["Moderate sugar"],
          notes_pro: ["Could be better"],
          signals: { sugar: "medium" },
        },
      });
    }

    // ✅ 2) 支持图片上传（FormData）
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("image");
      if (!(file instanceof File)) return j({ error: "Missing image" }, 400);

      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

      // 没有 key 就返回 mock，确保本地先跑通
      if (!OPENAI_API_KEY) {
        return j({
          ok: true,
          mode: "mock",
          result: {
            product_name: "Sample Food",
            score: 70,
            notes_free: ["Moderate sugar"],
            notes_pro: ["Check sodium and additives"],
            signals: { sugar: "medium" },
          },
        });
      }

      const imageUrl = await fileToBase64DataUrl(file);

      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                'You are a food label analyzer. Return STRICT JSON with keys: product_name (string), score (0-100 int), notes_free (string[]), notes_pro (string[]), signals (object).',
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Analyze this label. Keep it short and actionable." },
                { type: "image_url", image_url: { url: imageUrl } },
              ],
            },
          ],
        }),
      });

      const text = await resp.text();
      if (!resp.ok) return j({ error: "OpenAI error", detail: text }, 500);

      const payload = JSON.parse(text);
      const content = payload?.choices?.[0]?.message?.content ?? "{}";
      const result = JSON.parse(content);

      return j({ ok: true, mode: "openai", result });
    }

    return j({ error: "Unsupported content-type", contentType: ct }, 415);
  } catch (e: any) {
    return j({ error: "Analyze failed", detail: String(e?.message || e) }, 500);
  }
}