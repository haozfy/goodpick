import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function supabaseWithAuth(token: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function fileToDataUrl(file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function POST(req: Request) {
  // 1) 从 Header 拿 token（不靠 cookie）
  const authz = req.headers.get("authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";

  if (!token) {
    return NextResponse.json({ ok: false, error: "missing_token" }, { status: 401 });
  }

  const supabase = supabaseWithAuth(token);

  // 2) 验证用户
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // 3) 取图
  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "missing_image" }, { status: 400 });
  }
  const imageUrl = await fileToDataUrl(file);

  // 4) 调 OpenAI
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
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
            'Return STRICT JSON: { "product_name": string, "score": int 0-100, "headline": string, "notes_free": string[], "notes_pro": string[], "signals": object }',
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze label. Be short, actionable." },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    return NextResponse.json({ ok: false, error: "openai_error", detail: t }, { status: 500 });
  }

  const payload = await r.json();
  const content = payload?.choices?.[0]?.message?.content ?? "{}";

  let out: any = {};
  try {
    out = JSON.parse(content);
  } catch {
    out = {};
  }

  const score = Number(out.score ?? 70);
  const verdict = score >= 80 ? "GOOD" : score >= 60 ? "CAUTION" : "SKIP";

  // 5) 写入 DB（用 token 身份，RLS 才会按当前用户走）
  const { data: row, error } = await supabase
    .from("gp_scan_history")
    .insert({
      user_id: userRes.user.id,
      product_name: out.product_name ?? "Food",
      score,
      verdict,
      headline: out.headline ?? "",
      notes_free: out.notes_free ?? [],
      notes_pro: out.notes_pro ?? [],
      signals: out.signals ?? {},
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: row.id });
}