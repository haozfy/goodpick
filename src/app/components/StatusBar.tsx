"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Status =
  | { kind: "guest"; left: number }
  | { kind: "free"; left: number }
  | { kind: "pro" };

export default function StatusBar() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch(() => setStatus(null));
  }, []);

  if (!status) return null;

  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm">
      <div className="flex items-center gap-2">
        {status.kind === "guest" && (
          <>
            <span className="font-medium">Guest</span>
            <span className="text-neutral-500">· {status.left} scans left</span>
          </>
        )}

        {status.kind === "free" && (
          <>
            <span className="font-medium">Free</span>
            <span className="text-neutral-500">· {status.left} scans left</span>
          </>
        )}

        {status.kind === "pro" && (
          <>
            <span className="font-medium text-emerald-600">Pro</span>
            <span className="text-neutral-500">· Unlimited</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {status.kind !== "pro" && (
          <button
            onClick={() => router.push("/login?upgrade=1")}
            className="rounded-lg border px-3 py-1 hover:border-neutral-400"
          >
            Upgrade
          </button>
        )}

        {status.kind === "guest" && (
          <button
            onClick={() => router.push("/login")}
            className="text-neutral-500 hover:text-black"
          >
            Login
          </button>
        )}
      </div>
    </div>
  );
}