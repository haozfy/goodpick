// src/app/auth/callback/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: { code?: string; next?: string };
}) {
  const code = searchParams.code;
  const next = searchParams.next ?? "/";

  if (!code) redirect("/login?error=missing_code");

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);

  redirect(next);
}