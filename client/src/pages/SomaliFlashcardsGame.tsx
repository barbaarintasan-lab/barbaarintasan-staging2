import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useChildAuth } from "@/contexts/ChildAuthContext";
import { ArrowLeft, BookOpen, Loader2, RotateCcw, Star, Volume2, XCircle } from "lucide-react";
import CelebrationModal, { useCelebration } from "@/components/CelebrationModal";

interface FlashcardItem {
  id: string;
  somali: string;
  english: string;
  emoji: string;
  example: string;
}

interface FlashcardResponse {
  surahName: string;
  englishName: string;
  cards: FlashcardItem[];
}

export default function SomaliFlashcardsGame() {
  const { child } = useChildAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ surahNumber: string }>();
  const surahNumber = parseInt(params.surahNumber || "1", 10);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<FlashcardResponse | null>(null);
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [somaliVoice, setSomaliVoice] = useState<SpeechSynthesisVoice | null>(null);
  const { celebrationState, celebrate, closeCelebration } = useCelebration();
  const flashcardAudioRef = useRef<HTMLAudioElement | null>(null);

  const selectSomaliVoice = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;

    const femaleHints = [
      "female", "woman", "girl", "f", "zira", "samantha", "linda", "eva", "aria", "neural2-f", "wavenet-f",
    ];
    const maleHints = ["male", "man", "boy", "m", "david", "mark", "guy", "wavenet-m", "neural2-m"];

    const scoreVoice = (voice: SpeechSynthesisVoice): number => {
      const lang = (voice.lang || "").toLowerCase();
      const name = (voice.name || "").toLowerCase();
      const hay = `${name} ${lang}`;

      let score = 0;

      if (/^so(-|_)/i.test(lang) || /somali/i.test(hay)) score += 100;
      if (/neural|wavenet|natural|premium|online|cloud|enhanced/i.test(hay)) score += 25;
      if (voice.localService === false) score += 10;

      if (femaleHints.some((h) => hay.includes(h))) score += 30;
      if (maleHints.some((h) => hay.includes(h))) score -= 30;

      return score;
    };

    const somaliCandidates = voices.filter(
      (v) => /^so(-|_)/i.test(v.lang) || /somali/i.test(v.name) || /somali/i.test(v.lang),
    );

    const preferred =
      somaliCandidates.sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] || null;

    setSomaliVoice(preferred);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    selectSomaliVoice();
    const onVoicesChanged = () => selectSomaliVoice();
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      window.speechSynthesis.cancel();
      if (flashcardAudioRef.current) {
        flashcardAudioRef.current.pause();
        flashcardAudioRef.current = null;
      }
    };
  }, [selectSomaliVoice]);

  const playServerSomaliAudio = useCallback(async (text: string): Promise<boolean> => {
    if (!text.trim()) return false;
    try {
      const response = await fetch("/api/quran/flashcards/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      if (!response.ok) return false;

      const payload = await response.json();
      if (!payload?.audioBase64) return false;

      const audio = new Audio(`data:audio/mpeg;base64,${payload.audioBase64}`);
      flashcardAudioRef.current = audio;
      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      await audio.play();
      return true;
    } catch {
      return false;
    }
  }, []);

  const speakSomali = useCallback(async (text: string) => {
    if (!text.trim()) return;

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (flashcardAudioRef.current) {
      flashcardAudioRef.current.pause();
      flashcardAudioRef.current = null;
    }

    const usedServerVoice = await playServerSomaliAudio(text);
    if (usedServerVoice) return;

    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const hasSomaliLocalVoice = !!somaliVoice && (
      /^so(-|_)/i.test(somaliVoice.lang) || /somali/i.test(somaliVoice.name)
    );
    if (!hasSomaliLocalVoice) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = somaliVoice?.lang || "so-SO";
    if (somaliVoice) utterance.voice = somaliVoice;
    utterance.rate = 0.88;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [somaliVoice, playServerSomaliAudio]);

  useEffect(() => {
    if (!child) return;
    fetch(`/api/quran/games/data/somali_flashcards/${surahNumber}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error || "Khalad ayaa dhacay"); });
        return r.json();
      })
      .then((payload) => {
        setData(payload);
        setLoading(false);
      })
      .catch((e: any) => {
        setError(e.message || "Khalad ayaa dhacay");
        setLoading(false);
      });
  }, [child, surahNumber]);

  const totalCards = data?.cards.length || 0;
  const currentCard = data?.cards[currentIndex] || null;

  const progressPercent = useMemo(() => {
    if (!totalCards) return 0;
    return Math.round(((currentIndex + (finished ? 1 : 0)) / totalCards) * 100);
  }, [currentIndex, finished, totalCards]);

  const goNext = (known: boolean) => {
    if (!data) return;
    if (known) setKnownCount((v) => v + 1);
    else setReviewCount((v) => v + 1);

    setIsFlipped(false);

    if (currentIndex + 1 >= data.cards.length) {
      setFinished(true);
      return;
    }
    setCurrentIndex((v) => v + 1);
  };

  const restart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCount(0);
    setReviewCount(0);
    setFinished(false);
    setIsSpeaking(false);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (flashcardAudioRef.current) {
      flashcardAudioRef.current.pause();
      flashcardAudioRef.current = null;
    }
  };

  const handleCardTap = async () => {
    if (!currentCard) return;
    setIsFlipped((v) => !v);
    await speakSomali(`${currentCard.somali}. ${currentCard.example}`);
  };

  const saveScore = async () => {
    if (!data) return;
    const maxScore = data.cards.length * 10;
    const score = knownCount * 10;

    setSaving(true);
    try {
      const res = await fetch("/api/quran/games/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          gameType: "somali_flashcards",
          surahNumber,
          score,
          maxScore,
          timeSpentSeconds: data.cards.length * 12,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        celebrate("lesson_complete", "Khalad!", payload.error || "Dhibcaha lama keydin", { subtitle: data.englishName });
        setSaving(false);
        return;
      }

      const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      celebrate(
        percent >= 80 ? "quiz_perfect" : "lesson_complete",
        "Aad baad u fiicantahay!",
        `Waxaad baratay ${knownCount}/${data.cards.length} eray Somali ah.`,
        { subtitle: data.englishName }
      );
    } catch {
      celebrate("lesson_complete", "Khalad!", "Dhibcaha lama keydin", { subtitle: data.englishName });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FFD93D] animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center px-4">
        <XCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-white/70 text-center mb-4">{error || "Xogta lama helin"}</p>
        <button
          onClick={() => setLocation(`/quran-lesson/${surahNumber}`)}
          className="bg-[#FFD93D] text-[#1a1a2e] px-6 py-2 rounded-xl font-bold"
          data-testid="button-back-dashboard"
        >
          Ku noqo Dashboard
        </button>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center px-4">
        <div className="text-6xl mb-6">🗂️</div>
        <h1 className="text-white text-2xl font-bold mb-2">Af-Soomaali Flashcards</h1>
        <p className="text-white/50 text-sm mb-2">{data.englishName} - {data.surahName}</p>
        <p className="text-white/40 text-xs text-center mb-6 max-w-xs">
          Riix kaarka si aad u rogto, codka Soomaaligana si toos ah ayuu kuu akhrinayaa erayga iyo tusaalaha.
        </p>
        <button
          onClick={() => setStarted(true)}
          className="bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] px-8 py-3 rounded-2xl font-bold text-lg active:scale-95 transition-transform"
          data-testid="button-start-flashcards"
        >
          Bilow Ciyaarta 🚀
        </button>
        <button
          onClick={() => setLocation(`/quran-lesson/${surahNumber}`)}
          className="text-white/30 mt-4 text-sm"
          data-testid="button-back"
        >
          ← Ku noqo
        </button>
      </div>
    );
  }

  if (finished) {
    const maxScore = totalCards * 10;
    const score = knownCount * 10;
    const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center px-4">
        <div className="text-6xl mb-4">{percent >= 80 ? "🏆" : percent >= 50 ? "⭐" : "📖"}</div>
        <h2 className="text-white text-2xl font-bold mb-2">Waa dhammaatay!</h2>
        <p className="text-white/60 mb-6">Waxaad dhamaysay Somali flashcards</p>

        <div className="bg-white/5 rounded-2xl p-6 w-full max-w-xs border border-white/10 mb-6">
          <div className="flex justify-between mb-3">
            <span className="text-white/50">Baratay</span>
            <span className="text-[#22C55E] font-bold">{knownCount}</span>
          </div>
          <div className="flex justify-between mb-3">
            <span className="text-white/50">Dib u eegis</span>
            <span className="text-[#FFD93D] font-bold">{reviewCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Dhibcaha</span>
            <span className="text-white/80 font-bold">{score}/{maxScore}</span>
          </div>
        </div>

        <button
          onClick={saveScore}
          disabled={saving}
          className="bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] px-8 py-3 rounded-2xl font-bold mb-3 w-full max-w-xs active:scale-95 transition-transform disabled:opacity-50"
          data-testid="button-save-score"
        >
          {saving ? "Kaydinayaa..." : "Kaydi Dhibcaha ⭐"}
        </button>
        <button
          onClick={restart}
          className="text-white/50 text-sm mb-2 flex items-center gap-1"
          data-testid="button-restart"
        >
          <RotateCcw className="w-4 h-4" /> Markale celi
        </button>
        <button
          onClick={() => setLocation(`/quran-lesson/${surahNumber}`)}
          className="text-white/35 text-sm"
          data-testid="button-finish"
        >
          Ku noqo Dashboard
        </button>
        <CelebrationModal {...celebrationState} onClose={closeCelebration} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] relative" data-testid="game-somali-flashcards">
      <div className="sticky top-0 z-20 bg-[#1a1a2e]/95 backdrop-blur-sm border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setLocation(`/quran-lesson/${surahNumber}`)} className="text-white/40 p-1" data-testid="button-back-game">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <BookOpen className="w-4 h-4" />
            {currentIndex + 1}/{totalCards}
          </div>
          <div className="flex items-center gap-2">
            {isSpeaking && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#4ECDC4]/15 px-2 py-1 text-[10px] font-bold text-[#4ECDC4]">
                <Volume2 className="h-3 w-3" /> Cod
              </span>
            )}
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-[#FFD93D]" />
              <span className="text-[#FFD93D] font-bold text-sm">{knownCount * 10}</span>
            </div>
          </div>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#22C55E] to-[#4ECDC4] rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="px-4 pt-6 pb-24">
        {currentCard && (
          <button
            onClick={handleCardTap}
            className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 min-h-[420px] text-left"
            data-testid="flashcard"
          >
            {!isFlipped ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                <div className="text-7xl">{currentCard.emoji}</div>
                <p className="text-white text-5xl font-extrabold leading-tight">{currentCard.somali}</p>
                <p className="text-white/35 text-sm">Riix si aad u rogto oo codka u dhageyso</p>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-center gap-5">
                <div className="text-center">
                  <p className="text-[#4ECDC4] text-sm">Somali</p>
                  <p className="text-white text-4xl font-extrabold">{currentCard.somali}</p>
                </div>
                <div className="text-center">
                  <p className="text-[#FFD93D] text-sm">English</p>
                  <p className="text-white/80 text-2xl font-semibold">{currentCard.english}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-white/40 text-xs">Tusaale</p>
                  <p className="text-white/80 text-lg">{currentCard.example}</p>
                </div>
              </div>
            )}
          </button>
        )}

        <div className="grid grid-cols-2 gap-3 mt-5">
          <button
            onClick={() => goNext(false)}
            className="py-3 rounded-2xl bg-white/10 border border-white/10 text-white/80 font-semibold active:scale-95 transition-transform"
            data-testid="button-review-again"
          >
            Dib u eeg
          </button>
          <button
            onClick={() => goNext(true)}
            className="py-3 rounded-2xl bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white font-bold active:scale-95 transition-transform"
            data-testid="button-known"
          >
            Waan bartay
          </button>
        </div>
      </div>
    </div>
  );
}
