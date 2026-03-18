export function calculateScore(points, total) {
  if (!total || total <= 0) return 0;
  const score = (points / total) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getPerformanceLevel(score) {
  if (score >= 90) return "Aad u fiican";
  if (score >= 70) return "Wanaagsan";
  return "Ku celcelin badan samee";
}
