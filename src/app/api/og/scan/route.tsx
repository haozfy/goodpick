import { ImageResponse } from "next/og";

export const runtime = "edge";

function clampScore(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, Math.round(x)));
}

function gradeTheme(grade: string) {
  const g = (grade || "").toLowerCase();
  if (g === "green") {
    return {
      ring: "#10B981",
      badgeBg: "#D1FAE5",
      badgeText: "#065F46",
      verdict: "GREEN CARD • GOOD",
    };
  }
  if (g === "black") {
    return {
      ring: "#EF4444",
      badgeBg: "rgba(239,68,68,0.15)",
      badgeText: "#991B1B",
      verdict: "BLACK CARD • AVOID",
    };
  }
  return {
    ring: "#F59E0B",
    badgeBg: "#FEF3C7",
    badgeText: "#92400E",
    verdict: "YELLOW CARD • CAUTION",
  };
}

function shortName(name: string) {
  const s = (name || "").trim();
  if (!s) return "Food item";
  // OG 图上太长会难看，做个截断
  return s.length > 42 ? s.slice(0, 42) + "…" : s;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  // ✅ base url：在 edge 里用当前请求 origin
  const origin = new URL(req.url).origin;

  let product = "Food item";
  let score = 0;
  let grade = "yellow";

  if (id) {
    try {
      const res = await fetch(`${origin}/api/public-scan?id=${encodeURIComponent(id)}`, {
        // 不要缓存太久，避免分享卡和内容差很久
        cache: "no-store",
      });
      if (res.ok) {
        const d = await res.json();
        product = d?.product_name ?? product;
        score = clampScore(d?.score);
        grade = (d?.grade ?? grade).toLowerCase();
      }
    } catch {
      // ignore -> fallback
    }
  }

  const theme = gradeTheme(grade);
  const productDisplay = shortName(product);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background: "#FFFFFF",
          padding: "64px",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
        }}
      >
        {/* 左侧：品牌 + 文案 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* 顶部品牌 */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "#111827",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 900,
                fontSize: 20,
              }}
            >
              GP
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: "#111827" }}>
                GoodPick
              </div>
              <div style={{ fontSize: 16, color: "#6B7280", marginTop: 2 }}>
                Food Scanner • Clean Score • Alternatives
              </div>
            </div>
          </div>

          {/* 商品名 */}
          <div style={{ marginTop: 36, fontSize: 48, fontWeight: 900, color: "#111827", lineHeight: 1.1 }}>
            {productDisplay}
          </div>

          {/* 徽章 */}
          <div style={{ marginTop: 20, display: "flex" }}>
            <div
              style={{
                padding: "12px 18px",
                borderRadius: 999,
                background: theme.badgeBg,
                color: theme.badgeText,
                fontSize: 18,
                fontWeight: 900,
                letterSpacing: 1,
              }}
            >
              {theme.verdict}
            </div>
          </div>

          {/* 底部提示 */}
          <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: 2 }}>
              GOODPICK.APP
            </div>
            <div style={{ fontSize: 16, color: "#6B7280" }}>
              Scan packaged foods and get a better choice in seconds.
            </div>
          </div>
        </div>

        {/* 右侧：分数圈 */}
        <div style={{ width: 420, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              width: 320,
              height: 320,
              borderRadius: "999px",
              border: `22px solid ${theme.ring}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div style={{ fontSize: 110, fontWeight: 950, color: "#111827", lineHeight: 1 }}>
              {score}
            </div>

            <div
              style={{
                position: "absolute",
                bottom: 22,
                fontSize: 16,
                fontWeight: 800,
                color: "#6B7280",
                letterSpacing: 2,
              }}
            >
              CLEAN SCORE
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}