export function calculateScore(points, total) {
  if (!total || total <= 0) return 0;
  const score = (points / total) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getPerformanceLevel(score) {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  return "Needs Practice";
}
