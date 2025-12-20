// src/lib/supabase/server.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertEnv(name: string, v: string | undefined) {
  if (!v) throw new Error(`Missing env: ${name}`);
}

export function supabaseServer() {
  assertEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  assertEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", SUPABASE_ANON_KEY);

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// 需要写库/校验 webhook 等“可信写入”时用（服务端 only）
export function supabaseAdmin() {
  assertEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  assertEnv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY);

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}