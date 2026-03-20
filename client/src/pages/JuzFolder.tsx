import { useChildAuth } from "@/contexts/ChildAuthContext";
import { useLocation, useParams } from "wouter";
import { useEffect, useState } from "react";
import {
  ArrowLeft, Star, Trophy, Lock, CheckCircle2,
  Gamepad2, Award, Flame, TrendingUp, BookOpen,
} from "lucide-react";

interface JuzSurah {
  number: number;
  name: string;
  englishName: string;
  ayahCount: number;
  completed: boolean;
  unlocked: boolean;
  ayahsCompleted: number;
  progressPercent: number;
}

interface RewardsData {
  aayahStars: number;
  surahTrophies: number;
  gameCoins: number;
  gameTokens: number;
  badges: { key: string; name: string; icon: string }[];
  streak?: { current: number; best: number; multiplier: number };
  weeklyProgress?: { gamesPlayed: number; starsEarned: number; coinsEarned?: number };
}

interface UnlockedGame {
  surahNumber: number;
  surahName: string;
  starsEarned: number;
  games: string[];
}

type DashboardTab = "quran" | "games" | "rewards";

const GAME_INFO: Record<string, { label: string; emoji: string }> = {
  word_puzzle: { label: "Xarafaha Aayada", emoji: "🧩" },
  memory_match: { label: "Aayah Xusuus", emoji: "🃏" },
  surah_quiz: { label: "Surah Quiz", emoji: "⚡" },
  somali_flashcards: { label: "Af-Soomaali Cards", emoji: "🗂️" },
};
const GAME_ROUTES: Record<string, string> = {
  word_puzzle: "/quran-game/word-puzzle",
  memory_match: "/quran-game/memory-match",
  surah_quiz: "/quran-game/surah-quiz",
  somali_flashcards: "/quran-game/somali-flashcards",
};

