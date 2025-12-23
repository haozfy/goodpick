// src/app/account/settings/page.tsx
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
      <div className="mx-auto w-full max-w-md">
        {/* Header skeleton */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-full bg-neutral-100" />
          <div>
            <div className="h-6 w-44 animate-pulse rounded bg-neutral-100" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-neutral-100" />
          </div>
        </div>

        {/* Section: Dietary preferences */}
        <div className="mt-8 rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-neutral-100">
          <div className="h-4 w-40 animate-pulse rounded bg-neutral-100" />
          <div className="mt-2 h-3 w-72 animate-pulse rounded bg-neutral-100" />

          <div className="mt-5 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="h-4 w-40 animate-pulse rounded bg-neutral-100" />
                  <div className="mt-2 h-3 w-64 animate-pulse rounded bg-neutral-100" />
                </div>
                <div className="h-6 w-11 animate-pulse rounded-full bg-neutral-100" />
              </div>
            ))}
          </div>
        </div>

        {/* Section: Account */}
        <div className="mt-6 overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-neutral-100">
          <div className="flex items-center justify-between p-5">
            <div className="h-4 w-28 animate-pulse rounded bg-neutral-100" />
            <div className="h-4 w-4 animate-pulse rounded bg-neutral-100" />
          </div>
          <div className="h-[1px] bg-neutral-50" />
          <div className="flex items-center justify-between p-5">
            <div className="h-4 w-36 animate-pulse rounded bg-neutral-100" />
            <div className="h-4 w-4 animate-pulse rounded bg-neutral-100" />
          </div>
        </div>

        {/* Bottom action skeleton */}
        <div className="mt-8 flex gap-3">
          <div className="h-11 flex-1 animate-pulse rounded-2xl bg-neutral-100" />
          <div className="h-11 w-28 animate-pulse rounded-2xl bg-neutral-100" />
        </div>
      </div>
    </main>
  );
}
