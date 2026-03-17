import { useState, useEffect, useCallback } from "react";
import { useChildAuth } from "@/contexts/ChildAuthContext";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Clock, Star, RotateCcw, Loader2, XCircle, ChevronUp } from "lucide-react";
import CelebrationModal, { useCelebration } from "@/components/CelebrationModal";

interface CardData {
  id: string;
  content: string;
  pairId: number;
  isFlipped: boolean;
  isMatched: boolean;
}

interface PairData {
  number: number;
  firstHalf: string;
  secondHalf: string;
  fullText: string;
}

export default function QuranMemoryMatch() {
  const { child } = useChildAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ surahNumber: string }>();
  const surahNumber = parseInt(params.surahNumber || "1");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [surahName, setSurahName] = useState("");
  const [englishName, setEnglishName] = useState("");
  const [cards, setCards] = useState<CardData[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [totalPairs, setTotalPairs] = useState(0);
  const [moves, setMoves] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [difficulty, setDifficulty] = useState(1);
  const { celebrationState, celebrate, closeCelebration } = useCelebration();

  const difficultyLabels: Record<number, { label: string; pairs: string; emoji: string }> = {
    1: { label: "Fudud", pairs: "4 kaadh", emoji: "🟢" },
    2: { label: "Dhexdhexaad", pairs: "8 kaadh", emoji: "🟡" },
    3: { label: "Adag", pairs: "12 kaadh", emoji: "🔴" },
  };

  const loadGame = useCallback((diff: number) => {
    if (!child) return;
    setLoading(true);
    fetch(`/api/quran/games/data/memory_match/${surahNumber}?difficulty=${diff}`, { credentials: "include" })
      .then(r => {
        if (!r.ok) return r.json().then(d => { throw new Error(d.error); });
        return r.json();
      })
      .then(data => {
        setSurahName(data.surahName);
        setEnglishName(data.englishName);
        const allCards: CardData[] = [];
        data.pairs.forEach((pair: PairData, idx: number) => {
          allCards.push({ id: `a-${idx}`, content: pair.firstHalf, pairId: idx, isFlipped: false, isMatched: false });
          allCards.push({ id: `b-${idx}`, content: pair.secondHalf, pairId: idx, isFlipped: false, isMatched: false });
        });
        for (let i = allCards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
        }
        setCards(allCards);
        setTotalPairs(data.pairs.length);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [child, surahNumber]);

  useEffect(() => {
    loadGame(difficulty);
  }, [difficulty, loadGame]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;
    const timer = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [gameStarted, gameOver]);

  const handleCardTap = useCallback((index: number) => {
    if (isChecking || cards[index].isFlipped || cards[index].isMatched || flippedCards.length >= 2) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedCards, index];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      setIsChecking(true);
      const [first, second] = newFlipped;

      if (newCards[first].pairId === newCards[second].pairId) {
        setTimeout(() => {
          const matched = [...newCards];
          matched[first].isMatched = true;
          matched[second].isMatched = true;
          setCards(matched);
          setFlippedCards([]);
          setIsChecking(false);
          const newMatched = matchedPairs + 1;
          setMatchedPairs(newMatched);
          if (newMatched === totalPairs) setGameOver(true);
        }, 600);
      } else {
        setTimeout(() => {
          const reset = [...newCards];
          reset[first].isFlipped = false;
          reset[second].isFlipped = false;
          setCards(reset);
          setFlippedCards([]);
          setIsChecking(false);
        }, 1000);
      }
    }
  }, [cards, flippedCards, isChecking, matchedPairs, totalPairs]);

  const calculateScore = () => {
    if (totalPairs === 0) return { score: 0, maxScore: 0 };
    const maxScore = totalPairs * 10;
    const perfectMoves = totalPairs;
    const efficiency = Math.max(0, 1 - (moves - perfectMoves) / (perfectMoves * 3));
    const diffBonus = difficulty === 3 ? 1.5 : difficulty === 2 ? 1.2 : 1;
    const score = Math.round(maxScore * efficiency * diffBonus);
    return { score: Math.max(0, Math.min(score, maxScore)), maxScore };
  };

  const saveScore = async () => {
    setSaving(true);
    const { score, maxScore } = calculateScore();
    try {
      const res = await fetch("/api/quran/games/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ gameType: "memory_match", surahNumber, score, maxScore, timeSpentSeconds: timeElapsed }),
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
        <button onClick={() => setLocation("/child-dashboard")} className="bg-[#FFD93D] text-[#1a1a2e] px-6 py-2 rounded-xl font-bold" data-testid="button-back-dashboard">
          Ku noqo Dashboard
        </button>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center px-4">
        <div className="text-6xl mb-6">🃏</div>
        <h1 className="text-white text-2xl font-bold mb-2">Aayah Xusuus</h1>
        <p className="text-white/50 text-sm mb-2">{englishName} - {surahName}</p>
        <p className="text-white/40 text-xs text-center mb-6 max-w-xs">
          Kaadhka rogo oo isku xir labada qaybood ee aayada.
        </p>

        <div className="w-full max-w-xs mb-8">
          <p className="text-white/40 text-xs text-center mb-3">Heerka adkeysi</p>
          <div className="flex gap-2">
            {[1, 2, 3].map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-3 rounded-xl border-2 transition-all text-center ${
                  difficulty === d
                    ? "bg-[#FFD93D]/20 border-[#FFD93D]/50 text-[#FFD93D]"
                    : "bg-white/5 border-white/10 text-white/40"
                }`}
                data-testid={`difficulty-${d}`}
              >
                <div className="text-lg mb-1">{difficultyLabels[d].emoji}</div>
                <div className="text-xs font-bold">{difficultyLabels[d].label}</div>
                <div className="text-[10px] opacity-60">{difficultyLabels[d].pairs}</div>
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => setGameStarted(true)} className="bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] px-8 py-3 rounded-2xl font-bold text-lg active:scale-95 transition-transform" data-testid="button-start-game">
          Bilow Ciyaarta 🚀
        </button>
        <button onClick={() => setLocation("/child-dashboard")} className="text-white/30 mt-4 text-sm" data-testid="button-back">
          ← Ku noqo
        </button>
      </div>
    );
  }

  if (gameOver) {
    const { score, maxScore } = calculateScore();
    const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center px-4">
        <div className="text-6xl mb-4">{percent >= 80 ? "🏆" : percent >= 50 ? "⭐" : "📖"}</div>
        <h2 className="text-white text-2xl font-bold mb-2">Hambalyo!</h2>
        <p className="text-white/60 mb-6">{englishName}</p>
        <div className="bg-white/5 rounded-2xl p-6 w-full max-w-xs border border-white/10 mb-6">
          <div className="flex justify-between mb-3">
            <span className="text-white/50">Dhibcaha</span>
            <span className="text-[#FFD93D] font-bold">{score}/{maxScore}</span>
          </div>
          <div className="flex justify-between mb-3">
            <span className="text-white/50">Heerka</span>
            <span className="text-white/70 font-bold">{difficultyLabels[difficulty].emoji} {difficultyLabels[difficulty].label}</span>
          </div>
          <div className="flex justify-between mb-3">
            <span className="text-white/50">Isku dayyo</span>
            <span className="text-white/70 font-bold">{moves}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Wakhti</span>
            <span className="text-white/70 font-bold">{timeElapsed}s</span>
          </div>
        </div>
        {difficulty < 3 && (
          <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-2 mb-4 w-full max-w-xs">
            <ChevronUp className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300/70 text-xs">Heerka adag wuxuu kordhiyaa dhibcaha!</span>
          </div>
        )}
        <button onClick={saveScore} disabled={saving} className="bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] px-8 py-3 rounded-2xl font-bold mb-3 w-full max-w-xs active:scale-95 transition-transform disabled:opacity-50" data-testid="button-save-score">
          {saving ? "Kaydinayaa..." : "Kaydi Dhibcaha ⭐"}
        </button>
        <button onClick={() => setLocation("/child-dashboard")} className="text-white/40 text-sm" data-testid="button-finish">
          Ku noqo Dashboard
        </button>
        <CelebrationModal {...celebrationState} onClose={closeCelebration} />
      </div>
    );
  }

  const gridCols = cards.length > 6 ? "grid-cols-3" : cards.length > 2 ? "grid-cols-2" : "grid-cols-1";

  return (
    <div className="min-h-screen bg-[#1a1a2e] relative" data-testid="game-memory-match">
      <div className="sticky top-0 z-20 bg-[#1a1a2e]/95 backdrop-blur-sm border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setLocation("/child-dashboard")} className="text-white/40 p-1" data-testid="button-back-game">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-white/50" />
              <span className="text-white/70 font-mono text-sm">{timeElapsed}s</span>
            </div>
            <div className="flex items-center gap-1">
              <RotateCcw className="w-4 h-4 text-white/50" />
              <span className="text-white/70 text-sm">{moves}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-[#FFD93D]" />
            <span className="text-[#FFD93D] font-bold text-sm">{matchedPairs}/{totalPairs}</span>
          </div>
        </div>
      </div>

      <div className="px-3 pt-4 pb-24">
        <div className={`grid ${gridCols} gap-2`} data-testid="card-grid">
          {cards.map((card, index) => (
            <button
              key={card.id}
              onClick={() => handleCardTap(index)}
              className={`aspect-square rounded-xl border-2 transition-all duration-300 p-2 flex items-center justify-center ${
                card.isMatched
                  ? "bg-green-500/20 border-green-500/50 scale-95"
                  : card.isFlipped
                  ? "bg-[#FFD93D]/10 border-[#FFD93D]/50"
                  : "bg-white/5 border-white/10 hover:border-white/30 active:scale-95"
              }`}
              disabled={card.isMatched}
              data-testid={`card-${index}`}
            >
              {card.isFlipped || card.isMatched ? (
                <span className="text-white/80 leading-relaxed text-center" style={{ fontFamily: "'Amiri', serif", direction: "rtl", fontSize: cards.length > 8 ? "14px" : "16px", lineHeight: "1.9" }}>
                  {card.content}
                </span>
              ) : (
                <span className="text-3xl">🌙</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
