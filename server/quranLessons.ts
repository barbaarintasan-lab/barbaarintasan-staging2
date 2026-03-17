export type Phase = 1 | 2 | 3 | 4 | 5;

export interface QuranCurriculumSurah {
  number: number;
  name: string;
  englishName: string;
  ayahCount: number;
  difficulty: "easy" | "medium" | "hard";
  order: number;
  phase: Phase;
}

export const PHASE_LABELS: Record<Phase, { somali: string; english: string; emoji: string }> = {
  1: { somali: "Bilowga (Aad u fudud)", english: "Ultra Beginner", emoji: "🌱" },
  2: { somali: "Sii wadista", english: "Beginner Expansion", emoji: "🌿" },
  3: { somali: "Dhexe", english: "Intermediate", emoji: "🌳" },
  4: { somali: "Kor u kaca", english: "Moving Up", emoji: "🌟" },
  5: { somali: "Heer sare (Juz Amma dhamaad)", english: "Advanced", emoji: "🏆" },
};

export const JUZ_AMMA_CURRICULUM: QuranCurriculumSurah[] = [
  // Phase 1: Ultra Beginner — confidence, quick wins
  { number: 1, name: "سُورَةُ الفَاتِحَةِ", englishName: "Al-Faatiha", ayahCount: 7, difficulty: "easy", order: 1, phase: 1 },
  { number: 114, name: "سُورَةُ النَّاسِ", englishName: "An-Naas", ayahCount: 6, difficulty: "easy", order: 2, phase: 1 },
  { number: 113, name: "سُورَةُ الفَلَقِ", englishName: "Al-Falaq", ayahCount: 5, difficulty: "easy", order: 3, phase: 1 },
  { number: 112, name: "سُورَةُ الإِخۡلَاصِ", englishName: "Al-Ikhlaas", ayahCount: 4, difficulty: "easy", order: 4, phase: 1 },

  // Phase 2: Beginner Expansion — ~10 surahs total
  { number: 111, name: "سُورَةُ المَسَدِ", englishName: "Al-Masad", ayahCount: 5, difficulty: "easy", order: 5, phase: 2 },
  { number: 110, name: "سُورَةُ النَّصۡرِ", englishName: "An-Nasr", ayahCount: 3, difficulty: "easy", order: 6, phase: 2 },
  { number: 109, name: "سُورَةُ الكَافِرُونَ", englishName: "Al-Kaafiroon", ayahCount: 6, difficulty: "easy", order: 7, phase: 2 },
  { number: 108, name: "سُورَةُ الكَوۡثَرِ", englishName: "Al-Kawthar", ayahCount: 3, difficulty: "easy", order: 8, phase: 2 },
  { number: 107, name: "سُورَةُ المَاعُونِ", englishName: "Al-Maa'oon", ayahCount: 7, difficulty: "easy", order: 9, phase: 2 },
  { number: 106, name: "سُورَةُ قُرَيۡشٍ", englishName: "Quraish", ayahCount: 4, difficulty: "easy", order: 10, phase: 2 },

  // Phase 3: Intermediate
  { number: 105, name: "سُورَةُ الفِيلِ", englishName: "Al-Fiil", ayahCount: 5, difficulty: "easy", order: 11, phase: 3 },
  { number: 104, name: "سُورَةُ الهُمَزَةِ", englishName: "Al-Humaza", ayahCount: 9, difficulty: "easy", order: 12, phase: 3 },
  { number: 103, name: "سُورَةُ العَصۡرِ", englishName: "Al-Asr", ayahCount: 3, difficulty: "easy", order: 13, phase: 3 },
  { number: 102, name: "سُورَةُ التَّكَاثُرِ", englishName: "At-Takaathur", ayahCount: 8, difficulty: "easy", order: 14, phase: 3 },
  { number: 101, name: "سُورَةُ القَارِعَةِ", englishName: "Al-Qaari'a", ayahCount: 11, difficulty: "medium", order: 15, phase: 3 },

  // Phase 4: Moving Up
  { number: 100, name: "سُورَةُ العَادِيَاتِ", englishName: "Al-Aadiyaat", ayahCount: 11, difficulty: "medium", order: 16, phase: 4 },
  { number: 99, name: "سُورَةُ الزَّلۡزَلَةِ", englishName: "Az-Zalzala", ayahCount: 8, difficulty: "medium", order: 17, phase: 4 },
  { number: 98, name: "سُورَةُ البَيِّنَةِ", englishName: "Al-Bayyina", ayahCount: 8, difficulty: "medium", order: 18, phase: 4 },
  { number: 97, name: "سُورَةُ القَدۡرِ", englishName: "Al-Qadr", ayahCount: 5, difficulty: "easy", order: 19, phase: 4 },
  { number: 96, name: "سُورَةُ العَلَقِ", englishName: "Al-Alaq", ayahCount: 19, difficulty: "medium", order: 20, phase: 4 },

  // Phase 5: Advanced — Juz Amma dhamaad
  { number: 95, name: "سُورَةُ التِّينِ", englishName: "At-Tiin", ayahCount: 8, difficulty: "easy", order: 21, phase: 5 },
  { number: 94, name: "سُورَةُ الشَّرۡحِ", englishName: "Ash-Sharh", ayahCount: 8, difficulty: "easy", order: 22, phase: 5 },
  { number: 93, name: "سُورَةُ الضُّحَىٰ", englishName: "Ad-Duhaa", ayahCount: 11, difficulty: "medium", order: 23, phase: 5 },
  { number: 92, name: "سُورَةُ اللَّيۡلِ", englishName: "Al-Lail", ayahCount: 21, difficulty: "medium", order: 24, phase: 5 },
  { number: 91, name: "سُورَةُ الشَّمۡسِ", englishName: "Ash-Shams", ayahCount: 15, difficulty: "medium", order: 25, phase: 5 },
  { number: 90, name: "سُورَةُ البَلَدِ", englishName: "Al-Balad", ayahCount: 20, difficulty: "medium", order: 26, phase: 5 },
  { number: 89, name: "سُورَةُ الفَجۡرِ", englishName: "Al-Fajr", ayahCount: 30, difficulty: "hard", order: 27, phase: 5 },
  { number: 88, name: "سُورَةُ الغَاشِيَةِ", englishName: "Al-Ghaashiya", ayahCount: 26, difficulty: "hard", order: 28, phase: 5 },
  { number: 87, name: "سُورَةُ الأَعۡلَى", englishName: "Al-A'laa", ayahCount: 19, difficulty: "medium", order: 29, phase: 5 },
  { number: 86, name: "سُورَةُ الطَّارِقِ", englishName: "At-Taariq", ayahCount: 17, difficulty: "medium", order: 30, phase: 5 },
  { number: 85, name: "سُورَةُ البُرُوجِ", englishName: "Al-Burooj", ayahCount: 22, difficulty: "hard", order: 31, phase: 5 },
  { number: 84, name: "سُورَةُ الانشِقَاقِ", englishName: "Al-Inshiqaaq", ayahCount: 25, difficulty: "hard", order: 32, phase: 5 },
  { number: 83, name: "سُورَةُ المُطَفِّفِينَ", englishName: "Al-Mutaffifiin", ayahCount: 36, difficulty: "hard", order: 33, phase: 5 },
  { number: 82, name: "سُورَةُ الانفِطَارِ", englishName: "Al-Infitaar", ayahCount: 19, difficulty: "medium", order: 34, phase: 5 },
  { number: 81, name: "سُورَةُ التَّكۡوِيرِ", englishName: "At-Takwiir", ayahCount: 29, difficulty: "hard", order: 35, phase: 5 },
  { number: 80, name: "سُورَةُ عَبَسَ", englishName: "Abasa", ayahCount: 42, difficulty: "hard", order: 36, phase: 5 },
  { number: 79, name: "سُورَةُ النَّازِعَاتِ", englishName: "An-Naazi'aat", ayahCount: 46, difficulty: "hard", order: 37, phase: 5 },
  { number: 78, name: "سُورَةُ النَّبَإِ", englishName: "An-Naba", ayahCount: 40, difficulty: "hard", order: 38, phase: 5 },
];

