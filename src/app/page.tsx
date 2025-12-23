return (
  <main className="flex min-h-screen w-full flex-col items-center bg-neutral-50/50 px-6 pt-14 pb-24 relative overflow-hidden">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

    {/* HERO (更短、更直接) */}
    <div className="mb-7 text-center relative z-10 max-w-sm">
      <div className="inline-flex items-center justify-center p-3 mb-4 bg-white rounded-2xl shadow-sm border border-neutral-100">
        <ScanLine size={28} className="text-emerald-600" />
      </div>

      <h1 className="text-5xl font-black text-neutral-900 tracking-tighter leading-tight">
        Good
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
          Pick
        </span>
      </h1>

      <p className="mt-4 text-base font-semibold text-neutral-800">
        Snap a food label. Get a health verdict in seconds.
      </p>

      <p className="mt-2 text-sm text-neutral-600">
        Score + quick reason + cleaner alternatives.
      </p>

      <p className="mt-2 text-xs text-neutral-400">
        Try free. Log in only if you want to save history & unlock unlimited scans.
      </p>
    </div>

    <input
      type="file"
      ref={fileInputRef}
      onChange={handleFileChange}
      accept="image/*"
      capture="environment"
      className="hidden"
    />

    {/* PRIMARY CTA */}
    <div className="relative z-10 group">
      {!isAnalyzing && (
        <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping-slow pointer-events-none"></div>
      )}

      <button
        onClick={handleScanClick}
        disabled={isAnalyzing}
        className={`relative flex h-56 w-56 items-center justify-center rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-4 transition-all duration-300 active:scale-95 disabled:scale-100 overflow-hidden
          bg-gradient-to-br from-neutral-900 to-neutral-800 border-neutral-800/50`}
      >
        <div className="flex flex-col items-center gap-3 relative z-10">
          {isAnalyzing ? (
            <>
              <Loader2 size={56} className="text-emerald-400 animate-spin" />
              <span className="font-bold text-white text-sm tracking-[0.2em] animate-pulse">
                ANALYZING
              </span>
            </>
          ) : (
            <>
              <Camera size={56} className="text-white" />
              <span className="font-black text-xl text-white tracking-wide">
                TAKE A PHOTO
              </span>
              <span className="text-[11px] text-white/60 tracking-wider">
                GET A VERDICT
              </span>
            </>
          )}
        </div>
      </button>
    </div>

    {/* FEATURES (压缩成 3 行，别讲太多) */}
    <div className="mt-7 w-full max-w-sm relative z-10">
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-neutral-100/60 text-left">
        <h3 className="font-extrabold text-neutral-900 text-sm mb-3">
          In one scan
        </h3>

        <ul className="space-y-2 text-sm text-neutral-700">
          <li className="flex items-start gap-2">
            <span className="mt-[7px] h-2 w-2 rounded-full bg-emerald-500"></span>
            <span><b>0–100 score</b> (easy to trust at a glance)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-[7px] h-2 w-2 rounded-full bg-emerald-500"></span>
            <span><b>Top 1–3 reasons</b> (what matters, not everything)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-[7px] h-2 w-2 rounded-full bg-emerald-500"></span>
            <span><b>Better alternatives</b> in the same category</span>
          </li>
        </ul>
      </div>
    </div>

    {/* RECENT / TRY IT */}
    <div className="mt-auto w-full max-w-sm relative z-10">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-sm font-bold text-neutral-700 flex items-center gap-2">
          <History size={16} className="text-neutral-400" />{" "}
          {isAuthed ? "Recent scans" : "No account needed"}
        </h2>

        {isAuthed && recentScans.length > 0 && (
          <Link href="/dashboard" className="text-xs font-bold text-emerald-600">
            View history
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {!isAuthed ? (
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-neutral-100/50 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 font-black">
              ✓
            </div>
            <div>
              <h3 className="font-bold text-neutral-800 text-sm">Scan first. Decide faster.</h3>
              <p className="text-xs text-neutral-400">
                Log in later to save history & unlock unlimited scans.
              </p>
            </div>
          </div>
        ) : recentScans.length === 0 ? (
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-neutral-100/50 flex items-center gap-3 opacity-70">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 font-black">
              ?
            </div>
            <div>
              <h3 className="font-bold text-neutral-700 text-sm">No scans yet</h3>
              <p className="text-xs text-neutral-400">Your last 2 scans show up here.</p>
            </div>
          </div>
        ) : (
          recentScans.map((scan) => (
            <Link href={`/scan-result?id=${scan.id}`} key={scan.id} className="block group">
              <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-neutral-100 transition-all hover:border-emerald-200">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-black text-white ${
                      scan.grade === "green" ? "bg-emerald-500" : "bg-neutral-900"
                    }`}
                  >
                    {scan.score}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-neutral-800 truncate max-w-[150px]">
                      {scan.product_name || "Unknown"}
                    </h3>
                    <p className="text-xs text-neutral-400">
                      {new Date(scan.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-neutral-300" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  </main>
);