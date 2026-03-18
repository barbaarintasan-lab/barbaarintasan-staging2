import { useEffect, useMemo, useRef, useState } from "react";
import { calculateScore, getPerformanceLevel } from "../../utils/gameScoring";
import { isGameUnlocked } from "../../utils/unlock";

const WORDS = ["الله", "باب", "بيت", "نور", "كتاب"];

const QUESTION_COUNT_BY_LEVEL = {
  easy: 4,
  medium: 6,
  hard: 8,
};

function splitWord(word) {
  return Array.from(word);
}

function shuffleLetters(letters) {
  const arr = [...letters];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildRounds(level) {
  const totalQuestions = QUESTION_COUNT_BY_LEVEL[level] || QUESTION_COUNT_BY_LEVEL.easy;
  return Array.from({ length: totalQuestions }).map(() => {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    const letters = splitWord(word);
    return {
      word,
      letters,
      shuffledLetters: shuffleLetters(letters),
    };
  });
}

export default function WordBuilder({ lesson = { completed: false, score: 0 }, level = "easy", onFinish }) {
  const unlocked = isGameUnlocked(lesson);
  const [rounds, setRounds] = useState(() => buildRounds(level));
  const [roundIndex, setRoundIndex] = useState(0);
  const [userOrder, setUserOrder] = useState([]);
  const [points, setPoints] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);

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

  function handleDragDrop(fromIndex, toIndex) {
    if (!currentRound) return;
    const next = [...userOrder];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setUserOrder(next);
  }

  function addLetter(letter, sourceIndex) {
    if (feedback) return;
    const source = [...currentRound.shuffledLetters];
    source.splice(sourceIndex, 1);

    const nextRound = { ...currentRound, shuffledLetters: source };
    const nextRounds = [...rounds];
    nextRounds[roundIndex] = nextRound;

    setRounds(nextRounds);
    setUserOrder((prev) => [...prev, letter]);
  }

  function removeLetter(index) {
    if (feedback) return;
    const removed = userOrder[index];
    const nextOrder = [...userOrder];
    nextOrder.splice(index, 1);

    const nextRound = { ...currentRound, shuffledLetters: [...currentRound.shuffledLetters, removed] };
    const nextRounds = [...rounds];
    nextRounds[roundIndex] = nextRound;

    setRounds(nextRounds);
    setUserOrder(nextOrder);
  }

  function checkAnswer() {
    if (!currentRound) return;
    const builtWord = userOrder.join("");
    const correct = builtWord === currentRound.word;
    if (correct) {
      setPoints((prev) => prev + 10);
    }
    setFeedback(correct ? "correct" : "wrong");
  }

  function nextRound() {
    setFeedback(null);
    setUserOrder([]);
    setSelectedIndex(null);
    setRoundIndex((prev) => prev + 1);
  }

  function restart() {
    reportedRef.current = false;
    setRounds(buildRounds(level));
    setRoundIndex(0);
    setUserOrder([]);
    setPoints(0);
    setFeedback(null);
    setSelectedIndex(null);
  }

  return (
    <div className="relative rounded-3xl bg-white p-5 shadow-xl border border-purple-100">
      {!unlocked && (
        <div className="absolute inset-0 z-10 bg-white/85 backdrop-blur-[1px] rounded-3xl flex items-center justify-center p-6 text-center">
          <p className="text-lg font-bold text-slate-700">Finish lesson with 70% to unlock</p>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-2xl font-black text-purple-700">Word Builder</h3>
        <span className="text-sm font-bold text-slate-600">Level: {level}</span>
      </div>

      {!isFinished ? (
        <>
          <p className="text-sm font-semibold text-slate-500 mb-2">Round {roundIndex + 1} / {totalQuestions}</p>
          <p className="text-sm font-semibold text-slate-500 mb-3">Build this word</p>

          <div className="mb-4 rounded-2xl border-2 border-purple-200 bg-purple-50 py-4 px-3" dir="rtl">
            <p className="text-4xl md:text-5xl font-black text-slate-900 text-center tracking-wide">{currentRound?.word}</p>
          </div>

          <div className="mb-4 rounded-2xl border-2 border-slate-200 bg-slate-50 p-3 min-h-[86px]" dir="rtl">
            <div className="flex flex-wrap gap-2 justify-center">
              {userOrder.length === 0 && <p className="text-slate-400 font-semibold">Tap letters below</p>}
              {userOrder.map((letter, i) => (
                <button
                  key={`${letter}-${i}`}
                  onClick={() => removeLetter(i)}
                  onDragStart={() => setSelectedIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (selectedIndex === null || selectedIndex === i) return;
                    handleDragDrop(selectedIndex, i);
                    setSelectedIndex(null);
                  }}
                  draggable
                  className="rounded-xl bg-white border-2 border-purple-300 px-4 py-2 text-3xl font-black"
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4" dir="rtl">
            <div className="flex flex-wrap gap-2 justify-center">
              {currentRound?.shuffledLetters.map((letter, i) => (
                <button
                  key={`${letter}-${i}`}
                  onClick={() => addLetter(letter, i)}
                  className="rounded-xl bg-indigo-100 border-2 border-indigo-300 px-4 py-2 text-3xl font-black"
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button onClick={checkAnswer} className="rounded-xl bg-purple-600 text-white font-bold px-5 py-3">
              Check
            </button>
            {feedback && (
              <p className={`text-xl font-black ${feedback === "correct" ? "text-green-600" : "text-red-600"}`}>
                {feedback === "correct" ? "✔ Correct" : "✖ Wrong"}
              </p>
            )}
          </div>

          {feedback && (
            <div className="mt-4 text-center">
              <button onClick={nextRound} className="rounded-xl bg-indigo-600 text-white font-bold px-5 py-3">
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-2xl font-black text-slate-800">Score: {finalScore}%</p>
          <p className="text-lg font-bold text-slate-600 mt-1">{performance}</p>
          <button onClick={restart} className="mt-4 rounded-xl bg-purple-600 text-white font-bold px-5 py-3">
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