const JUZ_NAMES: Record<number, { somali: string; arabic: string; gradient: string; glow: string }> = {
  1:  { somali: "Juz Aliflaammiim",    arabic: "الم",                    gradient: "from-pink-800 via-rose-700 to-red-800",           glow: "#f472b6" },
  2:  { somali: "Juz Sayaqulu",        arabic: "سَيَقُولُ",               gradient: "from-red-800 via-rose-700 to-orange-800",          glow: "#fb7185" },
  3:  { somali: "Juz Tilkar Rusul",    arabic: "تِلْكَ الرُّسُلُ",        gradient: "from-orange-800 via-amber-700 to-yellow-800",      glow: "#fb923c" },
  4:  { somali: "Juz Lan Tanalu",      arabic: "لَن تَنَالُوا",           gradient: "from-yellow-700 via-lime-700 to-green-800",        glow: "#fbbf24" },
  5:  { somali: "Juz Walmuhsanat",     arabic: "وَٱلْمُحْصَنَٰتُ",        gradient: "from-lime-800 via-green-700 to-emerald-800",       glow: "#86efac" },
  6:  { somali: "Juz La Yuhibbullah",  arabic: "لَا يُحِبُّ ٱللَّهُ",    gradient: "from-emerald-800 via-teal-700 to-cyan-800",        glow: "#34d399" },
  7:  { somali: "Juz Wa-iza Sami'u",   arabic: "وَإِذَا سَمِعُوا",        gradient: "from-teal-800 via-cyan-700 to-sky-800",            glow: "#2dd4bf" },
  8:  { somali: "Juz Walaw Annana",    arabic: "وَلَوْ أَنَّنَا",          gradient: "from-cyan-800 via-sky-700 to-blue-800",            glow: "#22d3ee" },
  9:  { somali: "Juz Qalal Mala",      arabic: "قَالَ ٱلْمَلَأُ",         gradient: "from-sky-800 via-blue-700 to-indigo-800",          glow: "#60a5fa" },
  10: { somali: "Juz Wa'lamu",         arabic: "وَاعْلَمُوٓا",             gradient: "from-blue-800 via-indigo-700 to-violet-800",       glow: "#818cf8" },
  11: { somali: "Juz Ya'taziruna",     arabic: "يَعْتَذِرُونَ",            gradient: "from-indigo-800 via-violet-700 to-purple-800",     glow: "#a78bfa" },
  12: { somali: "Juz Wama min Dabbah", arabic: "وَمَا مِن دَآبَّةٍ",      gradient: "from-violet-800 via-purple-700 to-fuchsia-800",    glow: "#c084fc" },
  13: { somali: "Juz Wama Ubarri'u",   arabic: "وَمَآ أُبَرِّئُ",          gradient: "from-purple-800 via-fuchsia-700 to-pink-800",      glow: "#e879f9" },
  14: { somali: "Juz Rubama",          arabic: "رُّبَمَا",                 gradient: "from-fuchsia-800 via-pink-700 to-rose-800",        glow: "#f0abfc" },
  15: { somali: "Juz Subhanal lazi",   arabic: "سُبْحَانَ ٱلَّذِى",       gradient: "from-rose-800 via-red-700 to-orange-800",          glow: "#fda4af" },
  16: { somali: "Juz Qala Alam",       arabic: "قَالَ أَلَمْ",             gradient: "from-orange-700 via-amber-600 to-yellow-700",      glow: "#fdba74" },
  17: { somali: "Juz Iqtaraba",        arabic: "ٱقْتَرَبَ",               gradient: "from-yellow-700 via-green-700 to-teal-700",        glow: "#fef08a" },
  18: { somali: "Juz Qad Aflaha",      arabic: "قَدْ أَفْلَحَ",            gradient: "from-green-800 via-emerald-700 to-cyan-800",       glow: "#6ee7b7" },
  19: { somali: "Juz Waqalal lazina",  arabic: "وَقَالَ ٱلَّذِينَ",       gradient: "from-teal-800 via-blue-700 to-indigo-800",         glow: "#5eead4" },
  20: { somali: "Juz Amman Khalaqa",   arabic: "أَمَّنْ خَلَقَ",           gradient: "from-cyan-800 via-cyan-700 to-teal-700",           glow: "#22d3ee" },
  21: { somali: "Juz Amma Yatasaa",    arabic: "أَمَّن يَتَسَآءَ",         gradient: "from-sky-800 via-blue-700 to-sky-700",             glow: "#60a5fa" },
  22: { somali: "Juz Wa Man Yaqnut",   arabic: "وَمَن يَقْنُتْ",           gradient: "from-violet-800 via-violet-700 to-purple-700",     glow: "#a78bfa" },
  23: { somali: "Juz Wama Ubarri'u",   arabic: "وَمَآ أُبَرِّئُ",          gradient: "from-fuchsia-800 via-fuchsia-700 to-pink-700",     glow: "#e879f9" },
  24: { somali: "Juz Faman Azlamu",    arabic: "فَمَنْ أَظْلَمُ",          gradient: "from-rose-800 via-rose-700 to-red-700",            glow: "#fb7185" },
  25: { somali: "Juz Ilayhi Yuraddu",  arabic: "إِلَيْهِ يُرَدُّ",         gradient: "from-orange-800 via-orange-700 to-amber-700",      glow: "#fb923c" },
  26: { somali: "Juz Ha Miim",         arabic: "حٰمٓ",                    gradient: "from-yellow-700 via-yellow-600 to-lime-700",       glow: "#fbbf24" },
  27: { somali: "Juz Qala Fama",       arabic: "قَالَ فَمَا خَطْبُكُمْ",   gradient: "from-lime-800 via-lime-700 to-green-700",          glow: "#86efac" },
  28: { somali: "Juz Qad Sami'a",      arabic: "قَدْ سَمِعَ ٱللَّهُ",      gradient: "from-teal-800 via-teal-700 to-cyan-700",           glow: "#2dd4bf" },
  29: { somali: "Juz Tabaraka",        arabic: "تَبَارَكَ",               gradient: "from-emerald-800 via-emerald-700 to-teal-700",     glow: "#34d399" },
  30: { somali: "Juz 'Aamma",          arabic: "جُزْءُ عَمَّ",            gradient: "from-green-800 via-emerald-700 to-green-700",      glow: "#4ade80" },
};

