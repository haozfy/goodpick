import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // 更稳，避免某些 edge 限制

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ 只在服务端用，别暴露到客户端
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  // 你已有 RPC：get_scan_public(p_id uuid)
  const { data, error } = await supabase.rpc("get_scan_public", { p_id: id });

  if (error || !data?.[0]) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const row = data[0];

  // 只返回公开字段（不要把任何敏感字段暴露出去）
  return NextResponse.json({
    id: row.id,
    product_name: row.product_name ?? "Food item",
    score: Number(row.score ?? 0),
    grade: (row.grade ?? row.verdict ?? "yellow").toString().toLowerCase(),
    analysis: row.analysis ?? "",
  });
}
