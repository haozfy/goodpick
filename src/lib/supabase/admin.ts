// src/lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";

// 注意：这里必须用 SUPABASE_SERVICE_ROLE_KEY，不能用 ANON_KEY
export const supabaseAdmin = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};
