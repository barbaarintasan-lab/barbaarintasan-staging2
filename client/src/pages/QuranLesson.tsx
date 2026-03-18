import { useState, useEffect, useRef, useCallback } from "react";
import { useChildAuth } from "@/contexts/ChildAuthContext";
import { useLocation, useParams } from "wouter";
import { useQuranText } from "@/hooks/useQuranText";
import {
  ArrowLeft, Mic, MicOff, CheckCircle2, Star, RotateCcw,
  ChevronRight, Volume2, Loader2, Lock, Trophy, ChevronDown
} from "lucide-react";

interface AyahProgress {
  ayahNumber: number;
  attempts: number;
  bestScore: number;
  lastScore: number;
  completed: boolean;
}

interface CheckResult {
  outcome: "correct" | "needs_retry";
  completed: boolean;
  message: string;
}

interface ReciterOption {
  id: string;
  name: string;
  nameAr: string;
}

interface RewardSummary {
  aayahStars: number;
  surahTrophies: number;
  gameCoins: number;
  gameTokens: number;
  badges: Array<{ key: string; name: string; icon: string }>;
}

const RECITERS: ReciterOption[] = [
  { id: "husary_muallim", name: "Al-Husary (Muallim)", nameAr: "الحصري - المعلم" },
  { id: "abdul_basit", name: "Abdul Basit (Mujawwad)", nameAr: "عبد الباسط - مجوّد" },
];

const CURRICULUM_ORDER = [
  1, 114, 113, 112,
  111, 110, 109, 108, 107, 106,
  105, 104, 103, 102, 101,
  100, 99, 98, 97, 96,
  95, 94, 93, 92, 91, 90, 89, 88, 87, 86, 85, 84, 83, 82, 81, 80, 79, 78,
];

function getNextSurahNumber(currentSurah: number): number | null {
  const idx = CURRICULUM_ORDER.indexOf(currentSurah);
  if (idx === -1 || idx >= CURRICULUM_ORDER.length - 1) return null;
  return CURRICULUM_ORDER[idx + 1];
}

