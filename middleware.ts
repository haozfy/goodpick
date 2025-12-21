import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const has = req.cookies.get("gp_guest")?.value;
  if (!has) {
    const guestId = crypto.randomUUID();

    res.cookies.set("gp_guest", guestId, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  return res;
}

// 需要的话限制范围，避免静态资源
export const config = {
  matcher: ["/((?!_next|favicon.ico|robots.txt|sitemap.xml).*)"],
};