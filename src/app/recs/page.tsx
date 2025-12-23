// app/recs/page.tsx
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
    <main className="min-h-screen bg-neutral-50 px-6 pt-14 pb-24">
      <div className="mx-auto max-w-md text-sm text-neutral-500">
        Loading recommendations…
      </div>
    </main>
  );
}
