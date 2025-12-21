// src/lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

/**
 * 带 cookie / session 的 Supabase client
 * 👉 用于：auth.getUser()、读取当前登录用户
 */
export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // 在 Server Component / Edge 情况下可能抛错，忽略即可
          }
        },
      },
    }
  );
}

/**
 * 后台 Admin / Service Role client
 * 👉 用于：写 user_entitlements、stripe webhook、扣次数
 * ❗ 不带 cookie，不依赖登录态
 */
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

/**
 * 兼容旧代码（如果你之前用过这个名字）
 * 👉 可以之后慢慢删
 */
export const supabaseServerFromCookieStore = supabaseServer;