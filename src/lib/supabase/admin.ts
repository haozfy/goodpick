// src/lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";

// ✅ 这里的修改关键：
// 直接调用 createClient 并导出结果 (Object)，而不是导出函数 () => createClient(...)
// 这样你在其他文件引用时，就可以直接使用 supabaseAdmin.from(...) 了
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