export default function QuranLesson() {
  const { child, isLoading: authLoading } = useChildAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ surahNumber: string }>();
  const surahNumber = parseInt(params.surahNumber || "0");

  const { surah, loading: surahLoading } = useQuranText(surahNumber || null);

  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [ayahProgress, setAyahProgress] = useState<Record<number, AyahProgress>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [surahComplete, setSurahComplete] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(60 * 60);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [hasListened, setHasListened] = useState(false);
  const [selectedReciter, setSelectedReciter] = useState<string>(() => {
    try { return localStorage.getItem("quran_reciter") || "husary_muallim"; } catch { return "husary_muallim"; }
  });
  const [showReciterPicker, setShowReciterPicker] = useState(false);
  const [rewardSummary, setRewardSummary] = useState<RewardSummary | null>(null);

  const [listenCount, setListenCount] = useState(0);
  const [revealText, setRevealText] = useState(false);
  const [autoAdvancing, setAutoAdvancing] = useState(false);
  const [ayahMistakes, setAyahMistakes] = useState<Record<number, number>>({});
  const [fullSurahReview, setFullSurahReview] = useState(false);
  const [reviewPlaying, setReviewPlaying] = useState(false);
  const [reviewAyahIndex, setReviewAyahIndex] = useState(0);

  // Session-based learning: track ayahs learned this visit
  const [sessionLearned, setSessionLearned] = useState<number[]>([]); // ayah INDICES completed this session
  const [sessionPhase, setSessionPhase] = useState<"learning" | "review" | "finaltest">("learning");
  const [reviewReadCount, setReviewReadCount] = useState(0);
  const [isFinalRecording, setIsFinalRecording] = useState(false);
  const [isFinalChecking, setIsFinalChecking] = useState(false);
  const [finalTestResult, setFinalTestResult] = useState<{ passed: boolean; score: number; starsEarned: number; message: string } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  const audioTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTestMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const finalTestChunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!authLoading && !child) setLocation("/child-login");
  }, [child, authLoading, setLocation]);

  useEffect(() => {
    if (!surahNumber || !child) return;
    fetch(`/api/quran/surah/${surahNumber}/progress`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.progress) setAyahProgress(data.progress);
      })
      .catch(() => {});
  }, [surahNumber, child]);

  useEffect(() => {
    if (!child) return;
    fetch("/api/quran/rewards", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setRewardSummary({
          aayahStars: Number(data.aayahStars || 0),
          surahTrophies: Number(data.surahTrophies || 0),
          gameCoins: Number(data.gameCoins || 0),
          gameTokens: Number(data.gameTokens || 0),
          badges: Array.isArray(data.badges) ? data.badges : [],
        });
      })
      .catch(() => {
        setRewardSummary(null);
      });
  }, [child, surahComplete]);

  useEffect(() => {
    if (sessionExpired || surahComplete) return;
    const timer = setInterval(() => {
      setSessionTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setSessionExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionExpired, surahComplete]);

  useEffect(() => {
    setHasListened(false);
    setCheckResult(null);
    setListenCount(0);
    setAudioFailed(false);
    setRevealText(false);
    setAutoAdvancing(false);
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
  }, [currentAyahIndex]);

  const currentAyah = surah?.ayahs?.[currentAyahIndex];
  const totalAyahs = surah?.numberOfAyahs || 0;
  const completedCount = Object.values(ayahProgress).filter(p => p.completed).length;
  const isCurrentCompleted = currentAyah ? ayahProgress[currentAyah.number]?.completed : false;

  const isAyahAccessible = (index: number): boolean => {
    if (!surah) return false;
    if (index === 0) return true;
    const prevAyah = surah.ayahs[index - 1];
    return !!ayahProgress[prevAyah.number]?.completed;
  };

  const changeReciter = (reciterId: string) => {
    setSelectedReciter(reciterId);
    try { localStorage.setItem("quran_reciter", reciterId); } catch {}
    setShowReciterPicker(false);
  };

  const getAudioUrl = useCallback((sNum: number, aNum: number, reciter: string) => {
    const folders: Record<string, string> = {
      husary_muallim: "Husary_Muallim_128kbps",
      abdul_basit: "Abdul_Basit_Mujawwad_128kbps",
    };
    const folder = folders[reciter] || folders.husary_muallim;
    const ps = sNum.toString().padStart(3, "0");
    const pa = aNum.toString().padStart(3, "0");
    return `https://everyayah.com/data/${folder}/${ps}${pa}.mp3`;
  }, []);

  const preloadNextAyah = useCallback(() => {
    if (!surah) return;
    const nextIdx = currentAyahIndex + 1;
    if (nextIdx >= surah.ayahs.length) return;
    const nextAyah = surah.ayahs[nextIdx];
    const url = getAudioUrl(surahNumber, nextAyah.number, selectedReciter);
    const preloadAudio = new Audio();
    preloadAudio.preload = "auto";
    preloadAudio.src = url;
    preloadRef.current = preloadAudio;
  }, [surah, currentAyahIndex, surahNumber, selectedReciter, getAudioUrl]);

  const [audioFailed, setAudioFailed] = useState(false);

  const playAyah = useCallback(async () => {
    if (!currentAyah || isPlaying) return;
    setIsLoadingAudio(true);
    setAudioFailed(false);

    if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);

    try {
      const audioUrl = getAudioUrl(surahNumber, currentAyah.number, selectedReciter);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      const loadTimeout = setTimeout(() => {
        if (!audio.readyState || audio.readyState < 2) {
          audio.pause();
          setIsLoadingAudio(false);
          setAudioFailed(true);
        }
      }, 10000);
      audioTimeoutRef.current = loadTimeout;

      audio.onplay = () => {
        setIsPlaying(true);
        setIsLoadingAudio(false);
        if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);
      };
      audio.onended = () => {
        setIsPlaying(false);
        setHasListened(true);
        setListenCount(prev => prev + 1);
        preloadNextAyah();
      };
      audio.onerror = () => {
        setIsPlaying(false);
        setIsLoadingAudio(false);
        setAudioFailed(true);
        if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);
      };
      await audio.play();
    } catch {
      setIsLoadingAudio(false);
      setAudioFailed(true);
      if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);
    }
  }, [currentAyah, isPlaying, surahNumber, selectedReciter, getAudioUrl, preloadNextAyah]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const isLikelyIPhoneSafari = useCallback(() => {
    const ua = navigator.userAgent || "";
    const isIOS = /iP(hone|od|ad)/i.test(ua);
    const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    return isIOS && isSafari;
  }, []);

  const pickRecorderMimeType = useCallback(() => {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/aac",
    ];
    for (const mime of candidates) {
      if ((window as any).MediaRecorder?.isTypeSupported?.(mime)) {
        return mime;
      }
    }
    return undefined;
  }, []);

  const startRecording = useCallback(async () => {
    // Stop Sheikh audio if playing so mic can record cleanly
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    if (preloadRef.current) { preloadRef.current.pause(); }
    setIsPlaying(false);
    setIsLoadingAudio(false);

    const createRecorder = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // iPhone Safari may need a short settle window after permission is granted.
      if (isLikelyIPhoneSafari()) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const mimeType = pickRecorderMimeType();
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setCheckResult(null);
    };

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Browser-kan ma taageerayo microphone recording");
        return;
      }

      try {
        const permissionsApi = (navigator as any).permissions;
        if (permissionsApi?.query) {
          const status = await permissionsApi.query({ name: "microphone" as PermissionName });
          if (status?.state === "denied") {
            alert("Microphone-ka waa xiran yahay. Fadlan ka fur Settings kadibna isku day mar kale.");
            return;
          }
        }
      } catch {
        // Some Safari versions do not support microphone permission query.
      }

      await createRecorder();
    } catch {
      try {
        // Retry once for iPhone/Safari timing race after allow popup.
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await createRecorder();
      } catch {
        alert("Fadlan oggolow microphone-ka kadibna mar kale riix Isku day!");
      }
    }
  }, [isLikelyIPhoneSafari, pickRecorderMimeType]);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !currentAyah) return;
    setIsRecording(false);
    setIsChecking(true);

    const recorder = mediaRecorderRef.current;
    await new Promise<void>((resolve) => {
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach(t => t.stop());
        resolve();
      };
      recorder.stop();
    });

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");
    formData.append("surahNumber", surahNumber.toString());
    formData.append("ayahNumber", currentAyah.number.toString());

    try {
      const response = await fetch("/api/quran/check", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Check failed");
      }
      const result: CheckResult = await response.json();

      const wasAlreadyCompleted = ayahProgress[currentAyah.number]?.completed || false;
      const updatedProgress = {
        ...ayahProgress,
        [currentAyah.number]: {
          ayahNumber: currentAyah.number,
          attempts: (ayahProgress[currentAyah.number]?.attempts || 0) + 1,
          bestScore: result.completed ? 100 : (ayahProgress[currentAyah.number]?.bestScore || 0),
          lastScore: result.completed ? 100 : 40,
          completed: result.completed || wasAlreadyCompleted,
        }
      };
      setAyahProgress(updatedProgress);
      setCheckResult(result);

      if (result.completed && !wasAlreadyCompleted) {
        // Track this ayah index in the session
        setSessionLearned(prev => prev.includes(currentAyahIndex) ? prev : [...prev, currentAyahIndex]);

        const newCompletedCount = Object.values(updatedProgress).filter(p => p.completed).length;
        const isLast = newCompletedCount >= totalAyahs;
        if (isLast) {
          setSurahComplete(true);
          setFullSurahReview(true); // show full text + sequential audio before games
        } else {
          // auto-advance to next ayah after 2 seconds
          setAutoAdvancing(true);
          setTimeout(() => {
            setAutoAdvancing(false);
            setCurrentAyahIndex(prev => Math.min(prev + 1, totalAyahs - 1));
            setCheckResult(null);
          }, 2200);
        }
      } else if (!result.completed) {
        // Smart Retry: replay audio after each mistake (text is always visible)
        const mistakeNum = (ayahMistakes[currentAyah.number] || 0) + 1;
        setAyahMistakes(prev => ({ ...prev, [currentAyah.number]: mistakeNum }));

        // Always replay audio so child can listen and compare
        const delay = mistakeNum >= 3 ? 400 : 800;
        setTimeout(() => {
          const url = getAudioUrl(surahNumber, currentAyah.number, selectedReciter);
          if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = url; audioRef.current.play().catch(() => {}); }
        }, delay);
      }
    } catch (error: any) {
      setCheckResult({
        outcome: "needs_retry",
        completed: false,
        message: error?.message || "Khalad ayaa dhacay. Isku day mar kale!"
      });
    }
    setIsChecking(false);
  }, [currentAyah, currentAyahIndex, surahNumber, totalAyahs, ayahProgress, ayahMistakes, getAudioUrl, selectedReciter]);

  const goToAyah = (index: number) => {
    if (index >= 0 && index < totalAyahs && isAyahAccessible(index)) {
      stopAudio();
      setCurrentAyahIndex(index);
      setCheckResult(null);
      setHasListened(false);
    }
  };

  const nextAyah = () => {
    if (currentAyahIndex < totalAyahs - 1 && isCurrentCompleted) {
      goToAyah(currentAyahIndex + 1);
    }
  };

  const playFullSurahSequential = useCallback(() => {
    if (!surah) return;
    setReviewPlaying(true);
    setReviewAyahIndex(0);
    let idx = 0;
    const playNext = () => {
      if (idx >= surah.ayahs.length) {
        setReviewPlaying(false);
        return;
      }
      setReviewAyahIndex(idx);
      const url = getAudioUrl(surahNumber, surah.ayahs[idx].number, selectedReciter);
      const a = new Audio(url);
      reviewAudioRef.current = a;
      a.onended = () => { idx++; setTimeout(playNext, 600); };
      a.onerror = () => { idx++; setTimeout(playNext, 300); };
      a.play().catch(() => { idx++; setTimeout(playNext, 300); });
    };
    playNext();
  }, [surah, surahNumber, selectedReciter, getAudioUrl]);

  const finishFullReview = () => {
    if (reviewAudioRef.current) { reviewAudioRef.current.pause(); reviewAudioRef.current = null; }
    setReviewPlaying(false);
    setFullSurahReview(false);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 6000);
  };

  const startFinalTest = async () => {
    if (isFinalRecording || isFinalChecking) return;
    finalTestChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"].find(m => MediaRecorder.isTypeSupported(m)) || "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recorder.ondataavailable = (e) => { if (e.data.size > 0) finalTestChunksRef.current.push(e.data); };
      recorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); };
      recorder.start();
      finalTestMediaRecorderRef.current = recorder;
      setIsFinalRecording(true);
    } catch {
      alert("Fadlan oggolow microphone-ka kadibna isku day mar kale!");
    }
  };

  const stopFinalTest = async () => {
    if (!finalTestMediaRecorderRef.current || !surah) return;
    setIsFinalRecording(false);
    setIsFinalChecking(true);
    const recorder = finalTestMediaRecorderRef.current;
    await new Promise<void>((resolve) => {
      recorder.onstop = () => { recorder.stream.getTracks().forEach(t => t.stop()); resolve(); };
      recorder.stop();
    });
    const mimeType = finalTestChunksRef.current[0]?.type || "audio/webm";
    const blob = new Blob(finalTestChunksRef.current, { type: mimeType });
    const ayahNumbers = sessionLearned.map(idx => surah.ayahs[idx]?.number).filter(Boolean);
    const formData = new FormData();
    formData.append("audio", blob, "session-xifdi.webm");
    formData.append("surahNumber", surahNumber.toString());
    formData.append("ayahNumbers", JSON.stringify(ayahNumbers));
    try {
      const response = await fetch("/api/quran/check-session", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const result = await response.json();
      setFinalTestResult(result);
    } catch {
      setFinalTestResult({ passed: false, score: 0, starsEarned: 0, message: "Khalad ayaa dhacay. Isku day mar kale!" });
    }
    setIsFinalChecking(false);
  };

  const nextSurahNumber = getNextSurahNumber(surahNumber);

  const currentAyahMistakes = currentAyah ? (ayahMistakes[currentAyah.number] || 0) : 0;
  const canRecord = !isCurrentCompleted && !autoAdvancing;

  if (authLoading || surahLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-[#FFD93D]/20 border-t-[#FFD93D] animate-spin" />
          <Star className="w-6 h-6 text-[#FFD93D] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <p className="text-white/60 text-sm animate-pulse">Casharkaaga waa soo socda...</p>
      </div>
    );
  }

  if (!child || !surah) return null;

  if (sessionExpired) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center px-4">
        <div className="text-6xl mb-4">&#x23F0;</div>
        <h2 className="text-white text-2xl font-bold mb-2">Wakhtigii way dhammaatay!</h2>
        <p className="text-white/60 mb-2">60 daqiiqo ayaad bartay - aad baad u mahadsantahay!</p>
        <p className="text-white/40 text-sm mb-6 text-center max-w-xs">Naftaada nasasho sii, kadibna ku soo noqo casharkaaga.</p>
        <div className="bg-white/5 rounded-2xl p-4 w-full max-w-xs border border-white/10 mb-6 text-center">
          <p className="text-[#FFD93D] text-lg font-bold">{completedCount}/{totalAyahs} aayah</p>
          <p className="text-white/40 text-xs mt-1">Aayado aad dhameysay</p>
        </div>
        <button onClick={() => setLocation("/child-dashboard")} className="bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] px-8 py-3 rounded-2xl font-bold w-full max-w-xs active:scale-95 transition-transform" data-testid="button-session-expired-back">
          Ku noqo Dashboard
        </button>
      </div>
    );
  }

  // ==============================
  // SESSION REVIEW SCREEN
  // ==============================
  if (sessionPhase === "review" && surah) {
    const learnedAyahs = sessionLearned.map(idx => surah.ayahs[idx]).filter(Boolean);
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col px-4 py-6" data-testid="session-review-screen">
        <div className="flex items-center mb-6">
          <button onClick={() => setSessionPhase("learning")} className="text-white/60 mr-3 p-2 rounded-xl bg-white/5 active:scale-95 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">Dib u Eegis</h1>
            <p className="text-white/50 text-xs">{learnedAyahs.length} aayad oo aad baratay</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-500/30 rounded-3xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">📖</span>
            <div>
              <p className="text-emerald-300 font-bold text-sm">Aayaadaad Maanta Baratay</p>
              <p className="text-white/50 text-xs">Akhri 3 jeer si xifdiga u adkeyso</p>
            </div>
          </div>
          <div className="space-y-3">
            {learnedAyahs.map((ayah, i) => (
              <div key={ayah.number} className="bg-white/5 rounded-2xl p-3 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-emerald-400 text-xs font-bold">Aayada {i + 1}</span>
                  <span className="text-white/30 text-xs">#{ayah.number}</span>
                </div>
                <p className="text-white text-right text-xl leading-loose font-arabic" dir="rtl">{ayah.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-4 mb-5">
          <p className="text-white font-bold text-center mb-3">
            Inteed u akhriyay?
          </p>
          <div className="flex justify-center gap-3 mb-4">
            {[1, 2, 3].map(n => (
              <div key={n} className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black border-2 transition-all ${reviewReadCount >= n ? "bg-emerald-500 border-emerald-400 text-white scale-105" : "bg-white/5 border-white/20 text-white/30"}`}>
                {reviewReadCount >= n ? "✓" : n}
              </div>
            ))}
          </div>
          {reviewReadCount < 3 ? (
            <button
              onClick={() => setReviewReadCount(c => Math.min(c + 1, 3))}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 rounded-2xl font-bold text-lg active:scale-95 transition-transform"
              data-testid="button-review-read"
            >
              ✅ Waan Akhriyay ({reviewReadCount}/3)
            </button>
          ) : (
            <div className="space-y-2">
              <div className="text-center text-emerald-400 font-bold text-sm mb-2">MaashaAllah! 3 jeer ayaad u akhriyay! ⭐</div>
              <button
                onClick={() => setSessionPhase("finaltest")}
                className="w-full bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] py-4 rounded-2xl font-black text-lg active:scale-95 transition-transform"
                data-testid="button-go-finaltest"
              >
                🎯 Diyaar baan ahay — Xifdi Bilow!
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==============================
  // FINAL TEST (XIFDI) SCREEN
  // ==============================
  if (sessionPhase === "finaltest" && surah) {
    const learnedAyahs = sessionLearned.map(idx => surah.ayahs[idx]).filter(Boolean);
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col px-4 py-6" data-testid="session-finaltest-screen">
        <div className="flex items-center mb-6">
          {!isFinalRecording && !isFinalChecking && !finalTestResult && (
            <button onClick={() => setSessionPhase("review")} className="text-white/60 mr-3 p-2 rounded-xl bg-white/5 active:scale-95 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          <div>
            <h1 className="text-white text-lg font-bold">Xifdi Qabso 🎯</h1>
            <p className="text-white/50 text-xs">Qoraalka waa la qariyay — akhri xifdi ah</p>
          </div>
        </div>

        {/* Ayah count tiles — text hidden */}
        <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-3xl p-4 mb-5">
          <p className="text-purple-300 text-sm font-bold mb-3 text-center">
            📜 {learnedAyahs.length} Aayad — Akhri isku xiga oo xifdi ah
          </p>
          <div className="space-y-2">
            {learnedAyahs.map((ayah, i) => (
              <div key={ayah.number} className="bg-white/5 rounded-2xl p-3 border border-white/10 flex items-center justify-between">
                <span className="text-purple-400 font-bold text-sm">Aayada {i + 1}</span>
                <span className="text-white/20 text-xs italic">— Qoraalka waa qarsan yahay —</span>
              </div>
            ))}
          </div>
        </div>

        {/* Result screen */}
        {finalTestResult ? (
          <div className={`rounded-3xl p-6 mb-5 border-2 text-center ${finalTestResult.passed ? "bg-emerald-900/40 border-emerald-400" : "bg-red-900/30 border-red-400/40"}`}>
            <div className="text-5xl mb-3">{finalTestResult.passed ? "🌟" : "💪"}</div>
            <p className={`font-black text-xl mb-2 ${finalTestResult.passed ? "text-emerald-300" : "text-red-300"}`}>
              {finalTestResult.passed ? "MaashaAllah! Ku guuleysatay!" : "Weli ma guuleysanin"}
            </p>
            <p className="text-white/70 text-sm mb-4">{finalTestResult.message}</p>
            {finalTestResult.passed && finalTestResult.starsEarned > 0 && (
              <div className="bg-[#FFD93D]/10 border border-[#FFD93D]/30 rounded-2xl p-3 mb-4">
                <p className="text-[#FFD93D] font-bold">+{finalTestResult.starsEarned} ⭐ Xiddig ayaad heshay!</p>
              </div>
            )}
            <div className="space-y-2">
              {!finalTestResult.passed && (
                <button
                  onClick={() => { setFinalTestResult(null); setReviewReadCount(0); setSessionPhase("review"); }}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-2xl font-bold active:scale-95 transition-transform"
                  data-testid="button-retry-xifdi"
                >
                  🔄 Dib u isku day
                </button>
              )}
              <button
                onClick={() => setLocation("/child-dashboard")}
                className="w-full bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] py-3 rounded-2xl font-bold active:scale-95 transition-transform"
                data-testid="button-dashboard-after-xifdi"
              >
                🏠 Ku noqo Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 mb-5">
            {isFinalChecking ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-16 h-16 rounded-full border-4 border-purple-400/20 border-t-purple-400 animate-spin" />
                <p className="text-white/70 text-sm">AI waxay hubinaysaa xifdigaaga...</p>
              </div>
            ) : (
              <>
                <p className="text-white/60 text-sm text-center px-4">
                  {isFinalRecording ? "🔴 Xifdi akhri — aayahaas oo dhan isku xiga..." : "Riix badhankaas oo bilow akhridda aayahaas oo dhan isku xiga"}
                </p>
                <button
                  onClick={isFinalRecording ? stopFinalTest : startFinalTest}
                  className={`w-32 h-32 rounded-full flex items-center justify-center text-5xl font-black border-4 transition-all active:scale-95 ${isFinalRecording ? "bg-red-500/20 border-red-400 animate-pulse text-red-400" : "bg-purple-600/20 border-purple-400 text-purple-300"}`}
                  data-testid="button-final-mic"
                >
                  {isFinalRecording ? "⏹" : "🎙"}
                </button>
                {isFinalRecording && (
                  <p className="text-red-400 text-sm font-bold animate-pulse">
                    Duubista socotaa... Jooji markuu dhammaado
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  const sessionMins = Math.floor(sessionTimeLeft / 60);
  const sessionSecs = sessionTimeLeft % 60;
  const currentReciter = RECITERS.find(r => r.id === selectedReciter) || RECITERS[0];


  return (
    <div className="min-h-screen bg-[#1a1a2e] relative" data-testid="quran-lesson-page">
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-center px-8">
            <div className="relative mb-6">
              <Trophy className="w-24 h-24 text-[#FFD93D] mx-auto animate-bounce" />
              <div className="absolute inset-0 flex items-center justify-center">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 bg-[#FFD93D] rounded-full animate-ping"
                    style={{
                      top: `${50 + 45 * Math.sin((i * 30 * Math.PI) / 180)}%`,
                      left: `${50 + 45 * Math.cos((i * 30 * Math.PI) / 180)}%`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            </div>
            <h2 className="text-4xl font-bold text-[#FFD93D] mb-3">Mahadsanid!</h2>
            <p className="text-white text-xl mb-4">Suurada {surah.name} waad dhamaysay!</p>
            <div className="flex justify-center gap-3 mt-4">
              {[1, 2, 3].map(i => (
                <Star key={i} className="w-12 h-12 text-[#FFD93D] fill-[#FFD93D] animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        </div>
      )}


      <div className="relative z-10">
        <div className="flex items-center gap-3 px-4 pt-6 pb-4">
          <button onClick={() => setLocation("/child-dashboard")} className="text-white/60 hover:text-white p-2 -ml-2 rounded-xl active:bg-white/10" data-testid="button-back">
            <ArrowLeft className="w-7 h-7" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-xl truncate" data-testid="text-surah-name">{surah.name}</h1>
            <p className="text-white/50 text-sm">{surah.englishName}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`text-center px-2 py-1 rounded-lg ${sessionTimeLeft <= 300 ? "bg-red-500/20" : "bg-white/5"}`}>
              <p className={`font-mono text-xs font-bold ${sessionTimeLeft <= 300 ? "text-red-400 animate-pulse" : "text-white/50"}`}>
                {sessionMins}:{sessionSecs.toString().padStart(2, "0")}
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl px-4 py-2 text-center">
              <p className="text-[#FFD93D] font-bold text-lg" data-testid="text-progress">{completedCount}/{totalAyahs}</p>
              <p className="text-white/40 text-[10px]">aayah</p>
            </div>
          </div>
        </div>

        <div className="px-4 mb-3">
          <div className="relative">
            <button
              onClick={() => setShowReciterPicker(!showReciterPicker)}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 transition-colors"
              data-testid="button-reciter-picker"
            >
              <Volume2 className="w-4 h-4 text-[#4ECDC4]" />
              <span className="text-white/70 text-sm">{currentReciter.name}</span>
              <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${showReciterPicker ? "rotate-180" : ""}`} />
            </button>
            {showReciterPicker && (
              <div className="absolute top-full left-0 mt-1 bg-[#2a2a4e] border border-white/10 rounded-xl overflow-hidden z-20 shadow-xl min-w-[240px]">
                {RECITERS.map(r => (
                  <button
                    key={r.id}
                    onClick={() => changeReciter(r.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      r.id === selectedReciter ? "bg-[#4ECDC4]/20 text-[#4ECDC4]" : "text-white/70 hover:bg-white/5"
                    }`}
                    data-testid={`button-reciter-${r.id}`}
                  >
                    <div className={`w-3 h-3 rounded-full border-2 ${r.id === selectedReciter ? "border-[#4ECDC4] bg-[#4ECDC4]" : "border-white/30"}`} />
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-white/40 font-['Amiri',_serif]" dir="rtl">{r.nameAr}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 mb-5">
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#FFD93D] to-[#FFA502] rounded-full transition-all duration-500"
              style={{ width: `${totalAyahs > 0 ? (completedCount / totalAyahs) * 100 : 0}%` }}
              data-testid="progress-bar" />
          </div>
        </div>

        <div className="px-4 mb-5">
          <div className="flex gap-2 flex-wrap">
            {surah.ayahs.map((ayah, idx) => {
              const prog = ayahProgress[ayah.number];
              const isCurrent = idx === currentAyahIndex;
              const done = prog?.completed;
              const accessible = isAyahAccessible(idx);
              return (
                <button key={ayah.number} onClick={() => accessible && goToAyah(idx)}
                  disabled={!accessible}
                  className={`w-10 h-10 rounded-full text-sm font-bold flex items-center justify-center transition-all ${
                    isCurrent ? "ring-3 ring-[#FFD93D] ring-offset-2 ring-offset-[#1a1a2e] scale-110" : ""
                  } ${done ? "bg-green-500/30 text-green-300 border-2 border-green-500/50" :
                    !accessible ? "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed" :
                    prog ? "bg-yellow-500/20 text-yellow-300 border-2 border-yellow-500/40" :
                    "bg-white/10 text-white/50 border border-white/10"
                  }`}
                  data-testid={`button-ayah-${ayah.number}`}
                >
                  {done ? <CheckCircle2 className="w-5 h-5" /> : !accessible ? <Lock className="w-4 h-4" /> : idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {currentAyah && (
          <div className="px-4 mb-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white/40 text-sm">Aayada {currentAyahIndex + 1}</span>
                {isCurrentCompleted && (
                  <span className="flex items-center gap-1.5 text-green-400 text-sm bg-green-500/10 px-3 py-1 rounded-full">
                    <CheckCircle2 className="w-4 h-4" /> Sax!
                  </span>
                )}
              </div>

              {/* Quran text: always visible */}
              <div className="text-right mb-5" dir="rtl">
                {isCurrentCompleted ? (
                  <div className="rounded-2xl border-2 border-green-400/40 bg-green-500/10 p-4" data-testid="text-ayah-arabic">
                    <p className="text-white text-3xl leading-[2.4] font-['Amiri',_serif]">
                      {currentAyah.text}
                    </p>
                  </div>
                ) : (
                  <div className={`rounded-2xl p-4 transition-all duration-500 ${isPlaying ? "border-2 border-[#4ECDC4]/60 bg-[#4ECDC4]/10 shadow-lg shadow-[#4ECDC4]/10" : "border border-white/15 bg-white/5"}`} data-testid="text-ayah-arabic">
                    {isPlaying && (
                      <p className="text-[#4ECDC4] text-xs font-bold mb-2 text-center tracking-wide">🔊 Dhageyso aayada</p>
                    )}
                    <p className="text-white text-3xl leading-[2.4] font-['Amiri',_serif]">
                      {currentAyah.text}
                    </p>
                  </div>
                )}
              </div>

              {!isCurrentCompleted && (
                <div className="flex items-center gap-2 mb-4 px-1">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${listenCount > 0 ? "bg-green-500/20 text-green-300" : "bg-[#4ECDC4]/20 text-[#4ECDC4]"}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${listenCount > 0 ? "bg-green-500/30" : "bg-[#4ECDC4]/30"}`}>
                      {listenCount > 0 ? "✓" : "1"}
                    </span>
                    Dhageyso {listenCount > 0 && <span className="font-black">({listenCount}x)</span>}
                  </div>
                  <div className="flex-1 h-px bg-white/10" />
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-[#FFD93D]/20 text-[#FFD93D]">
                    <span className="w-5 h-5 rounded-full bg-[#FFD93D]/30 flex items-center justify-center text-[10px] font-bold">2</span>
                    Akhri
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-5">
                <button onClick={isPlaying ? stopAudio : playAyah}
                  disabled={isLoadingAudio}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                    isPlaying ? "bg-red-500/20 text-red-400 border-2 border-red-500/40" :
                    "bg-[#4ECDC4]/20 text-[#4ECDC4] border-2 border-[#4ECDC4]/40 hover:bg-[#4ECDC4]/30"
                  }`}
                  data-testid="button-play-ayah"
                >
                  {isLoadingAudio ? <Loader2 className="w-7 h-7 animate-spin" /> :
                    <Volume2 className="w-7 h-7" />}
                </button>

                <button onClick={isRecording ? stopRecording : startRecording}
                  disabled={isChecking || !canRecord || autoAdvancing}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                    isRecording ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50 scale-110" :
                    isChecking || autoAdvancing ? "bg-white/10 text-white/30" :
                    !canRecord ? "bg-white/10 text-white/20 border-2 border-white/5 cursor-not-allowed" :
                    "bg-gradient-to-br from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] shadow-lg shadow-[#FFD93D]/30 hover:shadow-[#FFD93D]/50"
                  }`}
                  data-testid="button-record"
                >
                  {isChecking ? <Loader2 className="w-8 h-8 animate-spin" /> :
                   autoAdvancing ? <ChevronRight className="w-8 h-8 animate-pulse" /> :
                   isRecording ? <MicOff className="w-8 h-8" /> :
                   !canRecord ? <Lock className="w-6 h-6" /> :
                   <Mic className="w-8 h-8" />}
                </button>
              </div>

              {audioFailed && !hasListened && (
                <div className="text-center mt-4">
                  <p className="text-orange-400/80 text-sm mb-2">Audio-ga ma shaqeynayo. Isku day mar kale ama ka bood.</p>
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={playAyah}
                      className="px-4 py-2 rounded-full bg-[#4ECDC4]/10 text-[#4ECDC4] text-sm font-medium border border-[#4ECDC4]/20 hover:bg-[#4ECDC4]/20 active:scale-95 transition-all flex items-center gap-1.5"
                      data-testid="button-retry-audio"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Isku day
                    </button>
                    <button onClick={() => { setAudioFailed(false); setHasListened(true); }}
                      className="px-4 py-2 rounded-full bg-white/5 text-white/50 text-sm font-medium border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
                      data-testid="button-skip-listen"
                    >
                      Ka bood
                    </button>
                  </div>
                </div>
              )}

              {canRecord && !isRecording && !isChecking && !autoAdvancing && (
                <p className="text-center text-[#FFD93D]/80 text-sm mt-4 px-2">
                  🎙 Mic-ka riix oo aayada akhri!
                </p>
              )}

              {!isPlaying && !isRecording && !isChecking && listenCount > 0 && !autoAdvancing && (
                <button onClick={playAyah}
                  className="flex items-center justify-center gap-2 mx-auto mt-3 px-5 py-2 rounded-full bg-[#4ECDC4]/10 text-[#4ECDC4] text-sm font-medium border border-[#4ECDC4]/20 hover:bg-[#4ECDC4]/20 active:scale-95 transition-all"
                  data-testid="button-replay"
                >
                  <RotateCcw className="w-4 h-4" />
                  Dhageyso mar kale ({listenCount}x)
                </button>
              )}

              {autoAdvancing && (
                <div className="text-center mt-4">
                  <p className="text-green-400 font-bold text-base animate-pulse">⭐ Sax! Aayada xigta...</p>
                </div>
              )}

              {isRecording && (
                <div className="text-center mt-4">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-1 bg-red-400 rounded-full animate-pulse" style={{
                        height: `${Math.random() * 20 + 8}px`,
                        animationDelay: `${i * 0.1}s`
                      }} />
                    ))}
                  </div>
                  <p className="text-red-400 text-base font-medium animate-pulse">
                    Waan ku dhageysan ahay...
                  </p>
                </div>
              )}

              {isChecking && (
                <div className="text-center mt-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-[#FFD93D] rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                    <div className="w-2 h-2 bg-[#FFD93D] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <div className="w-2 h-2 bg-[#FFD93D] rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                  </div>
                  <p className="text-[#FFD93D] text-base font-medium">
                    Waan hubinayaa...
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {checkResult && !autoAdvancing && (
          <div className="px-4 mb-6">
            {checkResult.outcome === "correct" ? (
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-3xl p-5 border-2 border-green-500/40 text-center" data-testid="result-correct">
                <div className="text-5xl mb-2">✅</div>
                <h3 className="text-green-300 font-bold text-2xl mb-1">Sax!</h3>
                <p className="text-white/70 text-sm mb-3" data-testid="text-feedback">{checkResult.message}</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3].map(i => (
                    <Star key={i} className="w-7 h-7 text-[#FFD93D] fill-[#FFD93D] animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-orange-500/15 to-amber-500/10 rounded-3xl p-5 border-2 border-orange-400/30 text-center" data-testid="result-retry">
                <div className="text-4xl mb-2">⚠️</div>
                <h3 className="text-orange-300 font-bold text-xl mb-1">Waad Khaladay</h3>
                <p className="text-white/70 text-sm mb-3" data-testid="text-feedback">{checkResult.message}</p>
                <p className="text-orange-200 text-xs bg-orange-500/10 rounded-xl px-3 py-2 mb-3">
                    📖 Aayada aqri oo dhageyso, ka dibna mar kale isku day
                  </p>
                <div className="flex gap-3">
                  <button onClick={playAyah}
                    className="flex-1 py-3 rounded-2xl bg-[#4ECDC4]/20 text-[#4ECDC4] text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all border border-[#4ECDC4]/30"
                    data-testid="button-replay"
                  >
                    <RotateCcw className="w-4 h-4" /> Dhageyso
                  </button>
                  <button onClick={startRecording}
                    className="flex-1 py-3 rounded-2xl bg-[#FFD93D]/20 text-[#FFD93D] text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all border border-[#FFD93D]/30"
                    data-testid="button-try-again"
                  >
                    <Mic className="w-4 h-4" /> Isku day!
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ FULL SURAH REVIEW SCREEN ═══ */}
        {fullSurahReview && (
          <div className="px-4 mb-6">
            <div className="bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-3xl p-6 border-2 border-[#FFD93D]/40 text-center">
              <div className="text-5xl mb-3">📖</div>
              <h3 className="text-[#FFD93D] font-bold text-xl mb-1">Aad baad u mahadsantahay!</h3>
              <p className="text-white/70 text-sm mb-4">
                Suurada oo dhan waa bartay — hadda dhageyso oo dib u akhriso!
              </p>

              {/* Full surah text display */}
              <div className="bg-black/30 rounded-2xl p-4 mb-4 text-right max-h-64 overflow-y-auto border border-[#FFD93D]/20">
                {surah?.ayahs.map((ayah, i) => (
                  <p key={ayah.number}
                    className={`font-arabic text-xl leading-loose mb-2 transition-all duration-300 ${
                      reviewPlaying && reviewAyahIndex === i
                        ? "text-[#FFD93D] text-2xl"
                        : "text-white/80"
                    }`}
                    dir="rtl"
                  >
                    {ayah.text} {ayah.number === 1 && surahNumber !== 9 ? "" : `﴿${ayah.number}﴾`}
                  </p>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                {!reviewPlaying ? (
                  <button
                    onClick={playFullSurahSequential}
                    className="w-full py-4 bg-gradient-to-r from-[#4ECDC4] to-[#45B7AA] text-[#1a1a2e] font-bold text-lg rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
                    data-testid="button-play-full-surah"
                  >
                    🔊 Dhageyso Suurada oo dhan
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-3 py-4">
                    <div className="w-3 h-3 bg-[#FFD93D] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-3 h-3 bg-[#FFD93D] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-3 h-3 bg-[#FFD93D] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    <span className="text-white/60 text-sm">
                      Aayah {(reviewAyahIndex + 1)}/{surah?.ayahs.length}...
                    </span>
                  </div>
                )}
                <button
                  onClick={finishFullReview}
                  className="w-full py-3 bg-white/10 text-white/70 border border-white/20 font-bold text-base rounded-2xl active:scale-95 transition-all"
                  data-testid="button-finish-review"
                >
                  {reviewPlaying ? "Jooji oo dhamee →" : "Dhamee Dhagsiga →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {surahComplete && !showCelebration && !fullSurahReview && (
          <div className="px-4 mb-6">
            <div className="bg-gradient-to-r from-[#FFD93D]/20 to-[#FFA502]/20 rounded-3xl p-6 border-2 border-[#FFD93D]/30 text-center">
              <Trophy className="w-16 h-16 text-[#FFD93D] mx-auto mb-3" />
              <h3 className="text-white font-bold text-2xl mb-2">Hambalyo!</h3>
              <p className="text-white/70 text-lg mb-4">Suurada dhan waad dhamaysay!</p>
              <div className="flex justify-center gap-2 mb-5">
                {[1, 2, 3].map(i => <Star key={i} className="w-10 h-10 text-[#FFD93D] fill-[#FFD93D]" />)}
              </div>
              <div className="flex flex-col gap-3">
                {nextSurahNumber && (
                  <button onClick={() => setLocation(`/quran-lesson/${nextSurahNumber}`)}
                    className="w-full py-4 bg-gradient-to-r from-[#4ECDC4] to-[#45B7AA] text-[#1a1a2e] font-bold text-lg rounded-2xl hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2"
                    data-testid="button-next-surah"
                  >
                    Sii wad Suurada xigta <ChevronRight className="w-5 h-5" />
                  </button>
                )}
                <button onClick={() => setLocation("/child-dashboard")}
                  className={`w-full py-4 font-bold text-lg rounded-2xl hover:opacity-90 transition-all active:scale-95 ${
                    nextSurahNumber
                      ? "bg-white/10 text-white/70 border border-white/10"
                      : "bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e]"
                  }`}
                  data-testid="button-back-to-dashboard"
                >
                  Ku noqo Casharrada
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-3xl bg-white/5 border border-white/10 p-4 md:p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-black text-lg">Ciyaaraha Juz Amma</h4>
                <span className="text-white/50 text-xs">Furan marka suuraddu dhammaato</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => setLocation(`/quran-game/word-puzzle/${surahNumber}`)}
                  className="rounded-2xl px-4 py-3 bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 font-bold"
                  data-testid="button-open-word-puzzle"
                >
                  Xarafaha Aayada
                </button>
                <button
                  onClick={() => setLocation(`/quran-game/memory-match/${surahNumber}`)}
                  className="rounded-2xl px-4 py-3 bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-bold"
                  data-testid="button-open-memory-match"
                >
                  Aayah Xusuus
                </button>
                <button
                  onClick={() => setLocation(`/quran-game/surah-quiz/${surahNumber}`)}
                  className="rounded-2xl px-4 py-3 bg-amber-500/20 border border-amber-400/40 text-amber-200 font-bold"
                  data-testid="button-open-surah-quiz"
                >
                  Suurad Quiz
                </button>
                <button
                  onClick={() => setLocation(`/quran-game/somali-flashcards/${surahNumber}`)}
                  className="rounded-2xl px-4 py-3 bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-200 font-bold"
                  data-testid="button-open-somali-flashcards"
                >
                  Somali Flashcards
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-3xl bg-white/5 border border-white/10 p-4 md:p-5">
              <h4 className="text-white font-black text-lg mb-3">Abaalmarin iyo Hadiyad</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xs text-white/60">Aayah Stars</p>
                  <p className="text-lg font-black text-[#FFD93D]">{rewardSummary?.aayahStars ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xs text-white/60">Surah Trophies</p>
                  <p className="text-lg font-black text-emerald-300">{rewardSummary?.surahTrophies ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xs text-white/60">Game Coins</p>
                  <p className="text-lg font-black text-amber-300">{rewardSummary?.gameCoins ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xs text-white/60">Tokens</p>
                  <p className="text-lg font-black text-cyan-300">{rewardSummary?.gameTokens ?? 0}</p>
                </div>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <p className="text-sm font-bold text-white mb-2">Badges aad heshay</p>
                {rewardSummary?.badges?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {rewardSummary.badges.slice(0, 6).map((badge) => (
                      <span key={badge.key} className="rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs text-white/90 font-bold">
                        {badge.icon} {badge.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/60">Weli badge maadan helin, sii wad dadaalka.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Floating "Diyaar ma ahay" button — shows when 2+ ayahs learned this session */}
        {sessionLearned.length >= 2 && !surahComplete && !fullSurahReview && (
          <div className="fixed bottom-6 left-4 right-4 z-40">
            <button
              onClick={() => { setReviewReadCount(0); setSessionPhase("review"); }}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-2xl font-black text-base shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
              data-testid="button-ready-to-leave"
            >
              ✅ Diyaar ma ahay — Waan Ka Baxayaa ({sessionLearned.length} aayad)
            </button>
          </div>
        )}

        <div className="h-24" />
      </div>
    </div>
  );
}
