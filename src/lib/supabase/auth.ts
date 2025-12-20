// src/lib/supabase/auth.ts
export type AppUser = {
  id: string;
  email?: string | null;
};

export async function getUser(): Promise<AppUser | null> {
  // 当前版本：不做 session / cookie，所以没有 user
  return null;
}

export async function requireUser(): Promise<AppUser> {
  // 你后面要做 login 时再改这里
  throw new Error("Auth not enabled yet");
}