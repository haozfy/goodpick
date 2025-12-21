// src/app/layout.tsx
import "./globals.css";
import TopNav from "@/components/TopNav";
import { supabaseServer } from "@/lib/supabase/server";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        <TopNav user={user} />
        {children}
      </body>
    </html>
  );
}