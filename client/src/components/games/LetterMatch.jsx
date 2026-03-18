import { useEffect, useMemo, useRef, useState } from "react";
import { calculateScore, getPerformanceLevel } from "../../utils/gameScoring";
import { isGameUnlocked } from "../../utils/unlock";

const LETTER_POOL = [
  { letter: "ا" },
  { letter: "ب" },
  { letter: "ت" },
  { letter: "ث" },
  { letter: "ج" },
  { letter: "ح" },
  { letter: "خ" },
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

export default function LetterMatch({ lesson = { completed: false, score: 0 }, level = "easy", onFinish }) {
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
  const audioRef = useRef(null);

  const finalScore = useMemo(() => calculateScore(points, maxPoints), [points, maxPoints]);
  const performance = useMemo(() => getPerformanceLevel(finalScore), [finalScore]);

  useEffect(() => {
    if (isFinished && !reportedRef.current) {
      reportedRef.current = true;
      if (typeof onFinish === "function") onFinish(finalScore);
    }
  }, [isFinished, finalScore, onFinish]);

  useEffect(() => {
    const prime = () => {
      if (audioRef.current) return;
      const audio = new Audio();
      audio.preload = "auto";
      audio.muted = true;
      audioRef.current = audio;
      const maybePromise = audio.play();
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = false;
          })
          .catch(() => {
            audio.muted = false;
          });
      }
      window.removeEventListener("touchstart", prime);
      window.removeEventListener("pointerdown", prime);
    };

    window.addEventListener("touchstart", prime, { passive: true });
    window.addEventListener("pointerdown", prime, { passive: true });
    return () => {
      window.removeEventListener("touchstart", prime);
      window.removeEventListener("pointerdown", prime);
    };
  }, []);

  function playAudio(letter) {
    if (!letter) return;
    const ttsUrl = `/api/alphabet/tts?letter=${encodeURIComponent(letter)}`;
    const audio = audioRef.current || new Audio();
    audioRef.current = audio;
    audio.src = ttsUrl;
    audio.preload = "auto";
    audio.load();
    audio.play().catch(() => {
      // Audio can fail in browsers without user interaction.
    });
  }

  function playQuestionAudio() {
    if (!currentRound) return;
    playAudio(currentRound.correctLetter.letter);
  }

  function handleSelect(letterObj) {
    if (!currentRound || showFeedback) return;

    playAudio(letterObj.letter);

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
    reportedRef.current = false;
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
          <p className="text-lg font-bold text-slate-700">Dhamee cashar leh 70% si loo furo</p>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-2xl font-black text-sky-800">Isku-aadi Xarafka</h3>
        <span className="text-sm font-bold text-slate-600">Heer: {level}</span>
      </div>

      {!isFinished ? (
        <>
          <p className="text-sm font-semibold text-slate-500 mb-3">Wareegga {roundIndex + 1} / {totalQuestions}</p>
          <button
            onClick={playQuestionAudio}
            onTouchStart={playQuestionAudio}
            className="mb-5 w-full rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-900 font-extrabold py-4 text-lg"
          >
            Dhageyso codka xarafka
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
                {selected === currentRound.correctLetter.letter ? "✔ Sax" : "✖ Qalad"}
              </p>
              <button
                onClick={nextRound}
                className="mt-3 rounded-xl bg-indigo-600 text-white font-bold px-5 py-3"
              >
                Xiga
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-2xl font-black text-slate-800">Natiijo: {finalScore}%</p>
          <p className="text-lg font-bold text-slate-600 mt-1">{performance}</p>
          <button onClick={restart} className="mt-4 rounded-xl bg-sky-600 text-white font-bold px-5 py-3">
            Mar kale ciyaar
          </button>
        </div>
      )}
    </div>
  );
}
