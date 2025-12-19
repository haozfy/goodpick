"use client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");

  async function login() {
    await fetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    alert("Magic link sent");
  }

  return (
    <div>
      <h2>Login</h2>
      <input value={email} onChange={e => setEmail(e.target.value)} />
      <button onClick={login}>Send link</button>
    </div>
  );
}