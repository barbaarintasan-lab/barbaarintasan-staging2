import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useLocation, useParams } from "wouter";
import { useChildAuth } from "@/contexts/ChildAuthContext";
import { ArrowLeft, Volume2, Mic, MicOff, CheckCircle, XCircle } from "lucide-react";

type AlphabetItem = {
  id: number;
  arabic: string;
  nameArabic: string;
  nameSomali: string;
  phase: number;
  order: number;
  audioUrl?: string | null;
  tracingPath?: string | null;
  completed?: boolean;
  tracingScore?: number;
};

type Point = { x: number; y: number };
type LessonTab = "listen" | "forms" | "higaad" | "trace";
type SessionPhase = "learning" | "review" | "finaltest";

const TRACE_PASS_SCORE = 55;
const DISTANCE_THRESHOLD = 22;
const CANVAS_SIZE = 280;
const SESSION_MIN = 3;

const LETTER_COLORS: string[] = [
  "#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FECA57",
  "#FF9FF3","#54A0FF","#5F27CD","#00D2D3","#FF9F43",
  "#EE5A24","#009432","#0652DD","#9980FA","#C4E538",
  "#FDA7DF","#D980FA","#FFC312","#12CBC4","#B53471",
  "#833471","#1289A7","#C4E538","#F79F1F","#A3CB38",
  "#1B1464","#6F1E51","#ED4C67",
];

const NON_CONNECTING = new Set(["ا","د","ذ","ر","ز","و"]);

function getLetterForms(arabic: string) {
  const nc = NON_CONNECTING.has(arabic);
  return {
    isolated: arabic,
    initial:  nc ? arabic         : arabic + "ـ",
    medial:   nc ? "ـ" + arabic   : "ـ" + arabic + "ـ",
    final:    "ـ" + arabic,
    nonConnecting: nc,
  };
}

const HARAKAT_LIST = [
  { mark: "\u064E", name: "Fatha",  sound: "a",  example: (l: string) => l + "\u064E",  color: "#FF6B6B", desc: "Cod: …a" },
  { mark: "\u0650", name: "Kasra",  sound: "i",  example: (l: string) => l + "\u0650",  color: "#4ECDC4", desc: "Cod: …i" },
  { mark: "\u064F", name: "Damma",  sound: "u",  example: (l: string) => l + "\u064F",  color: "#FECA57", desc: "Cod: …u" },
  { mark: "\u0652", name: "Sukuun", sound: "",   example: (l: string) => l + "\u0652",  color: "#96CEB4", desc: "Deganaanshaha" },
  { mark: "\u064B", name: "Tanwiin Fatha", sound: "an", example: (l: string) => l + "\u064B", color: "#FF9FF3", desc: "Cod: …an" },
  { mark: "\u064D", name: "Tanwiin Kasra", sound: "in", example: (l: string) => l + "\u064D", color: "#54A0FF", desc: "Cod: …in" },
  { mark: "\u064C", name: "Tanwiin Damma", sound: "un", example: (l: string) => l + "\u064C", color: "#00D2D3", desc: "Cod: …un" },
  { mark: "\u0651", name: "Shadda",  sound: "xx", example: (l: string) => l + "\u0651\u064E", color: "#FF9F43", desc: "Laba liq" },
];

const QURAN_WORDS: Record<string, { word: string; meaning: string; emoji: string }> = {
  "ا": { word: "اللَّه",    meaning: "Allah",          emoji: "✨" },
  "ب": { word: "بِسْمِ",   meaning: "Magaciisa",      emoji: "📖" },
  "ت": { word: "تَوْبَة",  meaning: "Toobad",         emoji: "🤲" },
  "ث": { word: "ثَوَاب",   meaning: "Ajar",           emoji: "⭐" },
  "ج": { word: "جَنَّة",   meaning: "Jannada",        emoji: "🌿" },
  "ح": { word: "حَمْد",    meaning: "Mahad",          emoji: "🙏" },
  "خ": { word: "خَيْر",    meaning: "Wanaag",         emoji: "💫" },
  "د": { word: "دُعَاء",   meaning: "Ducada",         emoji: "🤲" },
  "ذ": { word: "ذِكْر",    meaning: "Xusuus",         emoji: "💝" },
  "ر": { word: "رَحْمَة",  meaning: "Naxariis",       emoji: "❤️" },
  "ز": { word: "زَكَاة",   meaning: "Sadar",          emoji: "💛" },
  "س": { word: "سَلَام",   meaning: "Nabad",          emoji: "☮️" },
  "ش": { word: "شُكْر",    meaning: "Mahadnaq",       emoji: "😊" },
  "ص": { word: "صَلَاة",   meaning: "Salaadda",       emoji: "🕌" },
  "ض": { word: "ضِيَاء",   meaning: "Nuur",           emoji: "💡" },
  "ط": { word: "طَهَارَة", meaning: "Nadiifnimo",     emoji: "✨" },
  "ظ": { word: "ظَفَر",    meaning: "Guul",           emoji: "🏆" },
  "ع": { word: "عِبَادَة", meaning: "Cibaado",        emoji: "⭐" },
  "غ": { word: "غُفْرَان", meaning: "Dambi dhaaf",    emoji: "🤲" },
  "ف": { word: "فُرْقَان", meaning: "Quraanka",       emoji: "📖" },
  "ق": { word: "قُرْآن",   meaning: "Quraanka",       emoji: "📗" },
  "ك": { word: "كَرِيم",   meaning: "Karim",          emoji: "💎" },
  "ل": { word: "لَطِيف",   meaning: "Naxariis leh",   emoji: "💙" },
  "م": { word: "مُحَمَّد", meaning: "Nabigeena ﷺ",   emoji: "🌙" },
  "ن": { word: "نُور",     meaning: "Nuur",           emoji: "⭐" },
  "ه": { word: "هُدَى",    meaning: "Hanuunin",       emoji: "🌟" },
  "و": { word: "وَحْي",    meaning: "Waxy",           emoji: "📜" },
  "ي": { word: "يَقِين",   meaning: "Xaqiiq",         emoji: "💫" },
};

