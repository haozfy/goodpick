// src/app/api/og/scan/route.ts
import { ImageResponse } from "next/og";

export const runtime = "edge";

function pickTheme(grade: string) {
  const g = (grade || "").toLowerCase();
  if (g === "green")
    return {
      badge: "✅ GOOD PICK",
      ring: "#10b981",
      bgTop: "#ecfdf5",
      bgBottom: "#ffffff",
      text: "#0f172a",
      sub: "#065f46",
      hint: "Looks clean. Nice choice.",
    };
  if (g === "black")
    return {
      badge: "⛔ AVOID",
      ring: "#ef4444",
      bgTop: "#0b1220",
      bgBottom: "#111827",
      text: "#ffffff",
      sub: "rgba(255,255,255,.75)",
      hint: "Red flags found. Consider alternatives.",
    };
  // default yellow
  return {
    badge: "⚠️ CAUTION",
    ring: "#f59e0b",
    bgTop: "#fffbeb",
    bgBottom: "#ffffff",
    text: "#0f172a",
    sub: "rgba(120,53,15,.85)",
    hint: "Some ingredients may be concerning.",
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // 可选：如果你以后想让首页分享也“像结果”，可以传 ?g=yellow&s=62
  const grade = searchParams.get("g") || "yellow";
  const scoreRaw = searchParams.get("s");
  const score = Math.max(0, Math.min(100, Number(scoreRaw ?? 62)));

  const t = pickTheme(grade);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: `linear-gradient(180deg, ${t.bgTop} 0%, ${t.bgBottom} 70%)`,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        }}
      >
        {/* top bar */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div
            style={{
              fontSize: 34,
              fontWeight: 900,
              letterSpacing: "-0.02em",
              color: t.text,
            }}
          >
            GoodPick
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              padding: "10px 16px",
              borderRadius: 999,
              background:
                grade === "black"
                  ? "rgba(239,68,68,.18)"
                  : grade === "green"
                  ? "rgba(16,185,129,.18)"
                  : "rgba(245,158,11,.18)",
              color: t.text,
            }}
          >
            Food Scanner
          </div>
        </div>

        {/* center block (微信裁切安全区：中轴信息) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 22,
            marginTop: 10,
          }}
        >
          <div
            style={{
              fontSize: 34,
              fontWeight: 900,
              padding: "12px 18px",
              borderRadius: 16,
              background:
                grade === "black"
                  ? "rgba(239,68,68,.16)"
                  : grade === "green"
                  ? "rgba(16,185,129,.16)"
                  : "rgba(245,158,11,.16)",
              color: t.text,
            }}
          >
            {t.badge}
          </div>

          <div
            style={{
              width: 220,
              height: 220,
              borderRadius: 999,
              border: `14px solid ${t.ring}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: t.text,
              background:
                grade === "black" ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.7)",
            }}
          >
            <div style={{ fontSize: 92, fontWeight: 950, lineHeight: 1 }}>
              {Number.isFinite(score) ? score : 62}
            </div>
          </div>

          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: t.text,
              textAlign: "center",
              maxWidth: 860,
              lineHeight: 1.25,
            }}
          >
            {t.hint}
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: t.sub,
              textAlign: "center",
              maxWidth: 900,
              lineHeight: 1.4,
            }}
          >
            Scan packaged foods and instantly see if they’re a good pick — or not.
          </div>
        </div>

        {/* bottom CTA */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 800, color: t.sub }}>
            goodpick.app
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              padding: "14px 18px",
              borderRadius: 16,
              background:
                grade === "black"
                  ? "rgba(255,255,255,.10)"
                  : "rgba(15,23,42,.08)",
              color: t.text,
            }}
          >
            Scan yours → 
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // 微信会缓存，先让它缓存也没问题（稳定）。你想强制刷新我再给你版本。
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}