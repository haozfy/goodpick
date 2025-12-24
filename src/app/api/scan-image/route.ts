// src/app/api/scan-image/route.ts
import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

type ScanRow = {
  id: string;
  product_name: string | null;
  score: number | null;
  verdict: string | null;
  grade: string | null;
  analysis: string | null;
};

// ✅ Edge 环境安全读取 env，并且把 header 里不允许的字符清掉（\r \n 空格等）
function env(name: string): string {
  const p: any = (globalThis as any).process;
  const raw = p?.env?.[name];

  if (!raw) throw new Error(`Missing env: ${name}`);

  // 关键：避免 Invalid header value
  return String(raw).replace(/[\r\n\s]+/g, "");
}

// ✅ 不用 JSX：避免 route.ts 里出现 JSX 导致一堆 TS/构建错误
function h(tag: any, props: any, ...children: any[]) {
  return { type: tag, props: { ...props, children } };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return new Response("Missing id", { status: 400 });

    const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL");
    const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");

    // ✅ 用 REST(PostgREST) 拉 scans 一行（最稳）
    const url =
      `${SUPABASE_URL}/rest/v1/scans` +
      `?id=eq.${encodeURIComponent(id)}` +
      `&select=id,product_name,score,verdict,grade,analysis` +
      `&limit=1`;

    const r = await fetch(url, {
      headers: {
        apikey: SERVICE_KEY,
        authorization: `Bearer ${SERVICE_KEY}`,
        "content-type": "application/json",
      },
      cache: "no-store",
    });

    if (!r.ok) return new Response("Not found", { status: 404 });

    const rows = (await r.json()) as ScanRow[];
    const data = rows?.[0];
    if (!data) return new Response("Not found", { status: 404 });

    const grade = String(data.grade || "").toLowerCase();
    const score = Number(data.score ?? 0);
    const productName = data.product_name || "Unknown Product";
    const analysis = data.analysis || "";

    const isBlack = grade === "black";
    const isYellow = grade === "yellow";

    const bg = isBlack ? "#0a0a0a" : isYellow ? "#FFFBEB" : "#ECFDF5";
    const cardBg = isBlack ? "#171717" : "#ffffff";
    const text = isBlack ? "#ffffff" : "#111827";
    const subText = isBlack
      ? "#a3a3a3"
      : isYellow
      ? "rgba(120,53,15,0.7)"
      : "rgba(6,95,70,0.7)";
    const ring = isBlack ? "#ef4444" : isYellow ? "#f59e0b" : "#10b981";
    const badgeBg = isBlack
      ? "rgba(239,68,68,0.18)"
      : isYellow
      ? "#FEF3C7"
      : "#D1FAE5";
    const badgeText = isBlack ? "#fecaca" : isYellow ? "#92400e" : "#065f46";
    const badgeLabel = isBlack
      ? "BLACK CARD • AVOID"
      : isYellow
      ? "YELLOW CARD • CAUTION"
      : "GREEN CARD • GOOD";

    const tree = h(
      "div",
      {
        style: {
          width: 1200,
          height: 630,
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 60,
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        },
      },
      h(
        "div",
        {
          style: {
            width: 720,
            background: cardBg,
            borderRadius: 48,
            padding: 56,
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            gap: 28,
            alignItems: "center",
          },
        },
        // Score ring
        h(
          "div",
          {
            style: {
              width: 210,
              height: 210,
              borderRadius: 999,
              border: "14px solid rgba(0,0,0,0.06)",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
          },
          h("div", {
            style: {
              position: "absolute",
              inset: 0,
              borderRadius: 999,
              border: `14px solid ${ring}`,
            },
          }),
          h(
            "div",
            { style: { fontSize: 88, fontWeight: 900, color: text } },
            Number.isFinite(score) ? String(score) : "0"
          )
        ),

        // Product
        h(
          "div",
          {
            style: {
              fontSize: 44,
              fontWeight: 900,
              color: text,
              textAlign: "center",
              lineHeight: 1.1,
              maxWidth: 640,
            },
          },
          productName
        ),

        // Badge
        h(
          "div",
          {
            style: {
              padding: "10px 18px",
              borderRadius: 999,
              background: badgeBg,
              color: badgeText,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 2,
            },
          },
          badgeLabel
        ),

        // Analysis
        h(
          "div",
          {
            style: {
              fontSize: 24,
              color: subText,
              textAlign: "center",
              lineHeight: 1.45,
              maxWidth: 620,
              whiteSpace: "pre-wrap",
            },
          },
          analysis
        ),

        // Footer
        h(
          "div",
          {
            style: {
              marginTop: 10,
              fontSize: 16,
              color: isBlack ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)",
              letterSpacing: 3,
            },
          },
          "GOODPICK.APP"
        )
      )
    );

    return new ImageResponse(tree as any, { width: 1200, height: 630 });
  } catch (e: any) {
    return new Response(e?.message || "Error", { status: 500 });
  }
}