import { useState, useEffect, useRef, useCallback } from "react";
import { useChildAuth } from "@/contexts/ChildAuthContext";
import { useLocation, useParams } from "wouter";
import { useQuranText } from "@/hooks/useQuranText";
import {
  ArrowLeft, Mic, MicOff, CheckCircle2, Star, RotateCcw,
  ChevronRight, Volume2, Loader2, Lock, Trophy, ChevronDown,
  Gamepad2, Award, Flame, TrendingUp, BookOpen
} from "lucide-react";

type DashboardTab = "quran" | "games" | "rewards";
type AyahLearningStage = "listening" | "repeating" | "memorizing";
type LessonFlowState = "ayah_learning" | "lesson_review" | "surah_complete";
type LessonReviewStep = "full_listen" | "practice_with_text" | "final_test" | "reinforcement";

interface QuranLessonResumeState {
  currentAyahIndex: number;
  currentStage: AyahLearningStage;
  lessonFlow: LessonFlowState;
  lessonReviewStep: LessonReviewStep;
  activeTab: DashboardTab;
  updatedAt: number;
}

interface UnlockedGame {
  surahNumber: number;
  surahName: string;
  starsEarned: number;
  games: string[];
}

const GAME_INFO: Record<string, { label: string; emoji: string }> = {
  word_puzzle: { label: "Kelmadaha", emoji: "🧩" },
  memory_match: { label: "Xasuusta", emoji: "🃏" },
  surah_quiz: { label: "Imtixaan", emoji: "⚡" },
  somali_flashcards: { label: "Kaarka", emoji: "📚" },
};
const GAME_ROUTES: Record<string, string> = {
  word_puzzle: "/quran-game/word-puzzle",
  memory_match: "/quran-game/memory-match",
  surah_quiz: "/quran-game/surah-quiz",
  somali_flashcards: "/quran-game/somali-flashcards",
};

interface AyahProgress {
  ayahNumber: number;
  attempts: number;
  bestScore: number;
  lastScore: number;
  completed: boolean;
}

interface CheckResult {
  outcome: "correct" | "needs_retry";
  passed?: boolean;
  completed: boolean;
  status?: "retry" | "needs_improvement" | "good";
  message: string;
  score?: number;
}

interface LessonSubmitResult {
  success: boolean;
  isPassed: boolean;
  isSoftPass: boolean;
  attemptNumber: number;
  completed: boolean;
  mode: "repeat" | "memorize";
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

const CHECK_UI_CLEAR_MS = 1200;
const SOFT_PASS_CLEAR_MS = 900;
const AUTO_ADVANCE_DELAY_MS = {
  milestone: 1400,
  softPass: 900,
  standard: 1200,
} as const;
const NEXT_AYAH_AUTOPLAY_DELAY_MS = 150;
const RETRY_AUDIO_DELAY_MS = {
  normal: 300,
  repeated: 150,
} as const;

const LESSON_FLOW_VALUES: LessonFlowState[] = ["ayah_learning", "lesson_review", "surah_complete"];
const LESSON_REVIEW_STEP_VALUES: LessonReviewStep[] = ["full_listen", "practice_with_text", "final_test", "reinforcement"];
const DASHBOARD_TAB_VALUES: DashboardTab[] = ["quran", "games", "rewards"];
const AYAH_STAGE_VALUES: AyahLearningStage[] = ["listening", "repeating", "memorizing"];

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
  const [lessonFlow, setLessonFlow] = useState<LessonFlowState>("ayah_learning");
  const [lessonReviewStep, setLessonReviewStep] = useState<LessonReviewStep>("full_listen");
  const [fullLessonListenRounds, setFullLessonListenRounds] = useState(0);
  const [lessonPracticeReads, setLessonPracticeReads] = useState(0);
  const [isLessonReviewPlaying, setIsLessonReviewPlaying] = useState(false);
  const [isLessonReviewRecording, setIsLessonReviewRecording] = useState(false);
  const [isLessonReviewChecking, setIsLessonReviewChecking] = useState(false);
  const [lessonReviewMessage, setLessonReviewMessage] = useState<string | null>(null);
  const [finalTestNoMajorErrorAttempts, setFinalTestNoMajorErrorAttempts] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(60 * 60);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [hasListened, setHasListened] = useState(false);
  const [currentStage, setCurrentStage] = useState<AyahLearningStage>("repeating");
  const [selectedReciter, setSelectedReciter] = useState<string>(() => {
    try { return localStorage.getItem("quran_reciter") || "husary_muallim"; } catch { return "husary_muallim"; }
  });
  const [showReciterPicker, setShowReciterPicker] = useState(false);
  const [rewardSummary, setRewardSummary] = useState<RewardSummary | null>(null);

  const [listenCount, setListenCount] = useState(0);
  const [autoAdvancing, setAutoAdvancing] = useState(false);
  const [ayahMistakes, setAyahMistakes] = useState<Record<number, number>>({});
  const [currentAyahFailures, setCurrentAyahFailures] = useState(0);
  const [slowMode, setSlowMode] = useState(false);
  const [hintAvailable, setHintAvailable] = useState(false);
  const [hintPlaying, setHintPlaying] = useState(false);
  const [showSessionCelebration, setShowSessionCelebration] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<DashboardTab>("quran");

  // Session-based learning: track ayahs learned this visit
  const [sessionLearned, setSessionLearned] = useState<number[]>([]); // ayah INDICES completed this session

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  const audioTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitInFlightRef = useRef(false);
  const resumeAppliedRef = useRef<number | null>(null);
  const pendingRestoredStageRef = useRef<AyahLearningStage | null>(null);

