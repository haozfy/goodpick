import { cookies } from "next/headers";
import crypto from "crypto";

export function getSessionKey() {
  const jar = cookies();
  let key = jar.get("gp_session")?.value;
  if (!key) {
    key = crypto.randomUUID();
    jar.set("gp_session", key, { path: "/", httpOnly: true });
  }
  return key;
}