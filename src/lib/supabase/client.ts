import { createBrowserClient } from '@supabase/ssr'

// 1. 导出标准的 createClient (修复 Login 页面的报错)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// 2. 导出别名 supabaseBrowser (修复 History/Reset 等旧页面的报错)
export const supabaseBrowser = createClient;
