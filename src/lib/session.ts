import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "gp_session";

// Next 16: cookies() 可能是 async（Vercel build/edge 环境会报你之前那个错）
export async function getSessionKey(): Promise<string> {
  const jar = await cookies();
  let key = jar.get(COOKIE_NAME)?.value;

  if (!key) {
    key = crypto.randomUUID();
    jar.set(COOKIE_NAME, key, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return key;
}

// 兼容你代码里之前用过的名字：getOrCreateSessionId
export async function getOrCreateSessionId(): Promise<string> {
  return getSessionKey();
}