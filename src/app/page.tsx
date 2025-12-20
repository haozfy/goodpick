// src/app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <div>
          <div className="text-sm font-semibold">Goodpick</div>
          <div className="text-xs text-neutral-500">Scan food. Get a better pick.</div>
        </div>

        <nav className="flex items-center gap-5 text-sm">
          <Link className="text-neutral-700 hover:text-black" href="/history">
            History
          </Link>
          <Link className="text-neutral-700 hover:text-black" href="/login">
            Login
          </Link>
        </nav>
      </header>

      {/* Center */}
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

        <p className="mt-10 text-center text-xs text-neutral-400">
          Not medical advice. For decision support only.
        </p>
      </section>
    </main>
  );
}