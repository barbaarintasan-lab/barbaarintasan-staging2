import { useChildAuth } from "@/contexts/ChildAuthContext";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Star,
  Trophy,
  Moon,
  Lock,
  CheckCircle2,
  LogOut,
  Gamepad2,
  Award,
  Users,
  Flame,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";

interface CurriculumSurah {
  number: number;
  name: string;
  englishName: string;
  ayahCount: number;
  difficulty: "easy" | "medium" | "hard";
  order: number;
  phase: number;
  unlocked: boolean;
  completed: boolean;
  ayahsCompleted: number;
  progressPercent: number;
}

const PHASE_INFO: Record<number, { somali: string; emoji: string }> = {
  1: { somali: "Bilowga", emoji: "🌱" },
  2: { somali: "Sii wadista", emoji: "🌿" },
  3: { somali: "Dhexe", emoji: "🌳" },
  4: { somali: "Kor u kaca", emoji: "🌟" },
  5: { somali: "Heer sare", emoji: "🏆" },
};

interface RewardsData {
  aayahStars: number;
  surahTrophies: number;
  gameCoins: number;
  gameTokens: number;
  gamesRemainingToday: number;
  maxGamesPerDay: number;
  badges: { key: string; name: string; icon: string; color: string; earnedAt: string }[];
  completedSurahs: number;
  gamesPlayed: number;
  streak: {
    current: number;
    best: number;
    multiplier: number;
    lastPlayDate: string | null;
  };
  weeklyProgress: {
    gamesPlayed: number;
    starsEarned: number;
    coinsEarned?: number;
  };
}

interface LeaderboardEntry {
  id: string;
  name: string;
  avatarColor: string;
  aayahStars: number;
  surahTrophies: number;
  gameCoins: number;
  totalScore: number;
  isCurrentChild: boolean;
  bestStreak: number;
  currentStreak: number;
  weeklyGames: number;
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

export default function QuranFolders() {
  const { child, isLoading, logout } = useChildAuth();
  const [, setLocation] = useLocation();
  const [curriculum, setCurriculum] = useState<CurriculumSurah[]>([]);
  const [loadingCurriculum, setLoadingCurriculum] = useState(true);
  const [rewards, setRewards] = useState<RewardsData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [unlockedGames, setUnlockedGames] = useState<UnlockedGame[]>([]);
  const [gameTokens, setGameTokens] = useState(0);
  const [activeTab, setActiveTab] = useState<DashboardTab>("quran");

  useEffect(() => {
    if (!isLoading && !child) setLocation("/child-login");
  }, [child, isLoading, setLocation]);

  useEffect(() => {
    if (!child) return;

    fetch("/api/quran/curriculum", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setCurriculum(data);
        setLoadingCurriculum(false);
      })
      .catch(() => setLoadingCurriculum(false));

    fetch("/api/quran/rewards", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setRewards(data);
      })
      .catch(() => {});

    fetch("/api/quran/leaderboard", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setLeaderboard(data);
      })
      .catch(() => {});