function distance(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.y - b.y); }

function scalePathToCanvas(pathD: string, width: number, height: number) {
  const pad = 40;
  const sx = (width - pad * 2) / 100;
  const sy = (height - pad * 2) / 100;
  let idx = 0;
  return pathD.replace(/-?\d+(\.\d+)?/g, (raw) => {
    const value = parseFloat(raw);
    const isX = idx % 2 === 0;
    idx++;
    return String(isX ? pad + value * sx : pad + value * sy);
  });
}

function sampleSvgPath(pathD: string, samples: number, w: number, h: number): Point[] {
  const svgNS = "http://www.w3.org/2000/svg";
  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", scalePathToCanvas(pathD, w, h));
  const total = path.getTotalLength();
  const out: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    const p = path.getPointAtLength((i / samples) * total);
    out.push({ x: p.x, y: p.y });
  }
  return out;
}

function computeTraceScore(user: Point[], reference: Point[], threshold: number) {
  if (!user.length || !reference.length) return 0;
  let covered = 0;
  for (const ref of reference) {
    let min = Infinity;
    for (const up of user) { const d = distance(ref, up); if (d < min) min = d; }
    if (min <= threshold) covered++;
  }
  let precise = 0;
  for (const up of user) {
    let min = Infinity;
    for (const ref of reference) { const d = distance(ref, up); if (d < min) min = d; }
    if (min <= threshold) precise++;
  }
  const coverage  = (covered / reference.length) * 100;
  const precision = user.length > 0 ? (precise / user.length) * 100 : 0;
  return Math.max(0, Math.min(100, Math.round(coverage * 0.65 + precision * 0.35)));
}

const FALLBACK_CURRICULUM: AlphabetItem[] = [
  "ا","ب","ت","ث","ج","ح","خ","د","ذ","ر","ز","س","ش","ص","ض","ط","ظ","ع","غ","ف","ق","ك","ل","م","ن","ه","و","ي"
].map((arabic, i) => {
  const names: Record<string, [string, string]> = {
    "ا":["أَلِف","Alif"],"ب":["بَاء","Baa"],"ت":["تَاء","Taa"],"ث":["ثَاء","Thaa"],
    "ج":["جِيم","Jiim"],"ح":["حَاء","Haa"],"خ":["خَاء","Khaa"],"د":["دَال","Daal"],
    "ذ":["ذَال","Dhaal"],"ر":["رَاء","Raa"],"ز":["زَاي","Zay"],"س":["سِين","Siin"],
    "ش":["شِين","Shiin"],"ص":["صَاد","Saad"],"ض":["ضَاد","Daad"],"ط":["طَاء","Taa'"],
    "ظ":["ظَاء","Dhaa'"],"ع":["عَيْن","'Ayn"],"غ":["غَيْن","Ghayn"],"ف":["فَاء","Faa"],
    "ق":["قَاف","Qaaf"],"ك":["كَاف","Kaaf"],"ل":["لَام","Laam"],"م":["مِيم","Miim"],
    "ن":["نُون","Nuun"],"ه":["هَاء","Haa'"],"و":["وَاو","Waaw"],"ي":["يَاء","Yaa"],
  };
  const [nameArabic, nameSomali] = names[arabic] || [arabic, arabic];
  const phase = i < 7 ? 1 : i < 13 ? 2 : i < 20 ? 3 : 4;
  return { id: i + 1, arabic, nameArabic, nameSomali, phase, order: i + 1,
    audioUrl: null, tracingPath: `M50 15 C50 15 50 85 50 85`, completed: false };
});

