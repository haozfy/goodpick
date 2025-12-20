export default function HomePage() {
  return (
    <main>
      <section className="mx-auto mt-10 w-full max-w-3xl px-6">
        <h1 className="text-4xl font-semibold tracking-tight">Goodpick</h1>

        <div className="mt-8 flex w-full max-w-xl items-center gap-3">
          <input
            className="h-11 flex-1 rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none focus:border-neutral-400"
            placeholder="Paste product URL / barcode…"
          />
          <button className="h-11 rounded-xl border border-neutral-200 px-4 text-sm hover:border-neutral-400">
            Analyze
          </button>
        </div>
      </section>
    </main>
  );
}