"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function HistoryPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabaseBrowser().auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  if (!user) return <div className="p-8">Please login</div>;

  return <div className="p-8">Hello {user.email}</div>;
}