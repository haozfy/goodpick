export default function PricingPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-6 pt-14 pb-28">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-3xl font-black text-neutral-900">Go Pro</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Unlimited scans + trends + smarter recommendations.
        </p>

        <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-neutral-100">
          <div className="text-sm font-bold text-neutral-900">Pro</div>
          <div className="mt-1 text-2xl font-black text-neutral-900">$ — / month</div>
          <button className="mt-4 w-full rounded-2xl bg-neutral-900 py-3 text-sm font-black text-white">
            Continue
          </button>
          <div className="mt-3 text-xs text-neutral-500">
            You can hook this button to Stripe later.
          </div>
        </div>
      </div>
    </main>
  );
}