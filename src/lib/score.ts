export function scoreLabel(score: number) {
  if (score >= 80) return { label: "Excellent", color: "#16a34a" };
  if (score >= 60) return { label: "Good", color: "#22c55e" };
  if (score >= 40) return { label: "Poor", color: "#f97316" };
  return { label: "Bad", color: "#dc2626" };
}