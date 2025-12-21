import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function supabaseServer() {
  // 兼容 cookies() 可能返回 Promise 的情况
  const cookieStore: any = (cookies as any)();
  const store = cookieStore?.then ? await cookieStore : cookieStore;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return store.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              store.set(name, value, options);
            });
          } catch {
            // Server Components 里可能不允许 set，Route Handler 里是允许的
          }
        },
      },
    }
  );
}