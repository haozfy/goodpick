// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";

export function supabaseServerFromCookieStore(cookieStore: {
  getAll: () => { name: string; value: string }[];
  set: (name: string, value: string, options?: any) => void;
}) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    }
  );
}