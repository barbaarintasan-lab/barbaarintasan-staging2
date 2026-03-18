import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import LetterMatch from "@/components/games/LetterMatch";
import HarakatGame from "@/components/games/HarakatGame";
import WordBuilder from "@/components/games/WordBuilder";

type GameKey = "letter_match" | "harakat" | "word_builder";

const GAME_INFO = [
  {
    key: "letter_match" as GameKey,
    icon: "🔤",
    title: "Isku-aadi Xarafka",
    desc: "Raadi xarfaha la mid ah",
    color: "#4ECDC4",
    gradient: "from-[#0f3460] to-[#16213e]",
  },
  {
    key: "harakat" as GameKey,
    icon: "✨",
    title: "Xarakaat",
    desc: "Baax, kasra, damma",
    color: "#96CEB4",
    gradient: "from-[#1a3a2a] to-[#0d1f15]",
  },
  {
    key: "word_builder" as GameKey,
    icon: "🧩",
    title: "Dhis Ereyga",
    desc: "Kala saar xuruufta",
    color: "#FECA57",
    gradient: "from-[#2d1f00] to-[#1a1200]",
  },
];

export default function AlphabetGames() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<GameKey>("letter_match");
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [lessonUnlockScore, setLessonUnlockScore] = useState(0);
  const [gamesUnlocked, setGamesUnlocked] = useState(false);
  const [scores, setScores] = useState<Record<GameKey, number>>({
    letter_match: 0, harakat: 0, word_builder: 0,
  });

  useEffect(() => {
    fetch("/api/quran/alphabet/progress", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const summary = data?.summary;
        setGamesUnlocked(!!summary?.gamesUnlocked);
        setLessonUnlockScore(Number(summary?.bestLessonScore || 0));
      })
      .catch(() => { setGamesUnlocked(false); setLessonUnlockScore(0); })
      .finally(() => setLoadingProgress(false));
  }, []);

  const unlocked = useMemo(() => ({
    letter_match: gamesUnlocked,
    harakat: gamesUnlocked,
    word_builder: gamesUnlocked,
  }), [gamesUnlocked]);

  function goBack() {
    if (window.history.length > 1) window.history.back();
    else setLocation("/alphabet-lesson");
  }

  function handleScore(game: GameKey, value: number) {
    setScores((prev) => ({ ...prev, [game]: Math.max(prev[game], value) }));
    const gameTypeMap: Record<GameKey, "matching" | "tracing" | "quiz"> = {
      letter_match: "matching", harakat: "tracing", word_builder: "quiz",
    };
    fetch("/api/quran/alphabet/games/score", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameType: gameTypeMap[game], phase: 1, score: value }),
    }).catch(() => {});
  }

  const selectedGame = GAME_INFO.find(g => g.key === selected)!;

  return (
    <div className="min-h-screen bg-[#1a1a2e] relative overflow-hidden pb-10">
      {Array.from({ length: 15 }).map((_, i) => (
        <div key={i} className="absolute rounded-full bg-white animate-pulse pointer-events-none"
          style={{
            width: `${Math.random() * 2.5 + 1}px`,
            height: `${Math.random() * 2.5 + 1}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${Math.random() * 2 + 2}s`,
            opacity: Math.random() * 0.5 + 0.15,
          }}
        />
      ))}

      <div className="relative z-10 max-w-md mx-auto px-4 pt-5">
        <div className="flex items-center justify-between mb-6">
          <button onClick={goBack}
            className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold"
            data-testid="btn-back-games">
            ←
          </button>
          <div className="text-center">
            <h1 className="text-white font-black text-lg">🎮 Ciyaaraha Alifka</h1>
            <p className="text-white/40 text-xs">Baro iyoo ciyaarsoho</p>
          </div>
          <button onClick={() => setLocation("/alphabet-lesson")}
            className="px-3 py-2 rounded-2xl bg-purple-500/20 border border-purple-400/30 text-purple-300 font-bold text-xs"
            data-testid="btn-go-lesson">
            ✏️ Cashar
          </button>
        </div>

        {!loadingProgress && !gamesUnlocked && (
          <div className="mb-5 rounded-3xl p-5 bg-amber-500/10 border border-amber-400/25 text-center">
            <div className="text-4xl mb-2">🔒</div>
            <p className="text-amber-300 font-black text-base mb-1">Ciyaaraha wali xiran yihiin</p>
            <p className="text-amber-300/60 text-sm">
              Dhamee xaraf leh 60%+ si ciyaaruhu u furmaan
            </p>
            <div className="mt-3 rounded-full bg-white/10 h-2 overflow-hidden">
              <div className="h-full rounded-full bg-amber-400 transition-all"
                style={{ width: `${Math.min(lessonUnlockScore, 100)}%` }} />
            </div>
            <p className="text-amber-300/40 text-xs mt-1">{lessonUnlockScore}% / 60%</p>
          </div>
        )}

        {!loadingProgress && gamesUnlocked && (
          <div className="mb-5 rounded-3xl p-4 bg-green-500/10 border border-green-400/25 text-center">
            <p className="text-green-300 font-black">🎉 Ciyaaraha waa furmeen!</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-5">
          {GAME_INFO.map((g) => {
            const isActive = selected === g.key;
            const isLocked = !unlocked[g.key];
            return (
              <button key={g.key}
                className={`rounded-2xl p-3 text-center transition-all active:scale-95 border ${
                  isActive
                    ? "border-white/30 scale-105"
                    : "border-white/10"
                } ${isLocked ? "opacity-40" : ""}`}
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, ${g.color}30, ${g.color}10)`
                    : "rgba(255,255,255,0.05)",
                }}
                onClick={() => !isLocked && setSelected(g.key)}
                data-testid={`btn-game-${g.key}`}>
                <div className="text-2xl mb-1">{g.icon}</div>
                <p className="text-xs font-bold leading-tight"
                  style={{ color: isActive ? g.color : "rgba(255,255,255,0.5)" }}>
                  {g.title}
                </p>
                {scores[g.key] > 0 && (
                  <p className="text-[10px] mt-0.5" style={{ color: g.color + "80" }}>
                    {scores[g.key]}%
                  </p>
                )}
                {isLocked && <p className="text-[10px] text-white/30 mt-0.5">🔒 Xiran</p>}
              </button>
            );
          })}
        </div>

        <div className="rounded-3xl overflow-hidden border border-white/10"
          style={{ background: `linear-gradient(135deg, ${selectedGame.color}08, rgba(255,255,255,0.02))` }}>
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <span className="text-xl">{selectedGame.icon}</span>
            <span className="text-white font-black">{selectedGame.title}</span>
            <span className="text-white/40 text-sm">— {selectedGame.desc}</span>
          </div>
          <div className="p-4">
            {selected === "letter_match" && (
              <LetterMatch
                lesson={{ completed: unlocked.letter_match, score: lessonUnlockScore }}
                onFinish={(score: number) => handleScore("letter_match", score)}
              />
            )}
            {selected === "harakat" && unlocked.harakat && (
              <HarakatGame
                lesson={{ completed: unlocked.harakat, score: lessonUnlockScore }}
                onFinish={(score: number) => handleScore("harakat", score)}
              />
            )}
            {selected === "word_builder" && unlocked.word_builder && (
              <WordBuilder
                lesson={{ completed: unlocked.word_builder, score: lessonUnlockScore }}
                onFinish={(score: number) => handleScore("word_builder", score)}
              />
            )}
            {!unlocked[selected] && (
              <div className="py-12 text-center">
                <div className="text-6xl mb-4">🔒</div>
                <p className="text-white/40 font-bold">Ciyaartaan wali xidhan tahay</p>
                <button onClick={() => setLocation("/alphabet-lesson")}
                  className="mt-4 px-6 py-3 rounded-2xl font-bold text-slate-900 text-sm"
                  style={{ backgroundColor: selectedGame.color }}>
                  Baro casharada ✏️
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
