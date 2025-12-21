"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ResetPage() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");

  const onReset = async () => {
    await supabase.auth.resetPasswordForEmail(email);
    alert("Reset email sent");
  };

  return (
    <div>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <button onClick={onReset}>Reset</button>
    </div>
  );
}