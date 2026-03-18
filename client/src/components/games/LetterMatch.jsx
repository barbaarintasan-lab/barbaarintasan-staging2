import { useMemo, useState } from "react";
import { calculateScore, getPerformanceLevel } from "../../utils/gameScoring";
import { isGameUnlocked } from "../../utils/unlock";

const LETTER_POOL = [
  { letter: "ا", audio: "/audio/alphabet/alif.mp3" },
  { letter: "ب", audio: "/audio/alphabet/baa.mp3" },
  { letter: "ت", audio: "/audio/alphabet/taa.mp3" },
  { letter: "ث", audio: "/audio/alphabet/thaa.mp3" },
  { letter: "ج", audio: "/audio/alphabet/jeem.mp3" },
  { letter: "ح", audio: "/audio/alphabet/haa.mp3" },
  { letter: "خ", audio: "/audio/alphabet/khaa.mp3" },
];

const QUESTION_COUNT_BY_LEVEL = {
  easy: 5,
  medium: 8,
  hard: 10,
};

function pickRoundLetters(pool, count) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function buildRounds(level) {
  const totalQuestions = QUESTION_COUNT_BY_LEVEL[level] || QUESTION_COUNT_BY_LEVEL.easy;
  return Array.from({ length: totalQuestions }).map(() => {
    const options = pickRoundLetters(LETTER_POOL, 3);
    const correctIndex = Math.floor(Math.random() * options.length);
    return {
      options,
      correctLetter: options[correctIndex],
    };
  });
}

export default function LetterMatch({ lesson = { completed: false, score: 0 }, level = "easy" }) {
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

  const finalScore = useMemo(() => calculateScore(points, maxPoints), [points, maxPoints]);
  const performance = useMemo(() => getPerformanceLevel(finalScore), [finalScore]);

  function playAudio() {
    if (!currentRound) return;
    const audio = new Audio(currentRound.correctLetter.audio);
    audio.play().catch(() => {
      // Audio can fail in browsers without user interaction.
    });
  }

  function handleSelect(letterObj) {
    if (!currentRound || showFeedback) return;

    setSelected(letterObj.letter);
    const correct = letterObj.letter === currentRound.correctLetter.letter;
    if (correct) {
      setPoints((prev) => prev + 10);
    }
    setShowFeedback(true);
  }

  function nextRound() {
    if (!showFeedback) return;
    setShowFeedback(false);
    setSelected(null);
    setRoundIndex((prev) => prev + 1);
  }

  function restart() {
    setRounds(buildRounds(level));
    setRoundIndex(0);
    setSelected(null);
    setPoints(0);
    setShowFeedback(false);
  }

  return (
    <div className="relative rounded-3xl bg-white p-5 shadow-xl border border-sky-100">
      {!unlocked && (
        <div className="absolute inset-0 z-10 bg-white/85 backdrop-blur-[1px] rounded-3xl flex items-center justify-center p-6 text-center">
          <p className="text-lg font-bold text-slate-700">Finish lesson with 70% to unlock</p>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-2xl font-black text-sky-800">Letter Match</h3>
        <span className="text-sm font-bold text-slate-600">Level: {level}</span>
      </div>

      {!isFinished ? (
        <>
          <p className="text-sm font-semibold text-slate-500 mb-3">Round {roundIndex + 1} / {totalQuestions}</p>
          <button
            onClick={playAudio}
            className="mb-5 w-full rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-900 font-extrabold py-4 text-lg"
          >
            Play Letter Audio
          </button>

          <div className="grid grid-cols-3 gap-3">
            {currentRound?.options.map((item) => {
              const isSelected = selected === item.letter;
              const isCorrect = item.letter === currentRound.correctLetter.letter;

              let buttonClass = "bg-sky-50 border-sky-200";
              if (showFeedback && isCorrect) buttonClass = "bg-green-100 border-green-400";
              if (showFeedback && isSelected && !isCorrect) buttonClass = "bg-red-100 border-red-400";

              return (
                <button
                  key={item.letter}
                  onClick={() => handleSelect(item)}
                  className={`rounded-2xl border-2 ${buttonClass} text-4xl md:text-5xl font-black py-6 transition-all`}
                >
                  {item.letter}
                </button>
              );
            })}
          </div>

          {showFeedback && (
            <div className="mt-5 text-center">
              <p className={`text-xl font-black ${selected === currentRound.correctLetter.letter ? "text-green-600" : "text-red-600"}`}>
                {selected === currentRound.correctLetter.letter ? "✔ Correct" : "✖ Wrong"}
              </p>
              <button
                onClick={nextRound}
                className="mt-3 rounded-xl bg-indigo-600 text-white font-bold px-5 py-3"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-2xl font-black text-slate-800">Score: {finalScore}%</p>
          <p className="text-lg font-bold text-slate-600 mt-1">{performance}</p>
          <button onClick={restart} className="mt-4 rounded-xl bg-sky-600 text-white font-bold px-5 py-3">
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
