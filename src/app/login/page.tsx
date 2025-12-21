"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");

  const onLogin = async () => {
    await supabase.auth.signInWithOtp({ email });
    alert("Check your email");
  };

  return (
    <div>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <button onClick={onLogin}>Login</button>
    </div>
  );
}