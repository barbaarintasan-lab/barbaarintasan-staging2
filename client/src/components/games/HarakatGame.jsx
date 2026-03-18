import { useEffect, useMemo, useRef, useState } from "react";
import { calculateScore, getPerformanceLevel } from "../../utils/gameScoring";
import { isGameUnlocked } from "../../utils/unlock";

const HARAKAT_OPTIONS = ["َ", "ِ", "ُ"]; // Fatha, Kasra, Damma
const LETTERS = ["ا", "ب", "ت", "ث", "ج", "ح", "خ", "د"];

const QUESTION_COUNT_BY_LEVEL = {
  easy: 5,
  medium: 8,
  hard: 10,
};

function buildRounds(level) {
  const totalQuestions = QUESTION_COUNT_BY_LEVEL[level] || QUESTION_COUNT_BY_LEVEL.easy;
  return Array.from({ length: totalQuestions }).map(() => {
    const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const correctHarakat = HARAKAT_OPTIONS[Math.floor(Math.random() * HARAKAT_OPTIONS.length)];
    return { letter, correctHarakat };
  });
}

export default function HarakatGame({ lesson = { completed: false, score: 0 }, level = "easy", onFinish }) {
  const unlocked = isGameUnlocked(lesson);
  const [rounds, setRounds] = useState(() => buildRounds(level));
  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [points, setPoints] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  const currentRound = rounds[roundIndex];
  const totalQuestions = rounds.length;
  const maxPoints = totalQuestions * 10;
  const isFinished = roundIndex >= totalQuestions;
  const reportedRef = useRef(false);

  const finalScore = useMemo(() => calculateScore(points, maxPoints), [points, maxPoints]);
  const performance = useMemo(() => getPerformanceLevel(finalScore), [finalScore]);

  useEffect(() => {
    if (isFinished && !reportedRef.current) {
      reportedRef.current = true;
      if (typeof onFinish === "function") onFinish(finalScore);
    }
  }, [isFinished, finalScore, onFinish]);

  function handleSelect(harakat) {
    if (!currentRound || showFeedback) return;
    setSelected(harakat);
    if (harakat === currentRound.correctHarakat) {
      setPoints((prev) => prev + 10);
    }
    setShowFeedback(true);
  }

  function nextRound() {
    if (!showFeedback) return;
    setSelected(null);
    setShowFeedback(false);
    setRoundIndex((prev) => prev + 1);
  }

  function restart() {
    reportedRef.current = false;
    setRounds(buildRounds(level));
    setRoundIndex(0);
    setSelected(null);
    setPoints(0);
    setShowFeedback(false);
  }

  return (
    <div className="relative rounded-3xl bg-white p-5 shadow-xl border border-emerald-100">
      {!unlocked && (
        <div className="absolute inset-0 z-10 bg-white/85 backdrop-blur-[1px] rounded-3xl flex items-center justify-center p-6 text-center">
          <p className="text-lg font-bold text-slate-700">Finish lesson with 70% to unlock</p>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-2xl font-black text-emerald-700">Harakat Game</h3>
        <span className="text-sm font-bold text-slate-600">Level: {level}</span>
      </div>

      {!isFinished ? (
        <>
          <p className="text-sm font-semibold text-slate-500 mb-2">Round {roundIndex + 1} / {totalQuestions}</p>
          <div className="mb-5 rounded-2xl bg-emerald-50 border-2 border-emerald-200 py-8 text-center">
            <p className="text-6xl md:text-7xl font-black text-slate-900" dir="rtl">{currentRound?.letter}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {HARAKAT_OPTIONS.map((mark) => {
              const isSelected = selected === mark;
              const isCorrect = mark === currentRound?.correctHarakat;

              let buttonClass = "bg-white border-slate-200";
              if (showFeedback && isCorrect) buttonClass = "bg-green-100 border-green-400";
              if (showFeedback && isSelected && !isCorrect) buttonClass = "bg-red-100 border-red-400";

              return (
                <button
                  key={mark}
                  onClick={() => handleSelect(mark)}
                  className={`rounded-2xl border-2 ${buttonClass} text-5xl font-black py-4`}
                >
                  {mark}
                </button>
              );
            })}
          </div>

          {showFeedback && (
            <div className="mt-5 text-center">
              <p className={`text-xl font-black ${selected === currentRound.correctHarakat ? "text-green-600" : "text-red-600"}`}>
                {selected === currentRound.correctHarakat ? "✔ Correct" : "✖ Wrong"}
              </p>
              <button onClick={nextRound} className="mt-3 rounded-xl bg-indigo-600 text-white font-bold px-5 py-3">
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-2xl font-black text-slate-800">Score: {finalScore}%</p>
          <p className="text-lg font-bold text-slate-600 mt-1">{performance}</p>
          <button onClick={restart} className="mt-4 rounded-xl bg-emerald-600 text-white font-bold px-5 py-3">
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
