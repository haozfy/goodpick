const KEY = "goodpick_trial_used_v1";
const MAX_FREE = 3;

export function getTrialUsed(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function getTrialLeft(): number {
  return Math.max(0, MAX_FREE - getTrialUsed());
}

export function canUseFreeTrial(): boolean {
  return getTrialUsed() < MAX_FREE;
}

export function consumeFreeTrial(): { ok: true; left: number } | { ok: false; left: 0 } {
  const used = getTrialUsed();
  if (used >= MAX_FREE) return { ok: false, left: 0 };
  const next = used + 1;
  window.localStorage.setItem(KEY, String(next));
  return { ok: true, left: Math.max(0, MAX_FREE - next) };
}

export function resetTrialForDevOnly() {
  window.localStorage.removeItem(KEY);
}