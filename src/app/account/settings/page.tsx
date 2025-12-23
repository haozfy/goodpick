import { Suspense } from "react";
import SettingsClient from "./settings-client";

export default function AccountSettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SettingsClient />
    </Suspense>
  );
}

function Loading() {
  return (
    <main className="min-h-screen bg-neutral-50 px-6 pt-14 pb-28">
      <div className="mx-auto max-w-md">
        <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-neutral-100">
          <div className="h-6 w-40 animate-pulse rounded bg-neutral-100" />
          <div className="mt-4 space-y-3">
            <div className="h-12 w-full animate-pulse rounded bg-neutral-100" />
            <div className="h-12 w-full animate-pulse rounded bg-neutral-100" />
            <div className="h-12 w-full animate-pulse rounded bg-neutral-100" />
          </div>
        </div>
      </div>
    </main>
  );
}
