import { useState, useEffect } from "react";
import { useChildAuth } from "@/contexts/ChildAuthContext";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Star, Zap, Loader2, XCircle, CheckCircle2, Timer, Flame } from "lucide-react";
import CelebrationModal, { useCelebration } from "@/components/CelebrationModal";

interface QuizQuestion {
  type: string;
  question: string;
  ayahText?: string;
  correctAnswer: string;
  options: string[];
}

export default function QuranSurahQuiz() {
  const { child } = useChildAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ surahNumber: string }>();
  const surahNumber = parseInt(params.surahNumber || "1");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [surahName, setSurahName] = useState("");
  const [englishName, setEnglishName] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(15);
  const [totalTime, setTotalTime] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [comboAnimation, setComboAnimation] = useState(false);
  const { celebrationState, celebrate, closeCelebration } = useCelebration();

  useEffect(() => {
    if (!child) return;
    fetch(`/api/quran/games/data/surah_quiz/${surahNumber}`, { credentials: "include" })
      .then(r => {
        if (!r.ok) return r.json().then(d => { throw new Error(d.error); });
        return r.json();
      })
      .then(data => {
        setSurahName(data.surahName);
        setEnglishName(data.englishName);
        setQuestions(data.questions);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [child, surahNumber]);

  useEffect(() => {
    if (!gameStarted || gameOver || showResult) return;
    const timer = setInterval(() => {
      setQuestionTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
      setTotalTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [gameStarted, gameOver, showResult, currentQuestion]);

  const handleTimeout = () => {
    setSelectedAnswer(null);
    setShowResult(true);
    setStreak(0);
  };

  const getStreakMultiplier = (s: number) => {
    if (s >= 5) return 3;
    if (s >= 3) return 2;
    return 1;
  };

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    setSelectedAnswer(answer);
    setShowResult(true);

    const isCorrect = answer === questions[currentQuestion].correctAnswer;
    if (isCorrect) {
      const newStreak = streak + 1;
      const multiplier = getStreakMultiplier(newStreak);
      const basePoints = 10;
      const timeBonus = questionTimeLeft > 10 ? 3 : questionTimeLeft > 5 ? 1 : 0;
      const points = (basePoints + timeBonus) * multiplier;
      setScore(prev => prev + points);
      setStreak(newStreak);
      setBestStreak(b => Math.max(b, newStreak));
      if (newStreak >= 3) {
        setComboAnimation(true);
        setTimeout(() => setComboAnimation(false), 1000);
      }
    } else {
      setStreak(0);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion + 1 >= questions.length) {
      setGameOver(true);
    } else {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setQuestionTimeLeft(15);
    }
  };

  const maxScore = questions.length * 39;

  const saveScore = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/quran/games/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ gameType: "surah_quiz", surahNumber, score, maxScore, timeSpentSeconds: totalTime }),
      });
      const data = await res.json();
      if (!res.ok) {
        celebrate("lesson_complete", "Khalad!", data.error || "Dhibcaha lama keydsan karin", { subtitle: englishName });
        setSaving(false);
        return;
      }
      const streakText = data.streakMultiplier > 1 ? `\n🔥 Streak x${data.streakMultiplier}!` : "";
      if (data.coinsEarned > 0) {
        celebrate("quiz_perfect", "Aayah Stars!", `Waxaad heshay ${data.coinsEarned} coins! 🪙${streakText}\nDhibcahaagu waa ${score}/${maxScore}`, { subtitle: englishName });
      } else {
        celebrate("lesson_complete", "Ciyaarta way dhammaatay!", `Dhibcahaagu waa ${score}/${maxScore}`, { subtitle: englishName });
      }
    } catch {}
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FFD93D] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center px-4">
        <XCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-white/70 text-center mb-4">{error}</p>
        <button onClick={() => setLocation(`/quran-lesson/${surahNumber}`)} className="bg-[#FFD93D] text-[#1a1a2e] px-6 py-2 rounded-xl font-bold" data-testid="button-back-dashboard">
          Ku noqo Dashboard
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center px-4">
        <XCircle className="w-12 h-12 text-orange-400 mb-4" />
        <p className="text-white/70 text-center mb-2">Su'aalo weli lama helin.</p>
        <p className="text-white/40 text-sm text-center mb-5">Fadlan isku day mar kale daqiiqad kadib.</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] px-6 py-2 rounded-xl font-bold"
            data-testid="button-retry-load"
          >
            Isku day mar kale
          </button>
          <button
            onClick={() => setLocation(`/quran-lesson/${surahNumber}`)}
            className="bg-white/10 text-white/80 px-6 py-2 rounded-xl font-bold border border-white/15"
            data-testid="button-empty-back"
          >
            Ku noqo Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center px-4">
        <div className="text-6xl mb-6">⚡</div>
        <h1 className="text-white text-2xl font-bold mb-2">Surah Quiz</h1>
        <p className="text-white/50 text-sm mb-2">{englishName} - {surahName}</p>
        <p className="text-white/40 text-xs text-center mb-8 max-w-xs">
          Aayada fiiri oo ka jawaab! Streak-ka wuxuu labanlaabaa dhibcaha!
        </p>
        <div className="flex gap-4 mb-8">
          <div className="bg-white/5 rounded-xl px-4 py-2 text-center border border-white/10">
            <Timer className="w-5 h-5 text-[#FF6B6B] mx-auto mb-1" />
            <p className="text-white/50 text-[10px]">15s / su'aal</p>
          </div>
          <div className="bg-white/5 rounded-xl px-4 py-2 text-center border border-white/10">
            <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
            <p className="text-white/50 text-[10px]">x2 x3 combo</p>
          </div>
          <div className="bg-white/5 rounded-xl px-4 py-2 text-center border border-white/10">
            <Star className="w-5 h-5 text-[#4ECDC4] mx-auto mb-1" />
            <p className="text-white/50 text-[10px]">{questions.length} su'aal</p>
          </div>
        </div>
        <button onClick={() => setGameStarted(true)} className="bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] px-8 py-3 rounded-2xl font-bold text-lg active:scale-95 transition-transform" data-testid="button-start-game">
          Bilow Quiz ⚡
        </button>
        <button onClick={() => setLocation(`/quran-lesson/${surahNumber}`)} className="text-white/30 mt-4 text-sm" data-testid="button-back">
          ← Ku noqo
        </button>
      </div>
    );
  }

  if (gameOver) {
    const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center px-4">
        <div className="text-6xl mb-4">{percent >= 80 ? "🏆" : percent >= 50 ? "⚡" : "📖"}</div>
        <h2 className="text-white text-2xl font-bold mb-2">Quiz dhammaatay!</h2>
        <p className="text-white/60 mb-6">{englishName}</p>
        <div className="bg-white/5 rounded-2xl p-6 w-full max-w-xs border border-white/10 mb-6">
          <div className="flex justify-between mb-3">
            <span className="text-white/50">Dhibcaha</span>
            <span className="text-[#FFD93D] font-bold">{score}/{maxScore}</span>
          </div>
          <div className="flex justify-between mb-3">
            <span className="text-white/50">Streak ugu dheer</span>
            <span className="text-orange-400 font-bold">{bestStreak} 🔥</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Wakhti</span>
            <span className="text-white/70 font-bold">{totalTime}s</span>
          </div>
        </div>
        <button onClick={saveScore} disabled={saving} className="bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] px-8 py-3 rounded-2xl font-bold mb-3 w-full max-w-xs active:scale-95 transition-transform disabled:opacity-50" data-testid="button-save-score">
          {saving ? "Kaydinayaa..." : "Kaydi Dhibcaha ⭐"}
        </button>
        <button onClick={() => setLocation(`/quran-lesson/${surahNumber}`)} className="text-white/40 text-sm" data-testid="button-finish">
          Ku noqo Dashboard
        </button>
        <CelebrationModal {...celebrationState} onClose={closeCelebration} />
      </div>
    );
  }

  const q = questions[currentQuestion];
  const timerPercent = (questionTimeLeft / 15) * 100;
  const currentMultiplier = getStreakMultiplier(streak);

  return (
    <div className="min-h-screen bg-[#1a1a2e] relative" data-testid="game-surah-quiz">
      <div className="sticky top-0 z-20 bg-[#1a1a2e]/95 backdrop-blur-sm border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setLocation(`/quran-lesson/${surahNumber}`)} className="text-white/40 p-1" data-testid="button-back-game">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            {streak >= 3 && (
              <div className={`flex items-center gap-1 bg-orange-500/20 px-2.5 py-1 rounded-full border border-orange-500/30 ${comboAnimation ? "animate-bounce" : ""}`}>
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-orange-400 font-bold text-xs">x{currentMultiplier}</span>
              </div>
            )}
            {streak > 0 && streak < 3 && (
              <div className="flex items-center gap-1 bg-orange-500/10 px-2 py-0.5 rounded-full">
                <Zap className="w-3 h-3 text-orange-400" />
                <span className="text-orange-400 font-bold text-xs">{streak} 🔥</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-[#FFD93D]" />
              <span className="text-[#FFD93D] font-bold text-sm">{score}</span>
            </div>
          </div>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-1000 ${timerPercent > 50 ? "bg-[#4ECDC4]" : timerPercent > 25 ? "bg-[#FFD93D]" : "bg-[#FF6B6B]"}`} style={{ width: `${timerPercent}%` }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-white/30 text-[10px]">{currentQuestion + 1}/{questions.length}</span>
          <span className={`font-mono text-xs font-bold ${questionTimeLeft <= 5 ? "text-red-400 animate-pulse" : "text-white/50"}`}>{questionTimeLeft}s</span>
        </div>
      </div>

      <div className="px-4 pt-6 pb-24">
        {q.ayahText && (
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10 mb-4">
            <p className="text-white/90 text-lg leading-loose text-center" style={{ fontFamily: "'Amiri', serif", direction: "rtl", lineHeight: "2.2" }}>
              {q.ayahText}
            </p>
          </div>
        )}

        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-6">
          <p className="text-white text-sm leading-relaxed text-center" data-testid="text-question">
            {q.question}
          </p>
        </div>

        <div className="space-y-3" data-testid="quiz-options">
          {q.options.map((option, idx) => {
            const isSelected = selectedAnswer === option;
            const isCorrectAnswer = option === q.correctAnswer;
            let bgClass = "bg-white/5 border-white/10 active:scale-[0.98]";

            if (showResult) {
              if (isCorrectAnswer) bgClass = "bg-green-500/20 border-green-500/50";
              else if (isSelected && !isCorrectAnswer) bgClass = "bg-red-500/20 border-red-500/50";
              else bgClass = "bg-white/5 border-white/5 opacity-50";
            }

            return (
              <button
                key={idx}
                onClick={() => handleAnswer(option)}
                disabled={showResult}
                className={`w-full p-4 rounded-2xl border-2 transition-all ${bgClass} text-right`}
                data-testid={`option-${idx}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    showResult && isCorrectAnswer ? "bg-green-500 text-white" :
                    showResult && isSelected ? "bg-red-500 text-white" :
                    "bg-white/10 text-white/50"
                  }`}>
                    {showResult && isCorrectAnswer ? <CheckCircle2 className="w-4 h-4" /> :
                     showResult && isSelected ? <XCircle className="w-4 h-4" /> :
                     String.fromCharCode(65 + idx)}
                  </div>
                  <span className="flex-1 text-white/80 text-sm" style={{ fontFamily: "'Amiri', serif", direction: "rtl", lineHeight: "1.8" }}>
                    {option}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {showResult && (
          <button onClick={nextQuestion} className="w-full mt-6 bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] py-3 rounded-2xl font-bold text-lg active:scale-95 transition-transform" data-testid="button-next">
            {currentQuestion + 1 >= questions.length ? "Natiijada Eeg 🏆" : "Su'aasha xigta →"}
          </button>
        )}
      </div>
    </div>
  );
}
