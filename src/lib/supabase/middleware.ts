import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ✅ 公开页面：未登录也能访问
const PUBLIC_PATHS = [
  "/",          // 首页
  "/login",     // 登录页
  "/auth",      // auth callback 等
  "/dashboard", // ✅ 你的 history
  "/recs",      // ✅ 推荐页
];

// ✅ 需要登录的页面（你现在只保护 account 就行）
const PROTECTED_PREFIXES = [
  "/account",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // ✅ 双保险：API 永远不 redirect（避免 /login 405）
  if (pathname.startsWith("/api")) {
    return response;
  }

  // ✅ 未登录：只拦受保护页面
  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // ✅ 已登录：去 /login 就送回 dashboard（你既然 dashboard=history，更合理）
  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // ✅ 其他全部放行（包括 /dashboard=history /recs）
  return response;
}