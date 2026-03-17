import { useState, useEffect, useCallback } from "react";
import { useChildAuth } from "@/contexts/ChildAuthContext";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Clock, Star, Shuffle, CheckCircle2, XCircle, Loader2, Lightbulb } from "lucide-react";
import CelebrationModal, { useCelebration } from "@/components/CelebrationModal";

interface AyahData {
  number: number;
  text: string;
  words: string[];
}

interface GameData {
  surahName: string;
  englishName: string;
  ayahs: AyahData[];
}

export default function QuranWordPuzzle() {
  const { child } = useChildAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ surahNumber: string }>();
  const surahNumber = parseInt(params.surahNumber || "1");

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [shuffledWords, setShuffledWords] = useState<string[]>([]);
  const [placedWords, setPlacedWords] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintWord, setHintWord] = useState<number | null>(null);
  const { celebrationState, celebrate, closeCelebration } = useCelebration();

  useEffect(() => {
    if (!child) return;
    fetch(`/api/quran/games/data/word_puzzle/${surahNumber}`, { credentials: "include" })
      .then(r => {
        if (!r.ok) return r.json().then(d => { throw new Error(d.error); });
        return r.json();
      })
      .then(data => { setGameData(data); setMaxScore(data.ayahs.length * 10); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [child, surahNumber]);

  const shuffleArray = useCallback((arr: string[]) => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const startRound = useCallback(() => {
    if (!gameData || currentAyahIndex >= gameData.ayahs.length) return;
    const ayah = gameData.ayahs[currentAyahIndex];
    let shuffled = shuffleArray(ayah.words);
    while (shuffled.join(" ") === ayah.words.join(" ") && ayah.words.length > 1) {
      shuffled = shuffleArray(ayah.words);
    }
    setShuffledWords(shuffled);
    setPlacedWords([]);
    setShowResult(false);
    setIsCorrect(false);
    setHintWord(null);
  }, [gameData, currentAyahIndex, shuffleArray]);

  useEffect(() => {
    if (gameData && gameStarted) startRound();
  }, [gameData, gameStarted, currentAyahIndex, startRound]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); setGameOver(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameStarted, gameOver]);

  const handleWordTap = (word: string, index: number) => {
    if (showResult) return;
    setShuffledWords(prev => prev.filter((_, i) => i !== index));
    setPlacedWords(prev => [...prev, word]);
    setHintWord(null);
  };

  const handlePlacedWordTap = (word: string, index: number) => {
    if (showResult) return;
    setPlacedWords(prev => prev.filter((_, i) => i !== index));
    setShuffledWords(prev => [...prev, word]);
  };

  const useHint = () => {
    if (!gameData || showResult) return;
    const ayah = gameData.ayahs[currentAyahIndex];
    const nextCorrectIdx = placedWords.length;
    if (nextCorrectIdx >= ayah.words.length) return;
    const nextCorrectWord = ayah.words[nextCorrectIdx];
    const wordIdx = shuffledWords.findIndex(w => w === nextCorrectWord);
    if (wordIdx >= 0) {
      setHintWord(wordIdx);
      setHintsUsed(prev => prev + 1);
    }
  };

  const checkAnswer = () => {
    if (!gameData) return;
    const ayah = gameData.ayahs[currentAyahIndex];
    const correct = placedWords.join(" ") === ayah.words.join(" ");
    setIsCorrect(correct);
    setShowResult(true);
    if (correct) setScore(prev => prev + 10);
  };

  const nextAyah = () => {
    if (!gameData) return;
    if (currentAyahIndex + 1 >= gameData.ayahs.length) {
      setGameOver(true);
    } else {
      setCurrentAyahIndex(prev => prev + 1);
    }
  };

  const saveScore = async () => {
    setSaving(true);
    const finalScore = Math.max(0, score - hintsUsed);
    try {
      const res = await fetch("/api/quran/games/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ gameType: "word_puzzle", surahNumber, score: finalScore, maxScore, timeSpentSeconds: 45 * 60 - timeLeft }),
      });
      const data = await res.json();
      if (!res.ok) {
        celebrate("lesson_complete", "Khalad!", data.error || "Dhibcaha lama keydsan karin", { subtitle: gameData?.englishName });
        setSaving(false);
        return;
      }
      const streakText = data.streakMultiplier > 1 ? `\n🔥 Streak x${data.streakMultiplier}!` : "";
      if (data.coinsEarned > 0) {
        celebrate("quiz_perfect", "Aayah Stars!", `Waxaad heshay ${data.coinsEarned} coins! 🪙${streakText}\nDhibcahaagu waa ${finalScore}/${maxScore}`, { subtitle: gameData?.englishName });
      } else {
        celebrate("lesson_complete", "Ciyaarta way dhammaatay!", `Dhibcahaagu waa ${finalScore}/${maxScore}`, { subtitle: gameData?.englishName });
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
        <button onClick={() => setLocation("/child-login")} className="bg-[#FFD93D] text-[#1a1a2e] px-6 py-2 rounded-xl font-bold" data-testid="button-back-dashboard">
          Ku noqo Dashboard
        </button>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center px-4">
        <div className="text-6xl mb-6">🧩</div>
        <h1 className="text-white text-2xl font-bold mb-2">Xarafaha Aayada</h1>
        <p className="text-white/50 text-sm mb-2">{gameData?.englishName} - {gameData?.surahName}</p>
        <p className="text-white/40 text-xs text-center mb-4 max-w-xs">
          Kelmadaha aayada sax u dhig. Wakhti aad u haysataa 45 daqiiqo!
        </p>
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2 mb-8">
          <Lightbulb className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-300/70 text-xs">Hint-ka wuxuu kaa jarayaa 1 dhibic</span>
        </div>
        <button onClick={() => setGameStarted(true)} className="bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] px-8 py-3 rounded-2xl font-bold text-lg active:scale-95 transition-transform" data-testid="button-start-game">
          Bilow Ciyaarta 🚀
        </button>
        <button onClick={() => setLocation("/child-login")} className="text-white/30 mt-4 text-sm" data-testid="button-back">
          ← Ku noqo
        </button>
      </div>
    );
  }

  if (gameOver) {
    const finalScore = Math.max(0, score - hintsUsed);
    const percent = maxScore > 0 ? Math.round((finalScore / maxScore) * 100) : 0;
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center px-4">
        <div className="text-6xl mb-4">{percent >= 80 ? "🏆" : percent >= 50 ? "⭐" : "📖"}</div>
        <h2 className="text-white text-2xl font-bold mb-2">Ciyaarta way dhammaatay!</h2>
        <p className="text-white/60 mb-6">{gameData?.englishName}</p>
        <div className="bg-white/5 rounded-2xl p-6 w-full max-w-xs border border-white/10 mb-6">
          <div className="flex justify-between mb-3">
            <span className="text-white/50">Dhibcaha</span>
            <span className="text-[#FFD93D] font-bold">{finalScore}/{maxScore}</span>
          </div>
          <div className="flex justify-between mb-3">
            <span className="text-white/50">Sax ah</span>
            <span className="text-green-400 font-bold">{percent}%</span>
          </div>
          {hintsUsed > 0 && (
            <div className="flex justify-between mb-3">
              <span className="text-white/50">Hints</span>
              <span className="text-yellow-400 font-bold">-{hintsUsed} 💡</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-white/50">Wakhti</span>
            <span className="text-white/70 font-bold">{Math.floor((45 * 60 - timeLeft) / 60)}:{((45 * 60 - timeLeft) % 60).toString().padStart(2, "0")}</span>
          </div>
        </div>
        <button onClick={saveScore} disabled={saving} className="bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] px-8 py-3 rounded-2xl font-bold mb-3 w-full max-w-xs active:scale-95 transition-transform disabled:opacity-50" data-testid="button-save-score">
          {saving ? "Kaydinayaa..." : "Kaydi Dhibcaha ⭐"}
        </button>
        <button onClick={() => setLocation("/child-login")} className="text-white/40 text-sm" data-testid="button-finish">
          Ku noqo Dashboard
        </button>
        <CelebrationModal {...celebrationState} onClose={closeCelebration} />
      </div>
    );
  }

  const currentAyah = gameData?.ayahs[currentAyahIndex];

  return (
    <div className="min-h-screen bg-[#1a1a2e] relative" data-testid="game-word-puzzle">
      <div className="sticky top-0 z-20 bg-[#1a1a2e]/95 backdrop-blur-sm border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setLocation("/child-login")} className="text-white/40 p-1" data-testid="button-back-game">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-white/50" />
            <span className={`font-mono font-bold ${timeLeft <= 30 ? "text-red-400" : "text-white/70"}`}>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={useHint} disabled={showResult} className="flex items-center gap-1 bg-yellow-500/15 px-2 py-1 rounded-lg active:scale-95 transition-transform disabled:opacity-30" data-testid="button-hint">
              <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-yellow-400 text-xs font-bold">Hint</span>
            </button>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-[#FFD93D]" />
              <span className="text-[#FFD93D] font-bold text-sm">{score}</span>
            </div>
          </div>
        </div>
        <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#FFD93D] to-[#FFA502] rounded-full transition-all" style={{ width: `${((currentAyahIndex + 1) / (gameData?.ayahs.length || 1)) * 100}%` }} />
        </div>
      </div>

      <div className="px-4 pt-6 pb-24">
        <p className="text-white/30 text-xs text-center mb-2">Aayada {currentAyahIndex + 1}/{gameData?.ayahs.length}</p>
        <h3 className="text-white/60 text-sm text-center mb-6">Kelmadaha si sax ah u dhig</h3>

        <div className="min-h-[80px] bg-white/5 rounded-2xl border-2 border-dashed border-white/20 p-4 mb-6 flex flex-wrap gap-2 justify-center items-start" data-testid="drop-zone">
          {placedWords.length === 0 && <p className="text-white/20 text-sm">Halkan kelmadaha dhig...</p>}
          {placedWords.map((word, i) => (
            <button key={`placed-${i}`} onClick={() => handlePlacedWordTap(word, i)}
              className={`px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${showResult ? (isCorrect ? "bg-green-500/30 text-green-300 border border-green-500/50" : "bg-red-500/30 text-red-300 border border-red-500/50") : "bg-[#FFD93D]/20 text-[#FFD93D] border border-[#FFD93D]/30"}`}
              style={{ fontFamily: "'Amiri', serif", fontSize: "16px", direction: "rtl" }}
              data-testid={`placed-word-${i}`}
            >
              {word}
            </button>
          ))}
        </div>

        {showResult && (
          <div className={`rounded-2xl p-4 mb-4 ${isCorrect ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
              <span className={`font-bold ${isCorrect ? "text-green-400" : "text-red-400"}`}>
                {isCorrect ? "Aad baad u mahadsantahay! ✨" : "Khalad — Tani waa aayada saxda ah:"}
              </span>
            </div>
            {!isCorrect && currentAyah && (
              <p className="text-white/70 text-base" style={{ fontFamily: "'Amiri', serif", direction: "rtl", lineHeight: "2" }}>
                {currentAyah.text}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-center mb-8" data-testid="word-bank">
          {shuffledWords.map((word, i) => (
            <button key={`shuffle-${i}`} onClick={() => handleWordTap(word, i)}
              className={`px-3 py-2 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                hintWord === i
                  ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/50 animate-pulse"
                  : "bg-white/10 text-white/80 border-white/10 hover:bg-white/20"
              }`}
              style={{ fontFamily: "'Amiri', serif", fontSize: "16px", direction: "rtl" }}
              data-testid={`word-${i}`}
            >
              {word}
            </button>
          ))}
        </div>

        {!showResult && placedWords.length > 0 && placedWords.length === (currentAyah?.words.length || 0) && (
          <button onClick={checkAnswer} className="w-full bg-gradient-to-r from-[#4ECDC4] to-[#45B7AA] text-white py-3 rounded-2xl font-bold text-lg active:scale-95 transition-transform" data-testid="button-check">
            Hubi ✓
          </button>
        )}

        {showResult && (
          <button onClick={nextAyah} className="w-full bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] py-3 rounded-2xl font-bold text-lg active:scale-95 transition-transform" data-testid="button-next">
            {currentAyahIndex + 1 >= (gameData?.ayahs.length || 0) ? "Natiijada Eeg 🏆" : "Aayada xigta →"}
          </button>
        )}
      </div>
    </div>
  );
}