export default function AlphabetLesson() {
  const { child, isLoading } = useChildAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ letterId: string }>();
  const letterId = params?.letterId ? parseInt(params.letterId) : null;

  const [curriculum, setCurriculum] = useState<AlphabetItem[]>([]);
  const [loadingCurriculum, setLoadingCurriculum] = useState(true);
  const [activeTab, setActiveTab] = useState<LessonTab>("listen");

  // ── Session state (Quran-style) ──────────────────────────────────
  const [sessionLearned, setSessionLearned] = useState<number[]>([]); // indices in curriculum
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("learning");
  const [finalTestIdx, setFinalTestIdx] = useState(0);
  const [finalTestResults, setFinalTestResults] = useState<boolean[]>([]);
  const [sessionComplete, setSessionComplete] = useState(false);

  // ── Current letter interaction ───────────────────────────────────
  const [audioPlaying, setAudioPlaying]   = useState(false);
  const [hasListened,  setHasListened]    = useState(false);
  const [isRecording,  setIsRecording]    = useState(false);
  const [isChecking,   setIsChecking]     = useState(false);
  const [checkResult,  setCheckResult]    = useState<{ correct: boolean; feedback: string } | null>(null);
  const [autoAdvancing, setAutoAdvancing] = useState(false);

  // ── Tracing ──────────────────────────────────────────────────────
  const [traceScore, setTraceScore]       = useState<number | null>(null);
  const [traceFeedback, setTraceFeedback] = useState<"" | "pass" | "fail">("");
  const [traceAttempts, setTraceAttempts] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [traceDone, setTraceDone]         = useState(false);

  // ── Higaad/forms helpers ─────────────────────────────────────────
  const [harakatPlaying, setHarakatPlaying] = useState<string | null>(null);
  const [formPlaying, setFormPlaying]       = useState<string | null>(null);

  // ── Refs ─────────────────────────────────────────────────────────
  const canvasRef         = useRef<HTMLCanvasElement | null>(null);
  const drawingRef        = useRef(false);
  const userPointsRef     = useRef<Point[]>([]);
  const audioRef          = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const audioChunksRef    = useRef<Blob[]>([]);

  useEffect(() => {
    if (!isLoading && !child) setLocation("/child-login");
  }, [child, isLoading, setLocation]);

  useEffect(() => {
    if (!child) return;
    fetch("/api/quran/alphabet/curriculum", { credentials: "include" })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(data => {
        const items = Array.isArray(data.items) && data.items.length > 0
          ? data.items : FALLBACK_CURRICULUM;
        setCurriculum(items);
        setLoadingCurriculum(false);
      })
      .catch(() => { setCurriculum(FALLBACK_CURRICULUM); setLoadingCurriculum(false); });
  }, [child]);

  const index = useMemo(() => {
    if (!curriculum.length) return 0;
    if (letterId !== null) {
      const i = curriculum.findIndex(l => l.id === letterId);
      return i >= 0 ? i : 0;
    }
    const first = curriculum.findIndex(l => !l.completed);
    return first >= 0 ? first : 0;
  }, [curriculum, letterId]);

  const current = curriculum[index];
  const letterColor = LETTER_COLORS[(current?.id ?? 1) - 1] || "#FFD93D";
  const qWord = current ? (QURAN_WORDS[current.arabic] || null) : null;
  const forms = current ? getLetterForms(current.arabic) : null;
  const tracingPath = current?.tracingPath || "M50 15 C50 15 50 85 50 85";

  const referencePoints = useMemo(() => {
    if (typeof document === "undefined") return [];
    return sampleSvgPath(tracingPath, 300, CANVAS_SIZE, CANVAS_SIZE);
  }, [tracingPath]);

  // Reset per-letter states when current letter changes
  useEffect(() => {
    setHasListened(false);
    setCheckResult(null);
    setAutoAdvancing(false);
    setIsRecording(false);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
  }, [current?.id]);

  // Reset trace states on letter change + auto-play sequence
  useEffect(() => {
    setActiveTab("listen");
    setTraceScore(null); setTraceFeedback(""); setTraceAttempts(0);
    setShowCelebration(false); setTraceDone(false);
  }, [current?.id]);

  // Auto-play: letter name → Quran example word (requires child auth + current)
  useEffect(() => {
    if (!child || !current) return;
    let cancelled = false;
    const run = async () => {
      await new Promise(r => setTimeout(r, 700));
      if (cancelled) return;
      // 1. Play the letter name (e.g. "أَلِف")
      await playLetterAudio(current.nameArabic);
      if (cancelled) return;
      // 2. Short pause, then play the Quran example word (e.g. "اللَّه")
      const word = QURAN_WORDS[current.arabic];
      if (word) {
        await new Promise(r => setTimeout(r, 500));
        if (cancelled) return;
        await playLetterAudio(word.word);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [current?.id, child, playLetterAudio]);

  useEffect(() => {
    if (activeTab === "trace") setTimeout(() => drawCanvas(), 100);
  }, [activeTab]);

  // ── Audio: use server TTS, returns Promise that resolves when done ──
  const playLetterAudio = useCallback((text: string): Promise<void> => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setAudioPlaying(true);
    return new Promise((resolve) => {
      const url = `/api/alphabet/tts?letter=${encodeURIComponent(text)}`;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setAudioPlaying(false); setHasListened(true); resolve(); };
      // On error: stop spinner but do NOT set hasListened — user must tap manually
      audio.onerror = () => { setAudioPlaying(false); resolve(); };
      audio.play().catch(() => { setAudioPlaying(false); resolve(); });
    });
  }, []);

  function playHarakat(vowelized: string) {
    playLetterAudio(vowelized);
  }

  // Play a Blob immediately so the child hears their own recording
  function playBlob(blob: Blob): Promise<void> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
      audio.play().catch(() => { URL.revokeObjectURL(url); resolve(); });
    });
  }

  function playForm(form: string, label: string) {
    setFormPlaying(label);
    playLetterAudio(form.replace(/ـ/g, "")).then(() => setFormPlaying(null));
  }

  // ── Recording ────────────────────────────────────────────────────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = (window as any).MediaRecorder?.isTypeSupported?.("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus" : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); };
      mr.start();
      setIsRecording(true);
    } catch {
      alert("Fadlan mic-ka oggollow! Settings > Permissions > Microphone");
    }
  }

  async function stopAndCheck(letter: AlphabetItem) {
    if (!mediaRecorderRef.current || !isRecording) return;
    setIsRecording(false);
    mediaRecorderRef.current.stop();
    await new Promise(r => setTimeout(r, 400));

    const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    // Play child's own voice immediately — don't await, run in parallel with AI check
    playBlob(blob);
    setIsChecking(true);

    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("letterId", String(letter.id));
      formData.append("arabic", letter.arabic);
      formData.append("nameArabic", letter.nameArabic);

      const res = await fetch("/api/quran/alphabet/recitation/check", {
        method: "POST", credentials: "include", body: formData,
      });
      const data = await res.json();
      setCheckResult({ correct: data.correct, feedback: data.feedback || (data.correct ? "Aad u fiican! ⭐" : "Mar kale isku day!") });

      if (data.correct) {
        // Mark completed in DB
        try {
          await fetch("/api/quran/alphabet/complete", {
            method: "POST", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ letterId: letter.id, phase: letter.phase, completed: true, recitationScore: data.score || 80, tracingScore: 70 }),
          });
        } catch { /* non-blocking */ }

        // Add to session
        setSessionLearned(prev => prev.includes(index) ? prev : [...prev, index]);

        // Auto-advance after 1.5s
        setAutoAdvancing(true);
        setTimeout(() => {
          setAutoAdvancing(false);
          setCheckResult(null);
          const nextIdx = index + 1;
          if (nextIdx < curriculum.length) {
            setLocation(`/alphabet-lesson/${curriculum[nextIdx].id}`);
          }
        }, 1800);
      }
    } catch {
      setCheckResult({ correct: false, feedback: "Khalad ayaa dhacay. Mar kale isku day." });
    } finally {
      setIsChecking(false);
    }
  }

  // ── Tracing ──────────────────────────────────────────────────────
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width  = CANVAS_SIZE * ratio;
    canvas.height = CANVAS_SIZE * ratio;
    canvas.style.width  = `${CANVAS_SIZE}px`;
    canvas.style.height = `${CANVAS_SIZE}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const rows = 6, cols = 6;
    ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 0.5;
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath(); ctx.moveTo(0, (r/rows)*CANVAS_SIZE); ctx.lineTo(CANVAS_SIZE, (r/rows)*CANVAS_SIZE); ctx.stroke();
    }
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath(); ctx.moveTo((c/cols)*CANVAS_SIZE, 0); ctx.lineTo((c/cols)*CANVAS_SIZE, CANVAS_SIZE); ctx.stroke();
    }
    const scaledPath = scalePathToCanvas(tracingPath, CANVAS_SIZE, CANVAS_SIZE);
    const refPath = new Path2D(scaledPath);
    ctx.save(); ctx.shadowColor = letterColor + "66"; ctx.shadowBlur = 15;
    ctx.strokeStyle = letterColor + "40"; ctx.lineWidth = 28; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(refPath); ctx.restore();
    ctx.setLineDash([10, 8]); ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.stroke(refPath); ctx.setLineDash([]);
    const refs = referencePoints;
    if (refs.length > 0) {
      ctx.beginPath(); ctx.arc(refs[0].x, refs[0].y, 10, 0, Math.PI*2); ctx.fillStyle = "#4ADE80"; ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("1", refs[0].x, refs[0].y);
      ctx.beginPath(); ctx.arc(refs[refs.length-1].x, refs[refs.length-1].y, 7, 0, Math.PI*2); ctx.fillStyle = "#FF6B6B"; ctx.fill();
    }
    userPointsRef.current = [];
  }, [tracingPath, referencePoints, letterColor]);

  function getPoint(e: ReactPointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function pointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    drawingRef.current = true;
    userPointsRef.current.push(getPoint(e));
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function pointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    const prev = userPointsRef.current[userPointsRef.current.length - 1];
    const cur  = getPoint(e);
    userPointsRef.current.push(cur);
    let minDist = Infinity;
    for (const rp of referencePoints) { const d = distance(cur, rp); if (d < minDist) minDist = d; }
    ctx.save(); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.strokeStyle = minDist <= DISTANCE_THRESHOLD ? "#4ADE80" : "#FF6B6B";
    ctx.lineWidth = 10; ctx.lineCap = "round"; ctx.shadowColor = minDist <= DISTANCE_THRESHOLD ? "#4ADE80" : "#FF6B6B"; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(cur.x, cur.y); ctx.stroke(); ctx.restore();
  }
  function pointerUp() { drawingRef.current = false; }

  async function submitTracing() {
    if (!current || userPointsRef.current.length < 5) return;
    const score = computeTraceScore(userPointsRef.current, referencePoints, DISTANCE_THRESHOLD);
    setTraceScore(score);
    const pass = score >= TRACE_PASS_SCORE;
    setTraceFeedback(pass ? "pass" : "fail");
    setTraceAttempts(a => a + 1);
    try {
      await fetch("/api/quran/alphabet/tracing/score", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ letterId: current.id, phase: current.phase, tracingScore: score }),
      });
      if (pass) { setShowCelebration(true); setTraceDone(true); }
    } catch { /* non-blocking */ }
  }

  function goNext() {
    if (index < curriculum.length - 1) setLocation(`/alphabet-lesson/${curriculum[index + 1].id}`);
    else setLocation("/alphabet-folders");
  }

  // ── Final test: per-letter recording ─────────────────────────────
  const finalTestLetter = sessionLearned[finalTestIdx] !== undefined
    ? curriculum[sessionLearned[finalTestIdx]] : null;

  async function startFinalTest() {
    setSessionPhase("finaltest");
    setFinalTestIdx(0);
    setFinalTestResults([]);
  }

  async function stopFinalTestCheck() {
    if (!finalTestLetter || !isRecording) return;
    setIsRecording(false);
    mediaRecorderRef.current?.stop();
    await new Promise(r => setTimeout(r, 400));

    const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    // Child hears their own voice immediately while AI checks in parallel
    playBlob(blob);
    setIsChecking(true);

    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("letterId", String(finalTestLetter.id));
      formData.append("arabic", finalTestLetter.arabic);
      formData.append("nameArabic", finalTestLetter.nameArabic);

      const res = await fetch("/api/quran/alphabet/recitation/check", {
        method: "POST", credentials: "include", body: formData,
      });
      const data = await res.json();
      const passed = data.correct;
      const newResults = [...finalTestResults, passed];
      setFinalTestResults(newResults);
      setCheckResult({ correct: passed, feedback: data.feedback || (passed ? "Aad u fiican! ⭐" : "Mar kale isku day!") });

      setTimeout(() => {
        setCheckResult(null);
        const nextIdx = finalTestIdx + 1;
        if (nextIdx >= sessionLearned.length) {
          const allPassed = newResults.every(Boolean);
          if (allPassed) {
            setSessionComplete(true);
          } else {
            // retry failed ones — just restart final test
            setFinalTestIdx(0);
            setFinalTestResults([]);
          }
        } else {
          setFinalTestIdx(nextIdx);
        }
      }, 1600);
    } catch {
      setCheckResult({ correct: false, feedback: "Khalad. Mar kale." });
      setTimeout(() => { setCheckResult(null); }, 1200);
    } finally {
      setIsChecking(false);
    }
  }

  if (isLoading || loadingCurriculum) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📖</div>
          <p className="text-white/60 font-bold text-lg">Waa la soo rarayaa...</p>
        </div>
      </div>
    );
  }
  if (!current && sessionPhase !== "finaltest" && !sessionComplete) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-7xl">🎉</div>
        <p className="text-2xl font-black text-white text-center">Dhammaan xuruufta waa baratay!</p>
        <button className="px-8 py-4 rounded-3xl bg-amber-400 text-slate-900 font-black text-xl"
          onClick={() => setLocation("/alphabet-folders")}>Dib u noqo</button>
      </div>
    );
  }

  const completedCount = curriculum.filter(l => l.completed).length;
  const progressPct    = Math.round((completedCount / curriculum.length) * 100);

  const TABS: { id: LessonTab; label: string; emoji: string }[] = [
    { id: "listen", label: "Dhageyso", emoji: "🔊" },
    { id: "forms",  label: "Xidid",    emoji: "🔗" },
    { id: "higaad", label: "Higaad",   emoji: "📖" },
    { id: "trace",  label: "Qor",      emoji: "✏️" },
  ];

  // ═══════════════════════════════════════════════════════════════
  // SESSION COMPLETE SCREEN
  // ═══════════════════════════════════════════════════════════════
  if (sessionComplete) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="absolute text-4xl animate-bounce pointer-events-none"
            style={{ top:`${Math.random()*70+5}%`, left:`${Math.random()*80+10}%`, animationDelay:`${i*0.15}s`, animationDuration:"1s" }}>
            {["⭐","🌟","✨","🎉","🎊","🌙"][i % 6]}
          </div>
        ))}
        <div className="relative z-10 text-center max-w-sm">
          <div className="text-8xl mb-4">🏆</div>
          <h1 className="text-3xl font-black text-white mb-2">MaashaAllah!</h1>
          <p className="text-white/70 mb-2">Casharkan waa dhammaatay!</p>
          <div className="bg-white/10 rounded-2xl p-4 mb-6">
            <p className="text-[#FFD93D] font-black text-lg mb-2">Waxaad baratay:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {sessionLearned.map(i => (
                <span key={i} className="text-3xl font-black" style={{ fontFamily: "Amiri, serif", color: LETTER_COLORS[(curriculum[i]?.id ?? 1) - 1] }}>
                  {curriculum[i]?.arabic}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => {
                setSessionLearned([]); setSessionPhase("learning");
                setSessionComplete(false); setFinalTestIdx(0); setFinalTestResults([]);
              }}
              className="w-full py-4 rounded-2xl font-black text-lg text-[#1a1a2e] active:scale-95 transition-transform"
              style={{ background: "linear-gradient(135deg, #FFD93D, #FFA502)" }}
              data-testid="btn-continue-session">
              📖 Sii wad Barashada
            </button>
            <button onClick={() => setLocation("/alphabet-folders")}
              className="w-full py-3 rounded-2xl font-bold text-white/60 bg-white/10 border border-white/20 active:scale-95"
              data-testid="btn-back-folders">
              🏠 Ku noqo Xarfaha
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // FINAL TEST SCREEN
  // ═══════════════════════════════════════════════════════════════
  if (sessionPhase === "finaltest" && finalTestLetter) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <p className="text-white/40 text-sm font-bold mb-1">Imtixaan Xariifka</p>
            <div className="flex justify-center gap-2 mb-4">
              {sessionLearned.map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-full ${
                  i < finalTestResults.length
                    ? (finalTestResults[i] ? "bg-green-400" : "bg-red-400")
                    : i === finalTestIdx ? "bg-[#FFD93D]" : "bg-white/20"
                }`} />
              ))}
            </div>
            <h2 className="text-white font-black text-xl">
              Xaraf {finalTestIdx + 1} / {sessionLearned.length}
            </h2>
          </div>

          {/* Hidden letter card */}
          <div className="rounded-3xl p-8 mb-6 text-center border border-white/10 bg-white/5">
            <p className="text-white/40 text-sm mb-4">Xarafka waa la qariyey — maxaad maqashay?</p>
            {/* Show Somali name only, no Arabic */}
            <p className="text-4xl font-black text-white/80 mb-2">{finalTestLetter.nameSomali}</p>
            <p className="text-white/30 text-sm">Ku dhawaaq xarafka Carabiga</p>
          </div>

          {/* Check result */}
          {checkResult && (
            <div className={`rounded-2xl p-4 mb-4 text-center ${checkResult.correct ? "bg-green-500/20 border border-green-500/40" : "bg-red-500/20 border border-red-500/40"}`}>
              {checkResult.correct ? <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-1" /> : <XCircle className="w-8 h-8 text-red-400 mx-auto mb-1" />}
              <p className={`font-bold text-sm ${checkResult.correct ? "text-green-300" : "text-red-300"}`}>{checkResult.feedback}</p>
            </div>
          )}

          {/* Recording button */}
          {!checkResult && !isChecking && (
            <button
              onClick={() => isRecording ? stopFinalTestCheck() : startRecording()}
              disabled={isChecking}
              className={`w-full py-5 rounded-2xl font-black text-xl active:scale-95 transition-all ${
                isRecording
                  ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40"
                  : "text-[#1a1a2e]"
              }`}
              style={!isRecording ? { background: "linear-gradient(135deg, #FFD93D, #FFA502)" } : {}}
              data-testid="btn-final-record">
              {isRecording ? <><MicOff className="inline w-6 h-6 mr-2" />Jooji Duubida</> : <><Mic className="inline w-6 h-6 mr-2" />Bilow Duubida</>}
            </button>
          )}

          {isChecking && (
            <div className="text-center py-5">
              <div className="w-10 h-10 border-4 border-[#FFD93D]/20 border-t-[#FFD93D] rounded-full animate-spin mx-auto mb-2" />
              <p className="text-white/40 text-sm">AI waa hubinayaa...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // REVIEW SCREEN
  // ═══════════════════════════════════════════════════════════════
  if (sessionPhase === "review") {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h2 className="text-white font-black text-2xl text-center mb-2">Dib u Eeg ✨</h2>
          <p className="text-white/50 text-sm text-center mb-6">Xarfaha aad baratay — akhriso saddex jeer</p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {sessionLearned.map(i => {
              const letter = curriculum[i];
              const color = LETTER_COLORS[(letter?.id ?? 1) - 1];
              return (
                <button key={i}
                  onClick={() => playLetterAudio(letter.nameArabic)}
                  className="rounded-2xl p-4 flex flex-col items-center gap-1 border border-white/10 active:scale-95 transition-transform"
                  style={{ background: color + "18" }}>
                  <span className="text-4xl font-black leading-none" style={{ fontFamily: "Amiri, serif", color }}>
                    {letter?.arabic}
                  </span>
                  <span className="text-white/50 text-xs font-bold">{letter?.nameSomali}</span>
                  <Volume2 className="w-3 h-3 opacity-40" style={{ color }} />
                </button>
              );
            })}
          </div>

          <button
            onClick={startFinalTest}
            className="w-full py-4 rounded-2xl font-black text-xl text-[#1a1a2e] active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #FFD93D, #FFA502)" }}
            data-testid="btn-start-final-test">
            🧪 Bilow Imtixaanka
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN LESSON SCREEN
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#1a1a2e] relative overflow-hidden pb-32">
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="absolute rounded-full bg-white pointer-events-none"
          style={{
            width: `${Math.random() * 2.5 + 1}px`, height: `${Math.random() * 2.5 + 1}px`,
            top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.4 + 0.1,
          }} />
      ))}

      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="absolute text-4xl animate-bounce"
              style={{ top:`${Math.random()*70+5}%`, left:`${Math.random()*80+10}%`, animationDelay:`${i*0.12}s`, animationDuration:"0.9s" }}>
              {["⭐","🌟","✨","🎉","🎊"][i % 5]}
            </div>
          ))}
        </div>
      )}

      {/* Floating session button (min 3 letters) */}
      {sessionLearned.length >= SESSION_MIN && sessionPhase === "learning" && !autoAdvancing && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-bounce">
          <button
            onClick={() => setSessionPhase("review")}
            className="px-6 py-3 rounded-2xl font-black text-[#1a1a2e] shadow-2xl active:scale-95 transition-transform flex items-center gap-2"
            style={{ background: "linear-gradient(135deg, #FFD93D, #FFA502)", boxShadow: "0 8px 32px rgba(255,217,61,0.5)" }}
            data-testid="btn-session-ready">
            ✅ Diyaar — Imtixaanka Bilow ({sessionLearned.length} xaraf)
          </button>
        </div>
      )}

      <div className="relative z-10 max-w-md mx-auto px-4 pt-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setLocation("/alphabet-folders")}
            className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white"
            data-testid="btn-back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="text-white font-black text-base">Baro Alifka</h1>
            <p className="text-white/40 text-xs">{index + 1} / {curriculum.length}</p>
          </div>
          <div className="flex items-center gap-1 bg-white/10 rounded-xl px-2 py-1">
            <span className="text-[#FFD93D] font-black text-sm">{sessionLearned.length}</span>
            <span className="text-white/40 text-xs">/ {SESSION_MIN}</span>
            <span className="text-xs">⭐</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-1 h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${letterColor}, ${letterColor}99)` }} />
        </div>
        <p className="text-white/30 text-xs text-center mb-4">{completedCount}/{curriculum.length} — {progressPct}%</p>

        {/* Letter hero card */}
        <div className="rounded-3xl px-5 pt-5 pb-4 mb-4 text-center relative overflow-hidden border border-white/10"
          style={{ background: `linear-gradient(135deg, ${letterColor}12, ${letterColor}06)` }}>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span className="font-black leading-none opacity-[0.04] text-[240px]"
              style={{ fontFamily: "Amiri, serif", color: letterColor }}>
              {current?.arabic}
            </span>
          </div>
          <button onClick={() => current && playLetterAudio(current.nameArabic)}
            className={`relative z-10 font-black leading-none mb-2 block mx-auto transition-transform active:scale-95 ${audioPlaying ? "animate-pulse" : ""}`}
            style={{ fontFamily: "Amiri, serif", color: letterColor, textShadow: `0 0 50px ${letterColor}90`, fontSize: "clamp(120px, 35vw, 180px)" }}
            data-testid="btn-play-letter">
            {current?.arabic}
          </button>
          <div className="relative z-10 flex items-center justify-center gap-2 mb-1">
            {audioPlaying && (
              <div className="flex gap-1 items-end h-5">
                {[1,2,3].map(i => (
                  <div key={i} className="w-1.5 rounded-full animate-bounce"
                    style={{ height:`${i*5+4}px`, backgroundColor: letterColor, animationDelay:`${i*0.15}s` }} />
                ))}
              </div>
            )}
            <p className="text-3xl font-black text-white/90" style={{ fontFamily: "Amiri, serif" }}>
              {current?.nameArabic}
            </p>
          </div>
          <p className="relative z-10 text-white/50 font-bold text-sm">{current?.nameSomali}</p>
        </div>

        {/* Tab bar */}
        <div className="grid grid-cols-4 gap-1.5 mb-5">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 rounded-2xl font-bold text-xs flex flex-col items-center gap-1 transition-all ${
                activeTab === tab.id ? "text-[#1a1a2e] shadow-lg" : "bg-white/6 text-white/40 border border-white/10"
              }`}
              style={activeTab === tab.id ? { backgroundColor: letterColor, boxShadow: `0 4px 20px ${letterColor}60` } : {}}
              data-testid={`tab-${tab.id}`}>
              <span className="text-lg">{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── LISTEN TAB ── */}
        {activeTab === "listen" && (
          <div className="space-y-3">
            {/* Re-listen button */}
            <button onClick={() => current && playLetterAudio(current.nameArabic)}
              className="w-full rounded-2xl py-4 text-lg font-black flex items-center justify-center gap-3 active:scale-98 transition-transform border border-white/10"
              style={{ backgroundColor: letterColor + "20", color: "white" }}
              disabled={audioPlaying}
              data-testid="btn-listen-again">
              <Volume2 className="w-6 h-6" />
              {audioPlaying ? "Codka waa la dhagaystaa..." : "🔊 Dhageyso Mar Kale"}
            </button>

            {/* Recording section */}
            {hasListened && (
              <div className="rounded-2xl border border-white/10 p-4 space-y-3"
                style={{ backgroundColor: letterColor + "08" }}>
                <p className="text-center text-white/60 text-sm font-bold">
                  Hadda adiga ku dhawaaq xarafka 🎤
                </p>

                {/* Check result feedback */}
                {checkResult && (
                  <div className={`rounded-xl p-3 text-center ${checkResult.correct ? "bg-green-500/20 border border-green-500/40" : "bg-red-500/20 border border-red-500/40"}`}>
                    {checkResult.correct
                      ? <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-1" />
                      : <XCircle className="w-8 h-8 text-red-400 mx-auto mb-1" />}
                    <p className={`font-bold text-sm ${checkResult.correct ? "text-green-300" : "text-red-300"}`}>
                      {checkResult.feedback}
                    </p>
                  </div>
                )}

                {isChecking && (
                  <div className="text-center py-3">
                    <div className="w-8 h-8 border-4 border-[#FFD93D]/20 border-t-[#FFD93D] rounded-full animate-spin mx-auto mb-1" />
                    <p className="text-white/40 text-xs">AI waa hubinayaa...</p>
                  </div>
                )}

                {autoAdvancing && (
                  <div className="text-center py-2">
                    <p className="text-green-300 font-bold text-sm animate-pulse">⏭ Xarafka xiga...</p>
                  </div>
                )}

                {!checkResult && !isChecking && !autoAdvancing && (
                  <button
                    onClick={() => current && (isRecording ? stopAndCheck(current) : startRecording())}
                    className={`w-full py-4 rounded-2xl font-black text-lg active:scale-95 transition-all ${
                      isRecording
                        ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40"
                        : "text-[#1a1a2e]"
                    }`}
                    style={!isRecording ? { background: `linear-gradient(135deg, ${letterColor}, ${letterColor}cc)` } : {}}
                    data-testid="btn-record">
                    {isRecording
                      ? <><MicOff className="inline w-5 h-5 mr-2" />Jooji Duubida</>
                      : <><Mic className="inline w-5 h-5 mr-2" />Bilow Duubida</>}
                  </button>
                )}

                {checkResult && !checkResult.correct && !autoAdvancing && (
                  <button
                    onClick={() => { setCheckResult(null); }}
                    className="w-full py-3 rounded-2xl font-bold text-white/70 bg-white/10 border border-white/20 active:scale-95 text-sm"
                    data-testid="btn-retry">
                    🔄 Dib u isku day
                  </button>
                )}
              </div>
            )}

            {/* Quran word card */}
            {qWord && (
              <div className="rounded-2xl px-5 py-4 border border-white/10"
                style={{ backgroundColor: letterColor + "12" }}>
                <p className="text-white/40 text-xs mb-2 text-center">Erayga Quraanka ah</p>
                <p className="text-center font-black mb-1 leading-tight"
                  style={{ fontFamily: "Amiri, serif", color: letterColor, fontSize: "clamp(36px, 10vw, 52px)", direction: "rtl" }}>
                  {qWord.word} {qWord.emoji}
                </p>
                <p className="text-center text-white/40 text-sm">{qWord.meaning}</p>
              </div>
            )}
          </div>
        )}

        {/* ── FORMS (XIDID) TAB ── */}
        {activeTab === "forms" && forms && (
          <div className="space-y-3">
            <p className="text-white/50 text-xs text-center font-bold mb-1">Sida xarfuhu u yimaadaan meelaha kala duwan</p>
            {forms.nonConnecting && (
              <div className="rounded-xl px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-center">
                <p className="text-amber-300 text-xs font-bold">⚠️ Xarfan kuma xidna xarfaha ka hor</p>
              </div>
            )}
            {[
              { label: "Gooni (Isolated)", form: forms.isolated, note: "Marka xariig dheer kelidii" },
              { label: "Horeba (Initial)",  form: forms.initial,  note: "Bilawga ereyga" },
              { label: "Dhexe (Medial)",    form: forms.medial,   note: "Dhexda ereyga" },
              { label: "Dhamaad (Final)",   form: forms.final,    note: "Dhamaadka ereyga" },
            ].map(({ label, form, note }) => (
              <button key={label}
                onClick={() => playForm(form, label)}
                className={`w-full flex items-center justify-between rounded-2xl px-5 py-3.5 border transition-all active:scale-98 ${formPlaying === label ? "border-white/30" : "border-white/10"}`}
                style={{ backgroundColor: formPlaying === label ? letterColor + "25" : letterColor + "0d" }}>
                <div className="text-left">
                  <p className="text-white/70 text-xs font-bold">{label}</p>
                  <p className="text-white/40 text-[10px]">{note}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-4xl leading-none" style={{ fontFamily: "Amiri, serif", color: letterColor, direction: "rtl" }}>{form}</span>
                  <Volume2 className="w-4 h-4 opacity-40" style={{ color: letterColor }} />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── HIGAAD (HARAKAT) TAB ── */}
        {activeTab === "higaad" && current && (
          <div className="space-y-2.5">
            <p className="text-white/50 text-xs text-center font-bold mb-1">Astaamaha codadka — taabo si aad u dhagaystid</p>
            {HARAKAT_LIST.map(h => {
              const vowelized = h.example(current.arabic);
              return (
                <button key={h.mark}
                  onClick={() => { setHarakatPlaying(h.mark); playLetterAudio(vowelized).then(() => setHarakatPlaying(null)); }}
                  className={`w-full flex items-center gap-4 rounded-2xl px-4 py-3 border transition-all active:scale-98 ${harakatPlaying === h.mark ? "border-white/30" : "border-white/10"}`}
                  style={{ backgroundColor: harakatPlaying === h.mark ? h.color + "22" : h.color + "0d" }}>
                  <span className="text-3xl font-black w-12 text-center flex-shrink-0" style={{ fontFamily: "Amiri, serif", color: h.color }}>{vowelized}</span>
                  <div className="flex-1 text-left">
                    <p className="text-white/80 font-bold text-sm">{h.name}</p>
                    <p className="text-white/40 text-xs">{h.desc}</p>
                  </div>
                  <Volume2 className="w-4 h-4 opacity-40" style={{ color: h.color }} />
                </button>
              );
            })}
          </div>
        )}

        {/* ── TRACE (QOR) TAB ── */}
        {activeTab === "trace" && (
          <div className="flex flex-col items-center gap-4">
            {traceDone ? (
              <div className="text-center py-6">
                <p className="text-5xl mb-3">🎉</p>
                <p className="text-green-400 font-black text-xl">MaashaAllah! Waa sax!</p>
                <p className="text-white/50 text-sm mt-2">Qoraalku waa fiicnaaday</p>
                <button onClick={goNext} className="mt-5 px-8 py-3 rounded-2xl font-black text-[#1a1a2e] text-lg active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${letterColor}, ${letterColor}cc)` }}
                  data-testid="btn-next-letter">
                  Xarafka xiga ➜
                </button>
              </div>
            ) : (
              <>
                <p className="text-white/50 text-xs font-bold">Raac xarriiqda — faraha saartid daboolka</p>
                <div className="relative rounded-2xl overflow-hidden border-2 border-white/10"
                  style={{ boxShadow: `0 0 30px ${letterColor}30` }}>
                  <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE}
                    style={{ display:"block", width:`${CANVAS_SIZE}px`, height:`${CANVAS_SIZE}px`, touchAction:"none" }}
                    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
                    data-testid="canvas-trace" />
                </div>
                {traceScore !== null && (
                  <div className={`w-full rounded-2xl p-3 text-center ${traceFeedback === "pass" ? "bg-green-500/20 border border-green-500/40" : "bg-red-500/20 border border-red-500/40"}`}>
                    <p className={`font-black text-lg ${traceFeedback === "pass" ? "text-green-400" : "text-red-400"}`}>
                      {traceFeedback === "pass" ? "✅ Aad u fiican!" : "❌ Mar kale isku day"}
                    </p>
                    <p className="text-white/50 text-sm">Dhibcahaaga: {traceScore}%</p>
                  </div>
                )}
                <div className="flex gap-3 w-full">
                  <button onClick={drawCanvas}
                    className="flex-1 py-3 rounded-2xl font-bold bg-white/10 border border-white/20 text-white/70 text-sm active:scale-95"
                    data-testid="btn-clear-trace">
                    🗑 Nadiifi
                  </button>
                  <button onClick={submitTracing}
                    className="flex-1 py-3 rounded-2xl font-black text-[#1a1a2e] text-sm active:scale-95"
                    style={{ background: `linear-gradient(135deg, ${letterColor}, ${letterColor}cc)` }}
                    data-testid="btn-submit-trace">
                    ✓ Hubi
                  </button>
                </div>
                {traceAttempts > 0 && traceFeedback === "fail" && (
                  <button onClick={goNext}
                    className="text-white/30 text-sm font-bold underline"
                    data-testid="btn-skip-trace">
                    Ka bood ➜
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