export default function JuzFolder() {
  const { child, isLoading } = useChildAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ juzNum: string }>();
  const juzNum = parseInt(params.juzNum || "29");

  const [surahs, setSurahs] = useState<JuzSurah[]>([]);
  const [loadingSurahs, setLoadingSurahs] = useState(true);
  const [rewards, setRewards] = useState<RewardsData | null>(null);
  const [unlockedGames, setUnlockedGames] = useState<UnlockedGame[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>("quran");

  const juzInfo = JUZ_NAMES[juzNum] || JUZ_NAMES[29];

  useEffect(() => {
    if (!child) return;
    setLoadingSurahs(true);
    fetch(`/api/quran/juz/${juzNum}/surahs`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setSurahs(Array.isArray(data) ? data : []))
      .catch(() => setSurahs([]))
      .finally(() => setLoadingSurahs(false));
  }, [child, juzNum]);

  useEffect(() => {
    if (!child) return;
    fetch("/api/quran/rewards", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then(setRewards)
      .catch(() => {});
  }, [child]);

  useEffect(() => {
    if (!child) return;
    fetch("/api/quran/games/available", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.unlockedGames) setUnlockedGames(data.unlockedGames); })
      .catch(() => {});
  }, [child]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#FFD93D]/20 border-t-[#FFD93D] rounded-full animate-spin" />
      </div>
    );
  }

  const totalSurahs = surahs.length;
  const completedCount = surahs.filter((s) => s.completed).length;

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      {/* Animated stars */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white/30 animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 sticky top-0 bg-[#1a1a2e]/95 backdrop-blur-sm border-b border-white/5 px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setLocation("/child-dashboard")}
            className="text-white/60 hover:text-white p-2 -ml-2 rounded-xl active:bg-white/10"
            data-testid="button-back"
          >
            <ArrowLeft className="w-7 h-7" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-xl truncate" data-testid="text-juz-name">
              {juzInfo.somali}
            </h1>
            <p className="text-white/40 text-sm font-['Amiri',_serif]" dir="rtl">
              {juzInfo.arabic}
            </p>
          </div>

          <div className="bg-white/10 rounded-2xl px-3 py-2 text-center shrink-0">
            <p className="text-[#FFD93D] font-bold text-base">{completedCount}/{totalSurahs}</p>
            <p className="text-white/40 text-[10px]">Surah</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-white/5 rounded-2xl p-2.5 text-center border border-white/10">
            <Star className="w-4 h-4 text-[#FFD93D] mx-auto mb-0.5" />
            <p className="text-white font-bold text-sm">{rewards?.aayahStars || 0}</p>
            <p className="text-white/40 text-[10px]">Xiddigaha</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-2.5 text-center border border-white/10">
            <Trophy className="w-4 h-4 text-[#FF6B6B] mx-auto mb-0.5" />
            <p className="text-white font-bold text-sm">{rewards?.surahTrophies || 0}</p>
            <p className="text-white/40 text-[10px]">Surah</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-2.5 text-center border border-white/10">
            <span className="text-[#4ECDC4] text-base block mx-auto mb-0.5">🪙</span>
            <p className="text-white font-bold text-sm">{rewards?.gameCoins || 0}</p>
            <p className="text-white/40 text-[10px]">Coins</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-2.5 text-center border border-white/10">
            <Gamepad2 className="w-4 h-4 text-[#A855F7] mx-auto mb-0.5" />
            <p className="text-white font-bold text-sm">{rewards?.gameTokens || 0}</p>
            <p className="text-white/40 text-[10px]">Tokens</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-white/5 rounded-2xl p-1 border border-white/10">
          {([
            { key: "quran" as DashboardTab, icon: <BookOpen className="w-4 h-4" />, label: "Quraan" },
            { key: "games" as DashboardTab, icon: <Gamepad2 className="w-4 h-4" />, label: "Ciyaaro" },
            { key: "rewards" as DashboardTab, icon: <Award className="w-4 h-4" />, label: "Hadiyad" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e]"
                  : "text-white/40 hover:text-white/70"
              }`}
              data-testid={`tab-${tab.key}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 pb-24">

        {/* Quraan tab */}
        {activeTab === "quran" && (
          <>
            {loadingSurahs ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 border-4 border-[#FFD93D]/20 border-t-[#FFD93D] rounded-full animate-spin" />
              </div>
            ) : surahs.length === 0 ? (
              <div className="text-center py-16 text-white/40">
                <p>Suuradaha la heli waayey</p>
              </div>
            ) : (
              <div className="space-y-3">
                {surahs.map((surah, idx) => {
                  const isLocked = !surah.unlocked;
                  return (
                    <div
                      key={surah.number}
                      onClick={() => !isLocked && setLocation(`/quran-lesson/${surah.number}`)}
                      className={`bg-white/5 backdrop-blur-sm rounded-3xl p-5 border-2 transition-all ${
                        surah.completed
                          ? "border-green-500/30"
                          : isLocked
                          ? "border-white/5 opacity-40"
                          : "border-[#FFD93D]/20 hover:border-[#FFD93D]/40 hover:bg-white/10 cursor-pointer active:scale-[0.97]"
                      }`}
                      data-testid={`card-surah-${surah.number}`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-base shrink-0 ${
                            surah.completed
                              ? "bg-green-500/30 text-green-300 border-2 border-green-500/50"
                              : isLocked
                              ? "bg-white/10 text-white/30"
                              : "bg-gradient-to-br from-[#FFD93D] to-[#FFA502] text-[#1a1a2e]"
                          }`}
                        >
                          {surah.completed ? (
                            <CheckCircle2 className="w-7 h-7" />
                          ) : isLocked ? (
                            <Lock className="w-6 h-6" />
                          ) : (
                            idx + 1
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-bold text-base">{surah.englishName}</h4>
                          <p className="text-white/40 text-sm font-['Amiri',_serif]" dir="rtl">{surah.name}</p>
                          {surah.progressPercent > 0 && !surah.completed && (
                            <div className="mt-2">
                              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-[#FFD93D] to-[#FFA502] rounded-full transition-all"
                                  style={{ width: `${surah.progressPercent}%` }}
                                />
                              </div>
                              <p className="text-white/30 text-xs mt-1">
                                {surah.ayahsCompleted}/{surah.ayahCount} aayah
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="shrink-0">
                          {surah.completed ? (
                            <div className="flex gap-1">
                              {[1, 2, 3].map((i) => (
                                <Star key={i} className="w-5 h-5 text-[#FFD93D] fill-[#FFD93D]" />
                              ))}
                            </div>
                          ) : !isLocked ? (
                            <span className={`text-sm font-bold px-4 py-2 rounded-2xl ${
                              surah.progressPercent > 0
                                ? "bg-[#4ECDC4]/10 text-[#4ECDC4] border border-[#4ECDC4]/30"
                                : "bg-[#FFD93D]/10 text-[#FFD93D] border border-[#FFD93D]/30"
                            }`}>
                              {surah.progressPercent > 0 ? "Sii wad" : "Bilow"}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Games tab */}
        {activeTab === "games" && (
          <>
            <div className="mb-4">
              <h3 className="text-white font-bold text-lg flex items-center gap-2 mb-1">
                <Gamepad2 className="w-5 h-5 text-[#A855F7]" />
                Ciyaaraha Farxad leh
              </h3>
              <p className="text-white/40 text-xs">
                Ciyaaruhu waxay kuu furan yihiin markaa hal surah si fiican u barato oo dhammasyo.
              </p>
            </div>

            {unlockedGames.length === 0 ? (
              <div className="bg-white/5 rounded-2xl p-8 border border-white/10 text-center">
                <Lock className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <h4 className="text-white/60 font-semibold mb-2">Weli surah ma dhammaysid</h4>
                <p className="text-white/30 text-sm">
                  Marka surah la dhammeeyo ama 2+ aayah la dhammeeyo, ciyaaraha si toos ah bay u muuqanayaan.
                </p>
                <button
                  onClick={() => setActiveTab("quran")}
                  className="mt-4 bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] px-6 py-2 rounded-xl font-bold text-sm active:scale-95 transition-transform"
                  data-testid="button-go-quran"
                >
                  Casharrada Eeg 📖
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {unlockedGames.map((ug) => (
                  <div key={ug.surahNumber} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <h4 className="text-white font-semibold text-sm flex-1">{ug.surahName}</h4>
                      <div className="flex gap-0.5">
                        {[1, 2, 3].map((i) => (
                          <Star key={i} className={`w-3 h-3 ${i <= ug.starsEarned ? "text-[#FFD93D] fill-[#FFD93D]" : "text-white/10"}`} />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {ug.games.map((gameKey) => {
                        const info = GAME_INFO[gameKey];
                        if (!info) return null;
                        return (
                          <button
                            key={gameKey}
                            onClick={() => setLocation(`${GAME_ROUTES[gameKey]}/${ug.surahNumber}`)}
                            className="rounded-xl border border-white/10 bg-white/10 p-3 text-center transition-all hover:bg-white/15 active:scale-95"
                            data-testid={`game-${gameKey}-${ug.surahNumber}`}
                          >
                            <span className="text-2xl block mb-1">{info.emoji}</span>
                            <span className="text-white/70 text-[10px] font-medium block">{info.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Rewards tab */}
        {activeTab === "rewards" && (
          <>
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-[#FFD93D]" />
              Hadiyado
            </h3>

            {rewards?.streak && (
              <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-2xl p-4 border border-orange-500/20 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-400" />
                    <span className="text-white font-semibold text-sm">Streak</span>
                  </div>
                  {rewards.streak.multiplier > 1 && (
                    <span className="text-orange-400 text-xs font-bold bg-orange-500/20 px-2 py-0.5 rounded-full">
                      x{rewards.streak.multiplier} bonus!
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <p className="text-orange-400 text-2xl font-bold">{rewards.streak.current}</p>
                    <p className="text-white/40 text-[10px]">Hadda 🔥</p>
                  </div>
                  <div className="text-center">
                    <p className="text-yellow-400 text-2xl font-bold">{rewards.streak.best}</p>
                    <p className="text-white/40 text-[10px]">Ugu dheer 🏅</p>
                  </div>
                </div>
              </div>
            )}

            {rewards?.weeklyProgress && (
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-[#4ECDC4]" />
                  <span className="text-white/60 text-sm font-semibold">Usbuucan</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <p className="text-[#4ECDC4] text-xl font-bold">{rewards.weeklyProgress.gamesPlayed}</p>
                    <p className="text-white/40 text-[10px]">Ciyaaro</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[#FFD93D] text-xl font-bold">
                      {rewards.weeklyProgress.coinsEarned || rewards.weeklyProgress.starsEarned || 0}
                    </p>
                    <p className="text-white/40 text-[10px]">Coins hesho</p>
                  </div>
                </div>
              </div>
            )}

            {rewards?.badges && rewards.badges.length > 0 ? (
              <div className="mb-4">
                <h4 className="text-white/60 text-sm font-semibold mb-3">Badges-kaaga</h4>
                <div className="grid grid-cols-3 gap-3">
                  {rewards.badges.map((badge) => (
                    <div key={badge.key} className="bg-white/5 rounded-2xl p-3 text-center border border-white/10">
                      <span className="text-3xl block mb-1">{badge.icon}</span>
                      <p className="text-white/70 text-[10px] font-medium">{badge.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white/5 rounded-2xl p-8 border border-white/10 text-center">
                <Trophy className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">Sii wad barashada si aad u hesho hadiyad!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
