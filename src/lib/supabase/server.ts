import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function supabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // ✅ 兼容 Next.js 16：cookies() 返回 Promise
          return cookieStore.then((c) => c.getAll());
        },
        setAll(cookiesToSet) {
          try {
            cookieStore.then((c) => {
              cookiesToSet.forEach(({ name, value, options }) => {
                c.set(name, value, options);
              });
            });
          } catch {}
        },
      },
    }
  );
}

// 兼容旧引用
export const supabaseServerFromCookieStore = supabaseServer;