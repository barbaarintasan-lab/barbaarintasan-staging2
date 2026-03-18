export function isGameUnlocked(lesson) {
  if (!lesson) return false;
  return lesson.completed === true && Number(lesson.score || 0) >= 70;
}
