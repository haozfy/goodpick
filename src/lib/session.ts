import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "gp_session";
const ONE_YEAR = 60 * 60 * 24 * 365;

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
      maxAge: ONE_YEAR,
    });
  }

  return key;
}

// 兼容旧 import（你项目里还有 getOrCreateSessionId）
export async function getOrCreateSessionId(): Promise<string> {
  return getSessionKey();
}