    fetch("/api/quran/games/available", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setUnlockedGames(data.unlockedGames || []);
          setGameTokens(data.tokensAvailable || 0);
        }
      })
      .catch(() => {});
  }, [child]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-[#FFD93D]/20 border-t-[#FFD93D] animate-spin" />
          <span className="text-2xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">⭐</span>
        </div>
        <p className="text-white/60 text-sm animate-pulse">Waa la soo dajinayaa...</p>
      </div>
    );
  }

  if (!child) return null;

  const handleLogout = async () => {
    await logout();
    setLocation("/child-login");
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] relative" data-testid="quran-folders">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
      </div>

      <div className="relative z-10 px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/child-dashboard")}
              className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/70 hover:bg-white/15 transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-[#1a1a2e] shadow-lg"
              style={{ backgroundColor: child.avatarColor ?? "#FFD93D" }}
              data-testid="text-child-avatar"
            >
              {child.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight" data-testid="text-child-name">
                Salaan, {child.name}! 👋
              </h2>
              <p className="text-white/50 text-xs">Maanta maxaad baran doontaa?</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {rewards?.streak && rewards.streak.current > 0 && (
              <div className="flex items-center gap-1 bg-orange-500/15 border border-orange-500/25 px-2.5 py-1.5 rounded-xl">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-orange-400 font-bold text-sm">{rewards.streak.current}</span>
                {rewards.streak.multiplier > 1 && (
                  <span className="text-orange-300 text-[10px] font-bold">x{rewards.streak.multiplier}</span>
                )}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-white/40 hover:text-white/70 p-2 transition-colors"
              data-testid="button-child-logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-2.5 text-center border border-white/10">
            <Star className="w-5 h-5 text-[#FFD93D] mx-auto mb-0.5" />
            <p className="text-white font-bold text-sm" data-testid="text-child-stars">{rewards?.aayahStars || 0}</p>
            <p className="text-white/40 text-[10px]">Xiddigaha</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-2.5 text-center border border-white/10">
            <Trophy className="w-5 h-5 text-[#FF6B6B] mx-auto mb-0.5" />
            <p className="text-white font-bold text-sm" data-testid="text-child-trophies">{rewards?.surahTrophies || 0}</p>
            <p className="text-white/40 text-[10px]">Surah</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-2.5 text-center border border-white/10">
            <span className="text-[#4ECDC4] text-lg block mx-auto mb-0.5">🪙</span>
            <p className="text-white font-bold text-sm" data-testid="text-child-coins">{rewards?.gameCoins || 0}</p>
            <p className="text-white/40 text-[10px]">Coins</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-2.5 text-center border border-white/10">
            <Gamepad2 className="w-5 h-5 text-[#A855F7] mx-auto mb-0.5" />
            <p className="text-white font-bold text-sm" data-testid="text-child-tokens">{gameTokens}</p>
            <p className="text-white/40 text-[10px]">Tokens</p>
          </div>
        </div>

        <div className="flex gap-1 bg-white/5 rounded-2xl p-1 border border-white/10">
          {(
            [
              { key: "quran" as DashboardTab, icon: <BookOpen className="w-4 h-4" />, label: "Quraan" },
              { key: "games" as DashboardTab, icon: <Gamepad2 className="w-4 h-4" />, label: "Ciyaaro" },
              { key: "rewards" as DashboardTab, icon: <Award className="w-4 h-4" />, label: "Hadiyad" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e]"
                  : "text-white/40"
              }`}
              data-testid={`tab-${tab.key}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 px-4 pb-24">
        {activeTab === "quran" && (
          <>
            <h3 className="text-white font-bold text-xl mb-5 flex items-center gap-2">
              <Moon className="w-6 h-6 text-[#FFD93D]" />
              Casharrada Quraanka
            </h3>

            {loadingCurriculum ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full border-4 border-[#FFD93D]/20 border-t-[#FFD93D] animate-spin" />
                  <Star className="w-5 h-5 text-[#FFD93D] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <p className="text-white/50 text-sm">Casharrada waa soo socda...</p>
              </div>
            ) : curriculum.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <BookOpen className="w-10 h-10 text-white/20" />
                <p className="text-white/50 text-sm text-center">Casharrada waa soo socda...</p>
                <button
                  onClick={() => {
                    setLoadingCurriculum(true);
                    fetch("/api/quran/curriculum", { credentials: "include" })
                      .then((r) => (r.ok ? r.json() : []))
                      .then((data) => {
                        if (Array.isArray(data)) setCurriculum(data);
                        setLoadingCurriculum(false);
                      })
                      .catch(() => setLoadingCurriculum(false));
                  }}
                  className="text-[#FFD93D] text-sm font-semibold underline"
                  data-testid="button-retry-curriculum"
                >
                  Dib u isku day
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const phases = new Map<number, CurriculumSurah[]>();
                  curriculum.forEach((s) => {
                    const p = s.phase || 1;
                    if (!phases.has(p)) phases.set(p, []);
                    phases.get(p)!.push(s);
                  });
                  const phaseEntries = Array.from(phases.entries()).sort((a, b) => a[0] - b[0]);
                  return phaseEntries.map(([phaseNum, surahs]) => {
                    const info = PHASE_INFO[phaseNum] || { somali: `Heerka ${phaseNum}`, emoji: "📖" };
                    const phaseCompleted = surahs.every((s) => s.completed);
                    const phaseCompletedCount = surahs.filter((s) => s.completed).length;
                    const phaseHasUnlocked = surahs.some((s) => s.unlocked);
                    const isFirstLockedPhase = !phaseHasUnlocked;
                    return (
                      <div key={phaseNum} className="mb-4" data-testid={`phase-${phaseNum}`}>
                        <div
                          className={`flex items-center gap-2 mb-3 px-1 ${isFirstLockedPhase ? "opacity-40" : ""}`}
                        >
                          <span className="text-xl">{info.emoji}</span>
                          <h4 className="text-white/70 font-bold text-sm flex-1">
                            Heerka {phaseNum}: {info.somali}
                          </h4>
                          {phaseCompleted ? (
                            <span className="text-green-400 text-xs font-bold bg-green-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Dhamaystay
                            </span>
                          ) : phaseHasUnlocked ? (
                            <span className="text-white/30 text-xs">
                              {phaseCompletedCount}/{surahs.length}
                            </span>
                          ) : null}
                        </div>
                        <div className="space-y-3">
                          {surahs.map((surah) => {
                            const isLocked = !surah.unlocked;
                            return (
                              <div
                                key={surah.number}
                                onClick={() => !isLocked && setLocation(`/quran-lesson/${surah.number}`)}
                                className={`bg-white/5 backdrop-blur-sm rounded-3xl p-5 border-2 ${
                                  surah.completed
                                    ? "border-green-500/30"
                                    : isLocked
                                    ? "border-white/5 opacity-40"
                                    : "border-[#FFD93D]/20 hover:border-[#FFD93D]/40 hover:bg-white/10 cursor-pointer active:scale-[0.97]"
                                } transition-all`}
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
                                      surah.order
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-bold text-base">{surah.englishName}</h4>
                                    <p className="text-white/40 text-sm">{surah.name}</p>
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
                                      <span
                                        className={`text-sm font-bold px-4 py-2 rounded-2xl ${
                                          surah.progressPercent > 0
                                            ? "bg-[#4ECDC4]/10 text-[#4ECDC4] border border-[#4ECDC4]/30"
                                            : "bg-[#FFD93D]/10 text-[#FFD93D] border border-[#FFD93D]/30"
                                        }`}
                                      >
                                        {surah.progressPercent > 0 ? "Sii wad" : "Bilow"}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </>
        )}

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

            <div className="mb-4 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
              <div className="flex items-center gap-3">
                <Gamepad2 className="h-5 w-5 shrink-0 text-green-400" />
                <div>
                  <p className="text-sm font-bold text-white">Ciyaaruhu waa furan yihiin</p>
                  <p className="text-[11px] text-white/40">
                    Token iyo xadka maalinlaha ah waa laga qaaday qaybta carruurta.
                  </p>
                </div>
              </div>
            </div>

            {unlockedGames.length === 0 ? (
              <div className="bg-white/5 rounded-2xl p-8 border border-white/10 text-center">
                <Lock className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <h4 className="text-white/60 font-semibold mb-2">Weli surah ma dhammaysid</h4>
                <p className="text-white/30 text-sm">
                  Marka hal surah la dhammeeyo, dhammaan ciyaaraha surad-daas si toos ah bay u muuqanayaan.
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
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i <= ug.starsEarned ? "text-[#FFD93D] fill-[#FFD93D]" : "text-white/10"
                            }`}
                          />
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
                <div className="mt-2 text-center">
                  <p className="text-white/30 text-[10px]">
                    {rewards.streak.current < 3
                      ? `${3 - rewards.streak.current} maalin oo kale = x1.2 bonus`
                      : rewards.streak.current < 7
                      ? `${7 - rewards.streak.current} maalin oo kale = x2 bonus`
                      : "x2 bonus active!"}
                  </p>
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

            {rewards?.badges && rewards.badges.length > 0 && (
              <div className="mb-6">
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
            )}

            {rewards?.badges?.length === 0 && (
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-center mb-6">
                <Award className="w-10 h-10 text-white/15 mx-auto mb-2" />
                <p className="text-white/40 text-sm">
                  Wali abaal-marin ma haysatid. Casharrada iyo ciyaaraha ku hel abaal-marin badan!
                </p>
              </div>
            )}

            {leaderboard.length > 1 && (
              <div className="mb-6">
                <h4 className="text-white/60 text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Tartanka Qoyska
                </h4>
                <div className="space-y-2">
                  {leaderboard.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className={`flex items-center gap-3 p-3 rounded-2xl border ${
                        entry.isCurrentChild
                          ? "bg-[#FFD93D]/10 border-[#FFD93D]/30"
                          : "bg-white/5 border-white/10"
                      }`}
                      data-testid={`leaderboard-entry-${idx}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          idx === 0 ? "bg-[#FFD93D] text-[#1a1a2e]" : "bg-white/10 text-white/50"
                        }`}
                      >
                        {idx === 0 ? "👑" : idx + 1}
                      </div>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-[#1a1a2e]"
                        style={{ backgroundColor: entry.avatarColor }}
                      >
                        {entry.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-sm font-semibold ${entry.isCurrentChild ? "text-[#FFD93D]" : "text-white/70"}`}
                        >
                          {entry.name} {entry.isCurrentChild && "(Adiga)"}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-white/40">
                          <span>⭐ {entry.aayahStars}</span>
                          <span>🏆 {entry.surahTrophies}</span>
                          <span>🪙 {entry.gameCoins}</span>
                          {entry.bestStreak > 0 && <span>🔥 {entry.bestStreak}</span>}
                          {entry.weeklyGames > 0 && <span>📊 {entry.weeklyGames}/w</span>}
                        </div>
                      </div>
                      <span className="text-white/50 font-bold text-sm">{entry.totalScore}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-white/60 text-sm font-semibold mb-3">Wadarta Guud ee dhibcahaaga</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
                  <p className="text-[#FFD93D] text-2xl font-bold">{rewards?.aayahStars || 0}</p>
                  <p className="text-white/40 text-xs mt-1">Aayad Xidig ⭐</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
                  <p className="text-[#FF6B6B] text-2xl font-bold">{rewards?.surahTrophies || 0}</p>
                  <p className="text-white/40 text-xs mt-1">Suradda Abaal-marin 🏆</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
                  <p className="text-[#4ECDC4] text-2xl font-bold">{rewards?.gameCoins || 0}</p>
                  <p className="text-white/40 text-xs mt-1">Game Coins 🪙</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
                  <p className="text-[#A855F7] text-2xl font-bold">{rewards?.gamesPlayed || 0}</p>
                  <p className="text-white/40 text-xs mt-1">Ciyaaro 🎮</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
