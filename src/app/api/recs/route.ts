import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scanId = searchParams.get("scanId");

    if (!scanId) {
      return NextResponse.json({ error: "Missing scanId" }, { status: 400 });
    }

    const { data: scan, error } = await supabase
      .from("scans")
      .select("id, verdict, analysis, alternatives, product_name")
      .eq("id", scanId)
      .eq("user_id", user.id)
      .single();

    if (error || !scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    // Good → 不给 Recs
    if (scan.verdict === "good") {
      return NextResponse.json({
        verdict: "good",
        message: "This is already a good choice.",
        alternatives: [],
      });
    }

    return NextResponse.json({
      verdict: scan.verdict,
      productName: scan.product_name,
      analysis: scan.analysis,
      alternatives: Array.isArray(scan.alternatives) ? scan.alternatives : [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
