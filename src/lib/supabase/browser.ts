import { createClient } from "@supabase/supabase-js";
import { mustEnv } from "@/lib/env";

export const supabaseBrowser = () =>
  createClient(
    mustEnv("NEXT_PUBLIC_SUPABASE_URL"),
    mustEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: {
        persistSession: true, // 存 localStorage，不用 cookie
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );