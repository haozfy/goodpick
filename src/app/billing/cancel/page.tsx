// src/app/billing/cancel/page.tsx
export default function BillingCancelPage() {
  return (
    <main className="mx-auto max-w-md p-6 space-y-3">
      <h1 className="text-2xl font-semibold">Payment canceled</h1>
      <p className="text-sm text-neutral-600">You can upgrade anytime.</p>
      <a className="text-sm underline" href="/pricing">
        Back to Pricing
      </a>
    </main>
  );
}