  const getResumeStorageKey = useCallback(() => {
    if (!child?.id || !surahNumber) return null;
    return `quran_lesson_resume:${child.id}:${surahNumber}`;
  }, [child?.id, surahNumber]);

  useEffect(() => {
    if (!authLoading && !child) setLocation("/child-login");
  }, [child, authLoading, setLocation]);

  useEffect(() => {
    if (!surahNumber || !child) return;
    setProgressLoaded(false);
    fetch(`/api/quran/surah/${surahNumber}/progress`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.progress) setAyahProgress(data.progress);
      })
      .catch(() => {})
      .finally(() => setProgressLoaded(true));
  }, [surahNumber, child]);

  useEffect(() => {
    resumeAppliedRef.current = null;
    setLessonFlow("ayah_learning");
    setLessonReviewStep("full_listen");
    setFullLessonListenRounds(0);
    setLessonPracticeReads(0);
    setIsLessonReviewPlaying(false);
    setIsLessonReviewRecording(false);
    setIsLessonReviewChecking(false);
    setLessonReviewMessage(null);
    setFinalTestNoMajorErrorAttempts(0);
    setSurahComplete(false);
  }, [surahNumber]);


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
    const restoredStage = pendingRestoredStageRef.current;
    setCurrentStage(restoredStage ?? "repeating");
    pendingRestoredStageRef.current = null;
    setListenCount(0);
    setAudioFailed(false);
    setAutoAdvancing(false);
    setCurrentAyahFailures(0);
    setSlowMode(false);
    setHintAvailable(false);
    setHintPlaying(false);
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    submitInFlightRef.current = false;
  }, [currentAyahIndex]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!surah || !progressLoaded || !child || resumeAppliedRef.current === surahNumber) return;

    const firstIncompleteIndex = surah.ayahs.findIndex((ayah) => !ayahProgress[ayah.number]?.completed);

    let targetAyahIndex = firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0;
    let targetStage: AyahLearningStage = "repeating";
    let targetFlow: LessonFlowState = "ayah_learning";
    let targetReviewStep: LessonReviewStep = "full_listen";
    let targetTab: DashboardTab = "quran";

    try {
      const storageKey = getResumeStorageKey();
      if (storageKey) {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<QuranLessonResumeState>;

          if (typeof parsed.currentAyahIndex === "number" && parsed.currentAyahIndex >= 0 && parsed.currentAyahIndex < surah.ayahs.length) {
            targetAyahIndex = parsed.currentAyahIndex;
          }

          if (parsed.currentStage && AYAH_STAGE_VALUES.includes(parsed.currentStage)) {
            targetStage = parsed.currentStage;
          }

          if (parsed.lessonFlow && LESSON_FLOW_VALUES.includes(parsed.lessonFlow)) {
            targetFlow = parsed.lessonFlow;
          }

          if (parsed.lessonReviewStep && LESSON_REVIEW_STEP_VALUES.includes(parsed.lessonReviewStep)) {
            targetReviewStep = parsed.lessonReviewStep;
          }

          if (parsed.activeTab && DASHBOARD_TAB_VALUES.includes(parsed.activeTab)) {
            targetTab = parsed.activeTab;
          }
        }
      }
    } catch {
      // Ignore invalid resume payloads and fallback to server-derived first incomplete ayah.
    }

    pendingRestoredStageRef.current = targetStage;
    setCurrentAyahIndex(targetAyahIndex);
    setLessonFlow(targetFlow);
    setLessonReviewStep(targetReviewStep);
    setActiveTab(targetTab);
    resumeAppliedRef.current = surahNumber;
  }, [surah, progressLoaded, surahNumber, ayahProgress, child, getResumeStorageKey]);

  useEffect(() => {
    if (!child || !progressLoaded) return;

    const storageKey = getResumeStorageKey();
    if (!storageKey) return;

    const resumeState: QuranLessonResumeState = {
      currentAyahIndex,
      currentStage,
      lessonFlow,
      lessonReviewStep,
      activeTab,
      updatedAt: Date.now(),
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(resumeState));
    } catch {
      // Ignore storage failures (private mode/quota) and continue with in-memory lesson state.
    }
  }, [
    child,
    progressLoaded,
    getResumeStorageKey,
    currentAyahIndex,
    currentStage,
    lessonFlow,
    lessonReviewStep,
    activeTab,
  ]);

  const currentAyah = surah?.ayahs?.[currentAyahIndex];
  const totalAyahs = surah?.numberOfAyahs || 0;
  const completedCount = Object.values(ayahProgress).filter(p => p.completed).length;
  const isCurrentCompleted = currentAyah ? ayahProgress[currentAyah.number]?.completed : false;

  const isAyahAccessible = (index: number): boolean => {
    return !!surah && index >= 0 && index < totalAyahs;
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
      audio.playbackRate = slowMode ? 0.75 : 1;

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
        setListenCount((prev) => prev + 1);
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
  }, [currentAyah, isPlaying, surahNumber, selectedReciter, getAudioUrl, preloadNextAyah, slowMode]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setHintPlaying(false);
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
    if (isChecking || isRecording || autoAdvancing) return;

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
      setHintPlaying(false);
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
  }, [autoAdvancing, isChecking, isLikelyIPhoneSafari, isRecording, pickRecorderMimeType]);

  const playHintAndRecord = useCallback(async () => {
    if (!currentAyah || isChecking || isRecording || autoAdvancing || hintPlaying) return;

    setHintPlaying(true);
    setAudioFailed(false);

    try {
      const audioUrl = getAudioUrl(surahNumber, currentAyah.number, selectedReciter);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.playbackRate = slowMode ? 0.75 : 1;

      audio.onplay = () => {
        setIsPlaying(true);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setHasListened(true);
        setListenCount((prev) => prev + 1);
        setHintPlaying(false);
        setTimeout(() => {
          startRecording().catch(() => {});
        }, 150);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setHintPlaying(false);
        setAudioFailed(true);
      };

      await audio.play();
    } catch {
      setHintPlaying(false);
      setAudioFailed(true);
    }
  }, [autoAdvancing, currentAyah, getAudioUrl, hintPlaying, isChecking, isRecording, selectedReciter, slowMode, startRecording, surahNumber]);

  const playFullLessonRecitation = useCallback(async () => {
    if (!surah || isLessonReviewPlaying || isLessonReviewRecording || isLessonReviewChecking) return;

    setLessonReviewMessage("Dhageyso casharka oo dhan");
    setIsLessonReviewPlaying(true);

    try {
      for (const ayah of surah.ayahs) {
        await new Promise<void>((resolve) => {
          const url = getAudioUrl(surahNumber, ayah.number, selectedReciter);
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onplay = () => setIsPlaying(true);
          audio.onended = () => {
            setIsPlaying(false);
            resolve();
          };
          audio.onerror = () => {
            setIsPlaying(false);
            resolve();
          };
          audio.play().catch(() => resolve());
        });
      }
    } finally {
      setIsLessonReviewPlaying(false);
      setIsPlaying(false);
    }
  }, [getAudioUrl, isLessonReviewChecking, isLessonReviewPlaying, isLessonReviewRecording, selectedReciter, surah, surahNumber]);

  const startLessonReviewRecording = useCallback(async () => {
    if (isLessonReviewChecking || isLessonReviewRecording || isLessonReviewPlaying) return;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Browser-kan ma taageerayo microphone recording");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      setIsLessonReviewRecording(true);
      setLessonReviewMessage(
        lessonReviewStep === "final_test"
          ? "Quraanka qalbiga ka akhri"
          : "Akhri adigoo eegaya"
      );
    } catch {
      alert("Fadlan oggolow microphone-ka kadibna mar kale isku day");
    }
  }, [isLessonReviewChecking, isLessonReviewPlaying, isLessonReviewRecording, lessonReviewStep, pickRecorderMimeType]);

  const stopLessonReviewRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !surah || submitInFlightRef.current) return;

    submitInFlightRef.current = true;
    setIsLessonReviewRecording(false);
    setIsLessonReviewChecking(true);

    const recorder = mediaRecorderRef.current;
    await new Promise<void>((resolve) => {
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((t) => t.stop());
        resolve();
      };
      recorder.stop();
    });

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");
    formData.append("surahNumber", surahNumber.toString());
    formData.append("ayahNumber", "full");
    formData.append("mode", lessonReviewStep === "final_test" ? "memorize" : "repeat");

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
      if (lessonReviewStep === "final_test") {
        const completeFinalReview = (message: string) => {
          setFinalTestNoMajorErrorAttempts(0);
          setLessonReviewMessage(message);
          setShowCelebration(true);
          setTimeout(() => {
            setShowCelebration(false);
          }, 1800);
          setLessonFlow("surah_complete");
          setSurahComplete(true);
        };

        if (result.passed) {
          completeFinalReview("Hambalyo! Waad ku guuleysatay");
        } else {
          const nextNoMajorErrorAttempts = finalTestNoMajorErrorAttempts + 1;
          setFinalTestNoMajorErrorAttempts(nextNoMajorErrorAttempts);
          const isNearPass = result.status === "needs_improvement" || (result.score ?? 0) >= 35;

          if (isNearPass || nextNoMajorErrorAttempts >= 2) {
            completeFinalReview("Waad ku gudubtay! Casharka oo dhan waa sax, sii wad.");
          } else {
            setLessonReviewStep("reinforcement");
            setLessonReviewMessage("Hal mar kale oo kooban isku day, kadib waad gudbeysaa.");
          }
        }
      } else {
        setLessonReviewMessage("Iskiis u akhri, markaad diyaar noqoto sii wad");
      }
    } catch (error: any) {
      setLessonReviewMessage(error?.message || "Isku day mar kale, waad awooddaa");
    }

    setIsLessonReviewChecking(false);
    submitInFlightRef.current = false;
  }, [finalTestNoMajorErrorAttempts, lessonReviewStep, surah, surahNumber]);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !currentAyah || submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setIsRecording(false);
    setIsChecking(true);
    const learningMode = currentStage === "memorizing" ? "memorize" : "repeat";

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
    formData.append("mode", learningMode);

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

      let submitResult: LessonSubmitResult | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const submitResponse = await fetch("/api/quran/lesson/submit", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              surahNumber,
              ayahNumber: currentAyah.number,
              isCorrect: result.passed,
              mode: learningMode,
              score: result.score ?? 0,
            }),
          });

          if (!submitResponse.ok) {
            const submitError = await submitResponse.json().catch(() => null);
            throw new Error(submitError?.error || "Submit failed");
          }

          submitResult = await submitResponse.json();
          break;
        } catch (submitError) {
          if (attempt === 1) {
            console.error("Quran lesson submit failed:", submitError);
          }
        }
      }

      const wasAlreadyCompleted = ayahProgress[currentAyah.number]?.completed || false;
      const wasPassed = submitResult?.isPassed ?? result.passed;
      const isSoftPass = submitResult?.isSoftPass ?? false;
      const nextAttemptCount = submitResult?.attemptNumber ?? ((ayahProgress[currentAyah.number]?.attempts || 0) + 1);
      const completedNow = submitResult?.completed ?? (learningMode === "memorize" && wasPassed);
      // Strict gate: ayah completion only counts when AI passes while child is in memorization mode.
      const completedFromMemoryNow = learningMode === "memorize" && wasPassed && completedNow;
      const nextResult: CheckResult = wasPassed
        ? {
            outcome: "correct",
        completed: completedFromMemoryNow,
            score: result.score,
            message: learningMode === "repeat"
              ? "Fiican! Hadda qoraalka waan qarinaynaa, qalbigaagana ka akhri."
              : (isSoftPass ? "✨ Waad saxday, sii wad!" : result.message),
          }
        : {
            ...result,
            completed: false,
          };
      const updatedProgress = {
        ...ayahProgress,
        [currentAyah.number]: {
          ayahNumber: currentAyah.number,
          attempts: nextAttemptCount,
          bestScore: Math.max(ayahProgress[currentAyah.number]?.bestScore || 0, result.score || 0),
          lastScore: result.score || 0,
          completed: completedFromMemoryNow || wasAlreadyCompleted,
        }
      };
      setAyahProgress(updatedProgress);
      setCheckResult(nextResult);

      if (isSoftPass) {
        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = setTimeout(() => {
          setCheckResult(null);
        }, SOFT_PASS_CLEAR_MS);
      }

      if (learningMode === "repeat" && wasPassed) {
        setCurrentAyahFailures(0);
        setSlowMode(false);
        setHintAvailable(false);
        setCurrentStage("memorizing");

        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = setTimeout(() => {
          setCheckResult(null);
        }, CHECK_UI_CLEAR_MS);
      } else if (wasPassed && completedFromMemoryNow && !wasAlreadyCompleted) {
        setCurrentAyahFailures(0);
        setSlowMode(false);
        setHintAvailable(false);

        // Track this ayah index in the session
        const nextSessionLearned = sessionLearned.includes(currentAyahIndex)
          ? sessionLearned
          : [...sessionLearned, currentAyahIndex];
        setSessionLearned(nextSessionLearned);

        const newCompletedCount = Object.values(updatedProgress).filter(p => p.completed).length;
        const isLast = newCompletedCount >= totalAyahs;
        if (isLast) {
          setLessonFlow("lesson_review");
          setLessonReviewStep("full_listen");
          setFinalTestNoMajorErrorAttempts(0);
          setFullLessonListenRounds(0);
          setLessonPracticeReads(0);
          setLessonReviewMessage("Dhageyso casharka oo dhan");
          setActiveTab("quran");
        } else {
          const showMilestone = nextSessionLearned.length > 0 && nextSessionLearned.length % 3 === 0;
          if (showMilestone) {
            setShowSessionCelebration(true);
          }
          // Auto-advance quickly so child momentum stays high.
          setAutoAdvancing(true);
          const nextIdx = Math.min(currentAyahIndex + 1, totalAyahs - 1);
          autoAdvanceTimeoutRef.current = setTimeout(() => {
            setShowSessionCelebration(false);
            setAutoAdvancing(false);
            setCurrentAyahIndex(nextIdx);
            setCheckResult(null);
            // Auto-play sheikh recitation for the new ayah
            if (surah && surah.ayahs[nextIdx]) {
              const nextAyahNum = surah.ayahs[nextIdx].number;
              const url = getAudioUrl(surahNumber, nextAyahNum, selectedReciter);
              if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
              const audio = new Audio(url);
              audioRef.current = audio;
              audio.onplay = () => { setIsPlaying(true); setIsLoadingAudio(false); };
              audio.onended = () => {
                setIsPlaying(false);
                setHasListened(true);
                // preload the ayah after the one we just advanced to
                if (surah && nextIdx + 1 < surah.ayahs.length) {
                  const preloadAyahNum = surah.ayahs[nextIdx + 1].number;
                  const preloadUrl = getAudioUrl(surahNumber, preloadAyahNum, selectedReciter);
                  const pa = new Audio();
                  pa.preload = "auto";
                  pa.src = preloadUrl;
                  preloadRef.current = pa;
                }
              };
              audio.onerror = () => { setIsPlaying(false); setIsLoadingAudio(false); };
              setTimeout(() => audio.play().catch(() => {}), NEXT_AYAH_AUTOPLAY_DELAY_MS);
            }
          }, showMilestone ? AUTO_ADVANCE_DELAY_MS.milestone : (isSoftPass ? AUTO_ADVANCE_DELAY_MS.softPass : AUTO_ADVANCE_DELAY_MS.standard));
        }
      } else if (!wasPassed) {
        const mistakeNum = (ayahMistakes[currentAyah.number] || 0) + 1;
        setAyahMistakes(prev => ({ ...prev, [currentAyah.number]: mistakeNum }));
        const nextFailureCount = currentAyahFailures + 1;
        setCurrentAyahFailures(nextFailureCount);
        if (nextFailureCount >= 3) {
          setSlowMode(true);
        }
        if (learningMode === "memorize" && nextFailureCount >= 3) {
          setHintAvailable(true);
        }

        const delay = mistakeNum >= 3 ? RETRY_AUDIO_DELAY_MS.repeated : RETRY_AUDIO_DELAY_MS.normal;
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
    submitInFlightRef.current = false;
  }, [currentAyah, currentAyahIndex, currentStage, surahNumber, totalAyahs, ayahProgress, ayahMistakes, currentAyahFailures, getAudioUrl, selectedReciter, sessionLearned, surah]);

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

  const nextSurahNumber = getNextSurahNumber(surahNumber);

  const currentAyahMistakes = currentAyah ? (ayahMistakes[currentAyah.number] || 0) : 0;
  const canRecord = !autoAdvancing;
  const stageOrder: AyahLearningStage[] = ["listening", "repeating", "memorizing"];
  const currentStageIndex = stageOrder.indexOf(currentStage);
  const isTextHidden = currentStage === "memorizing";
  const stageDescriptions: Record<AyahLearningStage, { title: string; detail: string }> = {
    listening: {
      title: "Dhageyso",
      detail: "Dhageysigu waa ikhtiyaari.",
    },
    repeating: {
      title: "Ku celi",
      detail: "Qoraalka eeg oo ku celi.",
    },
    memorizing: {
      title: "Qalbiga ka akhri",
      detail: "Qoraalka waa qarsan yahay.",
    },
  };

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

      {showSessionCelebration && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 backdrop-blur-sm px-6">
          <div className="rounded-3xl border border-[#FFD93D]/30 bg-gradient-to-br from-[#1f2948] to-[#18233d] px-8 py-7 text-center shadow-2xl">
            <div className="mb-3 flex justify-center gap-2">
              {[1, 2, 3].map((item) => (
                <Star key={item} className="h-8 w-8 animate-pulse fill-[#FFD93D] text-[#FFD93D]" style={{ animationDelay: `${item * 0.15}s` }} />
              ))}
            </div>
            <p className="text-xl font-black text-[#FFD93D]">Aad baad u fiican tahay!</p>
            <p className="mt-1 text-sm font-semibold text-white/80">3 aayadood waad dhamaysay, sii wad!</p>
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

        <div className="px-4 mb-3">
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#FFD93D] to-[#FFA502] rounded-full transition-all duration-500"
              style={{ width: `${totalAyahs > 0 ? (completedCount / totalAyahs) * 100 : 0}%` }}
              data-testid="progress-bar" />
          </div>
        </div>

        {/* Tab bar */}
        {lessonFlow !== "lesson_review" && (
          <div className="px-4 mb-5">
            <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 gap-1">
              {([
                { id: "quran" as DashboardTab, label: "Quraan", icon: <BookOpen className="w-4 h-4" /> },
                { id: "games" as DashboardTab, label: "Ciyaaro", icon: <Gamepad2 className="w-4 h-4" /> },
                { id: "rewards" as DashboardTab, label: "Hadiyad", icon: <Award className="w-4 h-4" /> },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === tab.id
                      ? "bg-[#FFD93D] text-[#1a1a2e]"
                      : "text-white/50 hover:text-white/80"
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "quran" && lessonFlow === "lesson_review" && (
          <div className="px-4 pb-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-[#FFD93D] text-sm font-black mb-1">Casharka oo dhan</p>
              <p className="text-white font-bold text-lg mb-2">{surah.name}</p>
              {lessonReviewMessage && (
                <p className="text-white/75 text-sm mb-3">{lessonReviewMessage}</p>
              )}

              {(lessonReviewStep === "full_listen" || lessonReviewStep === "practice_with_text" || lessonReviewStep === "reinforcement") && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4 text-right" dir="rtl">
                  <p className="text-white text-2xl leading-[2.2] font-['Amiri',_serif]">
                    {surah.ayahs.map((a) => a.text).join(" ")}
                  </p>
                </div>
              )}

              {lessonReviewStep === "full_listen" && (
                <div className="space-y-3">
                  <p className="text-white/80 text-sm">Dhageyso casharka oo dhan</p>
                  <button
                    onClick={playFullLessonRecitation}
                    disabled={isLessonReviewPlaying}
                    className="w-full py-3 rounded-2xl bg-[#4ECDC4]/20 text-[#4ECDC4] border border-[#4ECDC4]/30 font-bold disabled:opacity-60"
                    data-testid="button-lesson-review-replay"
                  >
                    {isLessonReviewPlaying ? "Dhageysanayaa..." : "▶️ Dhageyso mar kale"}
                  </button>
                  <button
                    onClick={() => {
                      setLessonReviewStep("practice_with_text");
                      setLessonReviewMessage("Iskiis u akhri adigoo eegaya");
                    }}
                    disabled={isLessonReviewPlaying}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] font-black disabled:opacity-50"
                    data-testid="button-lesson-review-continue"
                  >
                    ➡️ Sii wad
                  </button>
                </div>
              )}

              {lessonReviewStep === "practice_with_text" && (
                <div className="space-y-3">
                  <p className="text-white/80 text-sm">Iskiis u akhri adigoo eegaya</p>
                  <button
                    onClick={() => {
                      setFinalTestNoMajorErrorAttempts(0);
                      setLessonReviewStep("final_test");
                      setLessonReviewMessage("Quraanka qalbiga ka akhri");
                    }}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] font-black"
                    data-testid="button-lesson-review-ready"
                  >
                    ➡️ Diyaar ayaan ahay
                  </button>
                </div>
              )}

              {lessonReviewStep === "final_test" && (
                <div className="space-y-3 text-center">
                  <div className="rounded-2xl border border-purple-400/30 bg-purple-500/10 p-6">
                    <p className="text-white/25 text-3xl tracking-[0.35em] select-none">░░░░░░░░░░░░</p>
                    <p className="mt-2 text-purple-200 text-sm font-bold">Quraanka qalbiga ka akhri</p>
                  </div>
                  <p className="text-white/80 text-sm">Qoraalka waa qarsoon yahay</p>
                  <button
                    onClick={isLessonReviewRecording ? stopLessonReviewRecording : startLessonReviewRecording}
                    disabled={isLessonReviewChecking}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black disabled:opacity-50"
                    data-testid="button-lesson-review-final-test"
                  >
                    {isLessonReviewChecking ? "Waan hubinayaa..." : isLessonReviewRecording ? "⏹️ Jooji Akhriska" : "🎙️ Bilow Akhriska"}
                  </button>
                  {finalTestNoMajorErrorAttempts > 0 && (
                    <p className="text-emerald-200 text-xs font-bold">
                      Isku dayga wanaagsan: {finalTestNoMajorErrorAttempts}/2
                    </p>
                  )}
                  <p className="text-white/55 text-xs">Isku day mar kale, waad awooddaa</p>
                </div>
              )}

              {lessonReviewStep === "reinforcement" && (
                <div className="space-y-3">
                  <p className="text-orange-200 text-sm font-bold">Wax yar ayaad khalday, aan dib u celino</p>
                  <button
                    onClick={playFullLessonRecitation}
                    disabled={isLessonReviewPlaying}
                    className="w-full py-3 rounded-2xl bg-[#4ECDC4]/20 text-[#4ECDC4] border border-[#4ECDC4]/30 font-bold disabled:opacity-60"
                    data-testid="button-lesson-review-reinforcement-listen"
                  >
                    {isLessonReviewPlaying ? "Dhageysanayaa..." : "▶️ Dhageyso mar kale"}
                  </button>
                  <button
                    onClick={() => {
                      setLessonReviewStep("final_test");
                      setLessonReviewMessage("Quraanka qalbiga ka akhri");
                    }}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] font-black"
                    data-testid="button-lesson-review-retry-final"
                  >
                    ➡️ Mar kale isku day
                  </button>
                  {finalTestNoMajorErrorAttempts > 0 && (
                    <p className="text-emerald-200 text-xs font-bold text-center">
                      Isku dayga wanaagsan: {finalTestNoMajorErrorAttempts}/2
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "quran" && lessonFlow !== "lesson_review" && (
        <>
        <div className="px-4 mb-5">
          <div className="flex gap-2 flex-wrap">
            {surah.ayahs.map((ayah, idx) => {
              const prog = ayahProgress[ayah.number];
              const isCurrent = idx === currentAyahIndex;
              const done = prog?.completed;
              return (
                <button key={ayah.number} onClick={() => goToAyah(idx)}
                  className={`w-10 h-10 rounded-full text-sm font-bold flex items-center justify-center transition-all ${
                    isCurrent ? "ring-3 ring-[#FFD93D] ring-offset-2 ring-offset-[#1a1a2e] scale-110" : ""
                  } ${done ? "bg-green-500/30 text-green-300 border-2 border-green-500/50" :
                    prog ? "bg-yellow-500/20 text-yellow-300 border-2 border-yellow-500/40" :
                    "bg-white/10 text-white/50 border border-white/10"
                  }`}
                  data-testid={`button-ayah-${ayah.number}`}
                >
                  {done ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
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

              <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                <p className="text-[#FFD93D] text-sm font-black">{stageDescriptions[currentStage].title}</p>
                <p className="mt-1 text-white/65 text-xs">{stageDescriptions[currentStage].detail}</p>
              </div>

              <div className="text-right mb-5" dir="rtl">
                {isTextHidden ? (
                  <div className="rounded-2xl p-4 transition-all duration-500 border border-purple-400/30 bg-purple-500/10" data-testid="text-ayah-arabic">
                    <div className="py-5 text-center">
                      <p className="text-white/20 text-3xl tracking-[0.35em] select-none">░░░░░░░░░░░░</p>
                      <p className="mt-3 text-sm font-bold text-purple-200">Qoraalka waa qarsan yahay</p>
                      <p className="mt-1 text-xs text-white/55">Qalbigaaga ka akhri hadda.</p>
                    </div>
                  </div>
                ) : isCurrentCompleted ? (
                  <div className="rounded-2xl border-2 border-green-400/40 bg-green-500/10 p-4" data-testid="text-ayah-arabic">
                    <p className="text-white text-3xl leading-[2.4] font-['Amiri',_serif]">
                      {currentAyah.text}
                    </p>
                  </div>
                ) : (
                  <div className={`rounded-2xl p-4 transition-all duration-500 ${isPlaying ? "border-2 border-[#4ECDC4]/60 bg-[#4ECDC4]/10 shadow-lg shadow-[#4ECDC4]/10" : "border border-white/15 bg-white/5"}`} data-testid="text-ayah-arabic">
                    {isPlaying && currentStage === "listening" && (
                      <p className="text-[#4ECDC4] text-xs font-bold mb-2 text-center tracking-wide">🔊 Dhageyso aayada</p>
                    )}
                    <p className="text-white text-3xl leading-[2.4] font-['Amiri',_serif]">
                      {currentAyah.text}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mb-4 px-1">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${listenCount > 0 ? "bg-green-500/20 text-green-300" : "bg-white/5 text-white/50"}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${listenCount > 0 ? "bg-green-500/30" : "bg-white/10"}`}>
                    {listenCount > 0 ? "✓" : "1"}
                  </span>
                  Dhageyso ikhtiyaari
                </div>
                <div className="flex-1 h-px bg-white/10" />
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${currentStage === "repeating" ? "bg-[#FFD93D]/20 text-[#FFD93D]" : currentStageIndex > 1 || isCurrentCompleted ? "bg-green-500/20 text-green-300" : "bg-white/5 text-white/50"}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${currentStage === "repeating" ? "bg-[#FFD93D]/30" : currentStageIndex > 1 || isCurrentCompleted ? "bg-green-500/30" : "bg-white/10"}`}>{currentStageIndex > 1 || isCurrentCompleted ? "✓" : "2"}</span>
                  Ku celi
                </div>
                <div className="flex-1 h-px bg-white/10" />
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${currentStage === "memorizing" ? "bg-purple-500/20 text-purple-200" : isCurrentCompleted ? "bg-green-500/20 text-green-300" : "bg-white/5 text-white/50"}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${currentStage === "memorizing" ? "bg-purple-500/30" : isCurrentCompleted ? "bg-green-500/30" : "bg-white/10"}`}>{isCurrentCompleted ? "✓" : "3"}</span>
                  Qalbiga
                </div>
              </div>

              {slowMode && (
                <div className="mb-4 flex justify-center">
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
                    Cod gaaban wuu shaqaynayaa
                  </span>
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
                  <p className="text-orange-400/80 text-sm mb-2">Audio-ga ma shaqeynayo. Isku day mar kale ama si toos ah mic-ka u isticmaal.</p>
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={playAyah}
                      className="px-4 py-2 rounded-full bg-[#4ECDC4]/10 text-[#4ECDC4] text-sm font-medium border border-[#4ECDC4]/20 hover:bg-[#4ECDC4]/20 active:scale-95 transition-all flex items-center gap-1.5"
                      data-testid="button-retry-audio"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Isku day
                    </button>
                  </div>
                </div>
              )}

              {canRecord && !isRecording && !isChecking && !autoAdvancing && (
                <p className="text-center text-[#FFD93D]/80 text-sm mt-4 px-2">
                  {currentStage === "repeating"
                    ? (isCurrentCompleted ? "🎙️ Mar kale ku celi si aad u naqiito" : "🎙️ Ku celi")
                    : "🎙️ Qalbiga ka akhri"}
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

              {hintAvailable && currentStage === "memorizing" && !isRecording && !isChecking && !autoAdvancing && (
                <button
                  onClick={playHintAndRecord}
                  disabled={hintPlaying}
                  className="flex items-center justify-center gap-2 mx-auto mt-3 px-5 py-2 rounded-full bg-purple-500/15 text-purple-200 text-sm font-medium border border-purple-400/30 hover:bg-purple-500/25 active:scale-95 transition-all disabled:opacity-60"
                  data-testid="button-play-hint"
                >
                  {hintPlaying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                  🎧 Maqal tilmaan
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
                <h3 className="text-green-300 font-bold text-2xl mb-1">Hambalyo! Waad ku guuleysatay</h3>
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
                <h3 className="text-orange-300 font-bold text-xl mb-1">Isku day mar kale, waad awooddaa</h3>
                <p className="text-white/70 text-sm mb-3" data-testid="text-feedback">{checkResult.message}</p>
                <p className="text-orange-200 text-xs bg-orange-500/10 rounded-xl px-3 py-2 mb-3">
                    {currentStage === "memorizing" ? "🧠 Marka hore dhageyso, kadibna qalbiga ka celi mar kale" : "📖 Qoraalka eeg oo si deggan mar kale ugu celi"}
                  </p>
                <div className="flex gap-3">
                  <button onClick={playAyah}
                    className="flex-1 py-3 rounded-2xl bg-[#4ECDC4]/20 text-[#4ECDC4] text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all border border-[#4ECDC4]/30"
                    data-testid="button-replay"
                  >
                    <RotateCcw className="w-4 h-4" /> Dhageyso
                  </button>
                  <button onClick={startRecording}
                    disabled={isChecking || autoAdvancing}
                    className="flex-1 py-3 rounded-2xl bg-[#FFD93D]/20 text-[#FFD93D] text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all border border-[#FFD93D]/30"
                    data-testid="button-try-again"
                  >
                    <Mic className="w-4 h-4" /> {currentStage === "memorizing" ? "Qalbiga ku celi!" : "Ku celi!"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {surahComplete && !showCelebration && (
          <div className="px-4 mb-6">
            <div className="bg-gradient-to-r from-[#FFD93D]/20 to-[#FFA502]/20 rounded-3xl p-6 border-2 border-[#FFD93D]/30 text-center">
              <Trophy className="w-16 h-16 text-[#FFD93D] mx-auto mb-3" />
              <h3 className="text-white font-bold text-2xl mb-2">Hambalyo!</h3>
              <p className="text-white/70 text-lg mb-4">Suurada dhan waad dhamaysay!</p>
              <div className="flex justify-center gap-2 mb-5">
                {[1, 2, 3].map(i => <Star key={i} className="w-10 h-10 text-[#FFD93D] fill-[#FFD93D]" />)}
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setSurahComplete(false);
                    setLessonFlow("ayah_learning");
                    setLessonReviewStep("full_listen");
                    setFullLessonListenRounds(0);
                    setLessonPracticeReads(0);
                    setLessonReviewMessage(null);
                    setFinalTestNoMajorErrorAttempts(0);
                    setCurrentAyahIndex(0);
                    setCurrentStage("repeating");
                    setCheckResult(null);
                    setListenCount(0);
                  }}
                  className="w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-lg rounded-2xl hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2"
                  data-testid="button-practice-again"
                >
                  🔁 Ku celi mar kale
                </button>
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

        </>
        )} {/* end activeTab === "quran" */}

        {/* Games tab — session-based unlock: requires 2+ ayahs memorized THIS session */}
        {activeTab === "games" && (
          <div className="px-4 pb-6">
            <div className="mb-4">
              <h3 className="text-white font-bold text-lg flex items-center gap-2 mb-1">
                <Gamepad2 className="w-5 h-5 text-[#A855F7]" />
                Ciyaaraha Farxad leh
              </h3>
              <p className="text-white/40 text-xs">
                Marka aad 2 aayah qalbiga ka akhrido oo AI-ku xaqiijiyo, ciyaaruhu way furmaan.
              </p>
            </div>

            {sessionLearned.length < 2 ? (
              <div className="bg-white/5 rounded-2xl p-8 border border-white/10 text-center">
                <Lock className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <h4 className="text-white/60 font-semibold mb-2">
                  {sessionLearned.length === 0
                    ? "Weli aayah ma baranin"
                    : `${sessionLearned.length}/2 aayah qalbi — mid kale oo la xaqiijiyo ayaa furaya!`}
                </h4>
                <p className="text-white/30 text-sm">
                  Kaliya 2 aayah oo qalbi laga akhriyo, AI-na xaqiijiyo, ayaa ciyaaraha fura.
                </p>
                <button
                  onClick={() => setActiveTab("quran")}
                  className="mt-4 bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] px-6 py-2 rounded-xl font-bold text-sm active:scale-95 transition-transform"
                  data-testid="button-go-quran-from-games"
                >
                  Casharrada Eeg 📖
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3 flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <p className="text-green-300 text-sm font-semibold">
                    {sessionLearned.length} aayah qalbi ayaa la xaqiijiyay — ciyaaruhu waa furan yihiin!
                  </p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <h4 className="text-white font-semibold text-sm flex-1">{surah.name}</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(GAME_INFO).map(([gameKey, info]) => (
                      <button
                        key={gameKey}
                        onClick={() => setLocation(`${GAME_ROUTES[gameKey]}/${surahNumber}`)}
                        className="rounded-xl border border-white/10 bg-white/10 p-3 text-center transition-all hover:bg-white/15 active:scale-95"
                        data-testid={`game-${gameKey}-${surahNumber}`}
                      >
                        <span className="text-2xl block mb-1">{info.emoji}</span>
                        <span className="text-white/70 text-[10px] font-medium block">{info.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rewards tab */}
        {activeTab === "rewards" && (
          <div className="px-4 pb-6">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-[#FFD93D]" />
              Hadiyado
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
                <p className="text-[#FFD93D] text-2xl font-bold">{rewardSummary?.aayahStars ?? 0}</p>
                <p className="text-white/40 text-xs mt-1">⭐ Aayah Stars</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
                <p className="text-emerald-300 text-2xl font-bold">{rewardSummary?.surahTrophies ?? 0}</p>
                <p className="text-white/40 text-xs mt-1">🏆 Surah Trophies</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
                <p className="text-amber-300 text-2xl font-bold">{rewardSummary?.gameCoins ?? 0}</p>
                <p className="text-white/40 text-xs mt-1">🪙 Game Coins</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
                <p className="text-cyan-300 text-2xl font-bold">{rewardSummary?.gameTokens ?? 0}</p>
                <p className="text-white/40 text-xs mt-1">🎫 Tokens</p>
              </div>
            </div>

            {rewardSummary?.badges && rewardSummary.badges.length > 0 && (
              <div className="mb-4">
                <h4 className="text-white/60 text-sm font-semibold mb-3">Badges-kaaga</h4>
                <div className="grid grid-cols-3 gap-3">
                  {rewardSummary.badges.map((badge: { key: string; icon: string; name: string }) => (
                    <div key={badge.key} className="bg-white/5 rounded-2xl p-3 text-center border border-white/10">
                      <span className="text-3xl block mb-1">{badge.icon}</span>
                      <p className="text-white/70 text-[10px] font-medium">{badge.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!rewardSummary?.badges || rewardSummary.badges.length === 0) && (
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-center">
                <Trophy className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">Sii wad barashada si aad u hesho hadiyad!</p>
              </div>
            )}
          </div>
        )}

        {/* Floating "Diyaar ma ahay" button — shows when 2+ ayahs memorized this session */}
        {sessionLearned.length >= 2 && !surahComplete && lessonFlow === "ayah_learning" && activeTab === "quran" && (
          <div className="fixed bottom-6 left-4 right-4 z-40">
            <button
              onClick={() => setActiveTab("games")}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-2xl font-black text-base shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
              data-testid="button-ready-to-leave"
            >
                ✅ {sessionLearned.length} aayah qalbi waa la xaqiijiyay — Ciyaaraha fur
            </button>
          </div>
        )}

        <div className="h-24" />
      </div>
    </div>
  );
}
