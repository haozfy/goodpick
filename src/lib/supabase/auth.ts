import { supabaseBrowser } from "@/lib/supabase/browser";

export async function getUser() {
  const supabase = supabaseBrowser();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}