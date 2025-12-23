import { Suspense } from "react";
import RecsClient from "./recs-client";

export default function RecsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <RecsClient />
    </Suspense>
  );
}

function Loading() {
  return (
    <main className="min-h-screen bg-neutral-50 px-6 pt-14 pb-28">
      <div className="mx-auto max-w-md">
        <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-neutral-100">
          <div className="h-4 w-40 animate-pulse rounded bg-neutral-100" />
          <div className="mt-3 h-10 w-full animate-pulse rounded bg-neutral-100" />
          <div className="mt-3 h-24 w-full animate-pulse rounded bg-neutral-100" />
        </div>
      </div>
    </main>
  );
}