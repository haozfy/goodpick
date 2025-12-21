// src/app/billing/success/page.tsx
export default function BillingSuccessPage() {
  return (
    <main className="mx-auto max-w-md p-6 space-y-3">
      <h1 className="text-2xl font-semibold">Payment successful</h1>
      <p className="text-sm text-neutral-600">You’re now Pro. Go back to scan.</p>
      <a className="text-sm underline" href="/">
        Back to Scan
      </a>
    </main>
  );
}