export function getFullCurriculum(): QuranCurriculumSurah[] {
  return JUZ_AMMA_CURRICULUM;
}

export function getCurriculumWithProgress(
  completedSurahs: Set<number>
): (QuranCurriculumSurah & { unlocked: boolean; completed: boolean })[] {
  return JUZ_AMMA_CURRICULUM.map((surah, index) => {
    const completed = completedSurahs.has(surah.number);
    const unlocked = index === 0 || completedSurahs.has(JUZ_AMMA_CURRICULUM[index - 1].number);
    return { ...surah, unlocked, completed };
  });
}

export function getNextSurahInCurriculum(currentSurahNumber: number): number | null {
  const idx = JUZ_AMMA_CURRICULUM.findIndex(s => s.number === currentSurahNumber);
  if (idx === -1 || idx >= JUZ_AMMA_CURRICULUM.length - 1) return null;
  return JUZ_AMMA_CURRICULUM[idx + 1].number;
}

export const CURRICULUM_ORDER = JUZ_AMMA_CURRICULUM.map(s => s.number);

export const DAILY_ATTEMPT_LIMIT = 30;

export const ENCOURAGEMENT_MESSAGES = [
  "Isku day mar kale, adigaa kartaa! 💪",
  "Waa ku dhow tahay! Sii wad! 🌟",
  "Qayb khaldan, laakiin adigaa fiican! ⭐",
  "Dhageyso aayada oo isku day mar kale! 🎧",
  "Waxaad si fiican u wadataa! Hal mar kale! 🌙",
];

export function getRandomEncouragement(): string {
  return ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];
}
