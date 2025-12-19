import { cookies } from "next/headers";
import crypto from "crypto";

export async function getSessionKey() {
  const jar = await cookies();

  let key = jar.get("gp_session")?.value;

  if (!key) {
    key = crypto.randomUUID();
    jar.set("gp_session", key, {
      path: "/",
      httpOnly: true,
    });
  }

  return key;
}