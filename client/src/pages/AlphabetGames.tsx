import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import LetterMatch from "@/components/games/LetterMatch";
import HarakatGame from "@/components/games/HarakatGame";
import WordBuilder from "@/components/games/WordBuilder";

type GameKey = "letter_match" | "harakat" | "word_builder";

export default function AlphabetGames() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<GameKey>("letter_match");
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [lessonUnlockScore, setLessonUnlockScore] = useState(0);
  const [gamesUnlocked, setGamesUnlocked] = useState(false);
  const [scores, setScores] = useState<Record<GameKey, number>>({
    letter_match: 0,
    harakat: 0,
    word_builder: 0,
  });

  useEffect(() => {
    fetch("/api/quran/alphabet/progress", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const summary = data?.summary;
        setGamesUnlocked(!!summary?.gamesUnlocked);
        setLessonUnlockScore(Number(summary?.bestLessonScore || 0));
      })
      .catch(() => {
        setGamesUnlocked(false);
        setLessonUnlockScore(0);
      })
      .finally(() => setLoadingProgress(false));
  }, []);

  const unlocked = useMemo(() => {
    return {
      letter_match: gamesUnlocked,
      harakat: gamesUnlocked,
      word_builder: gamesUnlocked,
    };
  }, [gamesUnlocked]);

  function handleScore(game: GameKey, value: number) {
    setScores((prev) => ({ ...prev, [game]: Math.max(prev[game], value) }));
    const gameTypeMap: Record<GameKey, "matching" | "tracing" | "quiz"> = {
      letter_match: "matching",
      harakat: "tracing",
      word_builder: "quiz",
    };

    fetch("/api/quran/alphabet/games/score", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameType: gameTypeMap[game],
        phase: 1,
        score: value,
      }),
    }).catch(() => {
      // non-blocking: local score still updates
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-cyan-50 p-4 pb-24">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-slate-800">Alphabet Games</h1>
          <button onClick={() => setLocation("/alphabet-lesson")} className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-sm">
            Back to lesson
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          {loadingProgress ? "Checking lesson progress..." : gamesUnlocked ? `Games unlocked. Best lesson score: ${lessonUnlockScore}%` : `Finish a lesson with 70% to unlock games. Current best: ${lessonUnlockScore}%`}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-5">
          <button
            className={`px-3 py-3 rounded-xl font-bold ${selected === "letter_match" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-900"} ${!unlocked.letter_match ? "opacity-50" : ""}`}
            onClick={() => unlocked.letter_match && setSelected("letter_match")}
          >
            Letter Match ({scores.letter_match}%) {unlocked.letter_match ? "" : "LOCKED"}
          </button>

          <button
            className={`px-3 py-3 rounded-xl font-bold ${selected === "harakat" ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-900"} ${!unlocked.harakat ? "opacity-50" : ""}`}
            onClick={() => unlocked.harakat && setSelected("harakat")}
          >
            Harakat ({scores.harakat}%) {unlocked.harakat ? "" : "LOCKED"}
          </button>

          <button
            className={`px-3 py-3 rounded-xl font-bold ${selected === "word_builder" ? "bg-violet-600 text-white" : "bg-violet-100 text-violet-900"} ${!unlocked.word_builder ? "opacity-50" : ""}`}
            onClick={() => unlocked.word_builder && setSelected("word_builder")}
          >
            Word Builder ({scores.word_builder}%) {unlocked.word_builder ? "" : "LOCKED"}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
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
        </div>
      </div>
    </div>
  );
}
