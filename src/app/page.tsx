// app/page.tsx
import Link from "next/link";

const SCAN_HREF = "/scan"; // ✅ 改成你真实的扫描入口路由（例如 "/" 或 "/scan" 或 "/camera"）

export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Top bar */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-neutral-900" />
          <span className="text-lg font-black tracking-tight">GoodPick</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/about"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 md:inline-flex"
          >
            How it works
          </Link>
          <Link
            href={SCAN_HREF}
            className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-800 active:scale-[0.99]"
          >
            Scan
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-10 pt-8 md:pb-14 md:pt-12">
        <div className="grid items-start gap-10 md:grid-cols-2 md:gap-12">
          {/* Left: copy */}
          <div>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight md:text-5xl">
              One scan.
              <br />
              One decision.
            </h1>

            <p className="mt-5 max-w-xl text-base font-medium leading-relaxed text-neutral-700 md:text-lg">
              Know if a food is good — or something you should avoid.
              <br className="hidden md:block" />
              Checks sugar, additives, fats, sodium, cholesterol — and more.
            </p>

            <p className="mt-4 text-sm font-semibold text-neutral-500 italic">
              You are what you eat.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={SCAN_HREF}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-900 px-6 py-4 text-base font-black text-white shadow-lg shadow-neutral-900/10 hover:bg-neutral-800 active:scale-[0.99] sm:w-auto"
              >
                SCAN FOOD LABEL
              </Link>

              <div className="text-sm font-semibold text-neutral-500">
                No signup required
              </div>
            </div>

            {/* Micro trust */}
            <div className="mt-10 grid gap-3 rounded-3xl border border-neutral-200 bg-white p-5">
              <p className="text-sm font-bold tracking-wide text-neutral-900">
                We don’t explain labels. We judge them.
              </p>
              <p className="text-sm font-medium leading-relaxed text-neutral-600">
                You get a single result you can act on — without reading the
                fine print.
              </p>
            </div>
          </div>

          {/* Right: visual card mock */}
          <div className="relative">
            <div className="rounded-[2.5rem] border border-neutral-200 bg-white p-6 shadow-2xl shadow-neutral-900/10">
              <div className="flex items-center justify-between">
                <div className="text-xs font-black tracking-[0.2em] text-neutral-400">
                  SAMPLE RESULT
                </div>
                <div className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-700">
                  GoodPick
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center">
                <div className="relative">
                  <div className="h-36 w-36 rounded-full border-[10px] border-neutral-200" />
                  <div className="absolute inset-0 rounded-full border-[10px] border-emerald-500" />
                  <div className="absolute inset-0 flex items-center justify-center text-5xl font-black">
                    82
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <h2 className="text-xl font-black leading-tight">
                  Sample Product
                </h2>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-800">
                  Green • Good
                </div>
                <p className="mt-5 text-sm font-medium leading-relaxed text-neutral-600">
                  “Analyzed sugar, fat, sodium, cholesterol, additives — and
                  more.”
                </p>
              </div>

              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl bg-neutral-900 px-4 py-3 text-center text-sm font-black text-white">
                  Scan Next Item
                </div>
                <div className="text-center text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Three outcomes • no gray area
                </div>
              </div>
            </div>

            {/* Floating mini badges */}
            <div className="pointer-events-none absolute -right-2 -top-3 hidden md:block">
              <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-lg shadow-neutral-900/10">
                <div className="text-xs font-black text-neutral-900">
                  Green — Eat freely
                </div>
                <div className="mt-1 text-xs font-semibold text-neutral-500">
                  Clear “yes”
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute -left-2 bottom-6 hidden md:block">
              <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-lg shadow-neutral-900/10">
                <div className="text-xs font-black text-neutral-900">
                  Black — Avoid
                </div>
                <div className="mt-1 text-xs font-semibold text-neutral-500">
                  Clear “no”
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Differentiation */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-12 md:pb-16">
        <div className="rounded-[2.5rem] border border-neutral-200 bg-white p-7 md:p-10">
          <h3 className="text-2xl font-black tracking-tight md:text-3xl">
            Three outcomes. <span className="text-neutral-500">No gray area.</span>
          </h3>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <OutcomeCard
              title="Green"
              subtitle="Eat freely"
              desc="A clear yes. Move on with confidence."
              tone="green"
            />
            <OutcomeCard
              title="Yellow"
              subtitle="Think twice"
              desc="Not the best. Choose smarter when you can."
              tone="yellow"
            />
            <OutcomeCard
              title="Black"
              subtitle="Avoid"
              desc="A clear no. Pick a cleaner alternative."
              tone="black"
            />
          </div>

          <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-3xl bg-neutral-50 p-6 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-black text-neutral-900">
                No brand deals. No paid rankings.
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-600">
                We don’t sell shelf space — we help you make a decision.
              </p>
            </div>

            <Link
              href={SCAN_HREF}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-900 px-6 py-4 text-sm font-black text-white hover:bg-neutral-800 active:scale-[0.99] md:w-auto"
            >
              SCAN FOOD LABEL
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-5xl px-6 pb-10 text-sm text-neutral-500">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="font-semibold">
            © {new Date().getFullYear()} GoodPick
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="font-semibold hover:text-neutral-700">
              Privacy
            </Link>
            <Link href="/terms" className="font-semibold hover:text-neutral-700">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function OutcomeCard({
  title,
  subtitle,
  desc,
  tone,
}: {
  title: string;
  subtitle: string;
  desc: string;
  tone: "green" | "yellow" | "black";
}) {
  const toneStyle =
    tone === "green"
      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
      : tone === "yellow"
        ? "bg-amber-50 border-amber-200 text-amber-900"
        : "bg-neutral-900 border-neutral-800 text-white";

  const pill =
    tone === "black"
      ? "bg-white/10 text-white"
      : "bg-white text-neutral-900";

  return (
    <div className={`rounded-3xl border p-6 ${toneStyle}`}>
      <div className="flex items-center justify-between">
        <div className="text-lg font-black">{title}</div>
        <div className={`rounded-full px-3 py-1 text-xs font-black ${pill}`}>
          {subtitle}
        </div>
      </div>
      <p className="mt-4 text-sm font-medium leading-relaxed opacity-90">
        {desc}
      </p>
    </div>
  );
}