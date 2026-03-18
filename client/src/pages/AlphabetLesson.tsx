import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useLocation, useParams } from "wouter";
import { useChildAuth } from "@/contexts/ChildAuthContext";
import { ArrowLeft, Volume2 } from "lucide-react";

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

const TRACE_PASS_SCORE = 55;
const DISTANCE_THRESHOLD = 22;
const CANVAS_SIZE = 280;

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

function speakArabic(text: string, then?: () => void) {
  if (!("speechSynthesis" in window)) { then?.(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ar-SA"; u.rate = 0.7; u.pitch = 1.0;
  u.onend = () => then?.();
  u.onerror = () => then?.();
  window.speechSynthesis.speak(u);
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
  const [audioPlaying, setAudioPlaying] = useState(false);

  const [traceScore, setTraceScore]       = useState<number | null>(null);
  const [traceFeedback, setTraceFeedback] = useState<"" | "pass" | "fail">("");
  const [traceAttempts, setTraceAttempts] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [traceDone, setTraceDone]         = useState(false);

  const [harakatPlaying, setHarakatPlaying] = useState<string | null>(null);
  const [formPlaying, setFormPlaying]       = useState<string | null>(null);

  const canvasRef  = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const userPointsRef = useRef<Point[]>([]);

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

  useEffect(() => {
    setActiveTab("listen");
    setTraceScore(null); setTraceFeedback(""); setTraceAttempts(0);
    setShowCelebration(false); setTraceDone(false);
    if (current) setTimeout(() => { setAudioPlaying(true); speakArabic(current.nameArabic, () => setAudioPlaying(false)); }, 500);
  }, [current?.id]);

  useEffect(() => {
    if (activeTab === "trace") setTimeout(() => drawCanvas(), 100);
  }, [activeTab, drawCanvas]);

  function playLetterAudio() {
    if (!current) return;
    setAudioPlaying(true);
    speakArabic(current.nameArabic, () => setAudioPlaying(false));
  }

  function playHarakat(vowelized: string, mark: string) {
    setHarakatPlaying(mark);
    speakArabic(vowelized, () => setHarakatPlaying(null));
  }

  function playForm(form: string, label: string) {
    setFormPlaying(label);
    speakArabic(form.replace(/ـ/g, ""), () => setFormPlaying(null));
  }

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
      if (pass) {
        await fetch("/api/quran/alphabet/complete", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ letterId: current.id, phase: current.phase, completed: true, tracingScore: score, recitationScore: 70 }),
        });
        setShowCelebration(true);
        setTraceDone(true);
      }
    } catch { /* non-blocking */ }
  }

  function goNext() {
    if (index < curriculum.length - 1) {
      setLocation(`/alphabet-lesson/${curriculum[index + 1].id}`);
    } else {
      setLocation("/alphabet-folders");
    }
  }
  function goBack() {
    setLocation("/alphabet-folders");
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
  if (!current) {
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

  return (
    <div className="min-h-screen bg-[#1a1a2e] relative overflow-hidden pb-28">
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

      <div className="relative z-10 max-w-md mx-auto px-4 pt-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={goBack}
            className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white"
            data-testid="btn-back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="text-white font-black text-base">Baro Alifka</h1>
            <p className="text-white/40 text-xs">{index + 1} / {curriculum.length}</p>
          </div>
          <button onClick={() => setLocation("/alphabet-games")}
            className="px-3 py-2 rounded-2xl bg-purple-500/30 border border-purple-400/40 text-purple-300 font-bold text-xs"
            data-testid="btn-games">
            🎮 Ciyaaro
          </button>
        </div>

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
              {current.arabic}
            </span>
          </div>
          <button onClick={playLetterAudio}
            className={`relative z-10 font-black leading-none mb-2 block mx-auto transition-transform active:scale-95 ${audioPlaying ? "animate-pulse" : ""}`}
            style={{ fontFamily: "Amiri, serif", color: letterColor, textShadow: `0 0 50px ${letterColor}90`, fontSize: "clamp(120px, 35vw, 180px)" }}
            data-testid="btn-play-letter">
            {current.arabic}
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
              {current.nameArabic}
            </p>
          </div>
          <p className="relative z-10 text-white/50 font-bold text-sm">{current.nameSomali}</p>
        </div>

        {/* Tab bar */}
        <div className="grid grid-cols-4 gap-1.5 mb-5">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 rounded-2xl font-bold text-xs flex flex-col items-center gap-1 transition-all ${
                activeTab === tab.id
                  ? "text-[#1a1a2e] shadow-lg"
                  : "bg-white/6 text-white/40 border border-white/10"
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
            <button onClick={playLetterAudio}
              className="w-full rounded-2xl py-4 text-lg font-black flex items-center justify-center gap-3 active:scale-98 transition-transform border border-white/10"
              style={{ backgroundColor: letterColor + "20", color: "white" }}
              data-testid="btn-listen-again">
              <Volume2 className="w-6 h-6" /> Dhageyso Mar Kale
            </button>

            {qWord && (
              <div className="rounded-2xl px-5 py-4 border border-white/10"
                style={{ backgroundColor: letterColor + "12" }}>
                <p className="text-white/40 text-xs mb-2 text-center">Erayga Quraanka ah</p>
                <p className="text-center font-black mb-1 leading-tight"
                  style={{ fontFamily: "Amiri, serif", color: letterColor, fontSize: "clamp(36px, 10vw, 52px)", direction: "rtl" }}>
                  {qWord.word} {qWord.emoji}
                </p>
                <p className="text-center text-white/50 text-sm font-bold">{qWord.meaning}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-2">
              {index > 0 && (
                <button onClick={() => setLocation(`/alphabet-lesson/${curriculum[index - 1].id}`)}
                  className="rounded-2xl py-3 font-bold text-white/50 border border-white/10 bg-white/5 text-sm"
                  data-testid="btn-prev">
                  ← {curriculum[index - 1].arabic}
                </button>
              )}
              <button onClick={() => setActiveTab("forms")}
                className={`rounded-2xl py-3 font-black text-sm text-[#1a1a2e] ${index === 0 ? "col-span-2" : ""}`}
                style={{ background: `linear-gradient(135deg, ${letterColor}, ${letterColor}cc)` }}
                data-testid="btn-continue">
                Sii wad →
              </button>
            </div>
          </div>
        )}

        {/* ── CONNECTED FORMS TAB ── */}
        {activeTab === "forms" && forms && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <p className="text-white/60 text-sm font-bold">
                Sida <span style={{ color: letterColor }}>{current.arabic}</span> erayada ku eg tahay
              </p>
              {forms.nonConnecting && (
                <p className="text-amber-400/80 text-xs mt-1">
                  ⚠️ Xarfahan kaliya dhinac bidix ma xidna
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Kaliya",  form: forms.isolated, pos: "Meel kasta", somali: "Alone" },
                { label: "Hore",   form: forms.initial,  pos: "Ereyga hore", somali: "Bilowga" },
                { label: "Dhexe",  form: forms.medial,   pos: "Dhexda ereyga", somali: "Dhex" },
                { label: "Dib",    form: forms.final,    pos: "Dhabarka ereyga", somali: "Dhammaadka" },
              ].map(f => (
                <button key={f.label}
                  onClick={() => playForm(f.form, f.label)}
                  className="rounded-2xl p-4 border flex flex-col items-center gap-2 active:scale-97 transition-all"
                  style={{
                    borderColor: formPlaying === f.label ? letterColor : "rgba(255,255,255,0.12)",
                    backgroundColor: formPlaying === f.label ? letterColor + "20" : "rgba(255,255,255,0.04)",
                  }}
                  data-testid={`btn-form-${f.label}`}>
                  <span className="font-black leading-none"
                    style={{ fontFamily: "Amiri, serif", color: letterColor, fontSize: "clamp(42px, 12vw, 60px)" }}>
                    {f.form}
                  </span>
                  <div className="text-center">
                    <p className="text-white/80 font-black text-sm">{f.somali}</p>
                    <p className="text-white/30 text-xs">{f.pos}</p>
                  </div>
                  {formPlaying === f.label && (
                    <div className="flex gap-1 items-end h-3 mt-1">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-1 rounded-full animate-bounce"
                          style={{ height:`${i*3+3}px`, backgroundColor: letterColor, animationDelay:`${i*0.12}s` }} />
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="rounded-2xl p-4 border border-white/10 bg-white/4">
              <p className="text-white/50 text-xs text-center mb-3 font-bold">Eray Quraanka ah oo leh {current.arabic}</p>
              <div className="grid grid-cols-3 gap-2 text-center" dir="rtl">
                {[
                  { word: current.arabic + "ـ",        where: "Hore"  },
                  { word: "ـ" + current.arabic + "ـ",  where: "Dhex"  },
                  { word: "ـ" + current.arabic,         where: "Dib"   },
                ].map(ex => (
                  <div key={ex.where} className="rounded-xl p-2 bg-white/5 border border-white/10">
                    <p className="font-black text-2xl mb-1" style={{ fontFamily: "Amiri, serif", color: letterColor }}>
                      {ex.word}
                    </p>
                    <p className="text-white/30 text-xs" dir="ltr">{ex.where}</p>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setActiveTab("higaad")}
              className="w-full rounded-2xl py-4 font-black text-[#1a1a2e]"
              style={{ background: `linear-gradient(135deg, ${letterColor}, ${letterColor}cc)` }}
              data-testid="btn-to-higaad">
              📖 Higaadda →
            </button>
          </div>
        )}

        {/* ── HIGAAD TAB ── */}
        {activeTab === "higaad" && (
          <div className="space-y-4">
            <div className="text-center mb-1">
              <p className="text-white/60 text-sm font-bold">
                Gujiso xarfaha si aad u maqasho — baro sida loo akhristo
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {HARAKAT_LIST.map(h => {
                const vowelized = h.example(current.arabic);
                const isPlaying = harakatPlaying === h.mark;
                return (
                  <button key={h.mark}
                    onClick={() => playHarakat(vowelized, h.mark)}
                    className="rounded-2xl py-4 px-3 border flex flex-col items-center gap-1.5 active:scale-96 transition-all"
                    style={{
                      borderColor: isPlaying ? h.color : "rgba(255,255,255,0.10)",
                      backgroundColor: isPlaying ? h.color + "20" : "rgba(255,255,255,0.04)",
                    }}
                    data-testid={`btn-harakat-${h.name}`}>
                    <span className="font-black leading-none"
                      style={{ fontFamily: "Amiri, serif", color: h.color, fontSize: "clamp(44px, 13vw, 64px)" }}>
                      {vowelized}
                    </span>
                    <div className="text-center">
                      <p className="text-white/80 font-bold text-sm">{h.name}</p>
                      <p className="text-white/40 text-xs">{h.desc}</p>
                    </div>
                    {isPlaying && (
                      <div className="flex gap-1 items-end h-3">
                        {[1,2,3].map(i => (
                          <div key={i} className="w-1 rounded-full animate-bounce"
                            style={{ height:`${i*3+2}px`, backgroundColor: h.color, animationDelay:`${i*0.12}s` }} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl p-4 border border-[#FFD93D]/20 bg-[#FFD93D]/5">
              <p className="text-[#FFD93D] font-black text-sm mb-2">💡 Talooyinka Akhrinta</p>
              <ul className="text-white/50 text-xs space-y-1">
                <li>• Fatha (ـَ) = Codka "a" — sida: بَ = "ba"</li>
                <li>• Kasra (ـِ) = Codka "i" — sida: بِ = "bi"</li>
                <li>• Damma (ـُ) = Codka "u" — sida: بُ = "bu"</li>
                <li>• Sukuun (ـْ) = Joogsasho — codna ma jiro</li>
              </ul>
            </div>

            <button onClick={() => setActiveTab("trace")}
              className="w-full rounded-2xl py-4 font-black text-[#1a1a2e]"
              style={{ background: `linear-gradient(135deg, ${letterColor}, ${letterColor}cc)` }}
              data-testid="btn-to-trace">
              ✏️ Hadda Qor →
            </button>
          </div>
        )}

        {/* ── TRACE TAB ── */}
        {activeTab === "trace" && (
          <div>
            {traceDone ? (
              <div className="text-center space-y-4">
                <div className="rounded-3xl p-8 border border-white/10" style={{ backgroundColor: letterColor + "15" }}>
                  <div className="text-7xl mb-4">🌟</div>
                  <h2 className="text-3xl font-black text-white mb-2">Aad u fiican!</h2>
                  <p className="text-white/60 font-bold">
                    <span style={{ color: letterColor }} className="text-2xl">{current.arabic}</span> — {current.nameSomali}
                  </p>
                  {traceScore && <p className="text-white/40 text-sm mt-2">Natiijo: {traceScore}% ⭐</p>}
                </div>
                <button onClick={goNext}
                  className="w-full rounded-3xl py-5 text-xl font-black"
                  style={{ background: `linear-gradient(135deg, ${letterColor}, ${letterColor}cc)`, color: "#0f172a" }}
                  data-testid="btn-next-letter">
                  {index < curriculum.length - 1 ? "Xarafka xiga →" : "🎉 Dhammaad!"}
                </button>
              </div>
            ) : (
              <div>
                <div className="rounded-3xl p-4 mb-4 border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white/70 font-bold text-sm">✏️ Raac xariiqda caddaan ah</p>
                    {traceAttempts > 0 && traceScore !== null && (
                      <span className="text-sm font-black" style={{ color: traceFeedback === "pass" ? "#4ADE80" : "#FF6B6B" }}>
                        {traceScore}%
                      </span>
                    )}
                  </div>
                  <div className="flex justify-center">
                    <div className="rounded-2xl overflow-hidden border-2"
                      style={{ borderColor: traceFeedback === "pass" ? "#4ADE80" : traceFeedback === "fail" ? "#FF6B6B" : letterColor + "50" }}>
                      <canvas ref={canvasRef} className="touch-none block"
                        style={{ width: `${CANVAS_SIZE}px`, height: `${CANVAS_SIZE}px`, cursor: "crosshair" }}
                        onPointerDown={pointerDown} onPointerMove={pointerMove}
                        onPointerUp={pointerUp} onPointerCancel={pointerUp}
                        data-testid="trace-canvas" />
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-1 text-xs text-white/30">
                    <span className="w-3 h-1 rounded-full bg-green-400" /> Fiican
                    <span className="w-3 h-1 rounded-full bg-red-400 ml-2" /> Meel kale
                  </div>
                </div>

                {traceFeedback === "fail" && (
                  <div className="mb-3 rounded-2xl px-4 py-3 bg-red-500/10 border border-red-500/30 text-center">
                    <p className="text-red-300 font-bold">❌ Mar kale isku day! Raac xariiqda caddaan ah.</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => drawCanvas()}
                    className="flex-1 rounded-2xl py-4 font-bold text-white/60 border border-white/15 bg-white/5"
                    data-testid="btn-clear">🧹 Nadiifi</button>
                  <button onClick={submitTracing}
                    className="flex-grow rounded-2xl py-4 font-black text-slate-900"
                    style={{ background: `linear-gradient(135deg, ${letterColor}, ${letterColor}cc)`, minWidth: "60%" }}
                    data-testid="btn-check-trace">✅ Hubi</button>
                </div>

                {traceAttempts >= 3 && traceFeedback !== "pass" && (
                  <button onClick={() => { setTraceDone(true); setShowCelebration(false); }}
                    className="w-full mt-3 rounded-2xl py-3 font-bold text-white/40 border border-white/10 text-sm"
                    data-testid="btn-skip">Xarafka xiga →</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prev / Next floating nav at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-20 max-w-md mx-auto px-4 pb-4 pt-2 bg-[#1a1a2e]/90 backdrop-blur-sm border-t border-white/10">
        <div className="flex gap-3">
          <button
            onClick={() => index > 0 && setLocation(`/alphabet-lesson/${curriculum[index - 1].id}`)}
            disabled={index === 0}
            className="flex-1 rounded-2xl py-3 font-bold text-sm border border-white/10 text-white/50 disabled:opacity-25"
            data-testid="btn-nav-prev">
            ← {index > 0 ? curriculum[index - 1].arabic : ""}
          </button>
          <button
            onClick={playLetterAudio}
            className="w-14 rounded-2xl py-3 font-bold text-lg flex items-center justify-center border border-white/10"
            style={{ color: letterColor, backgroundColor: letterColor + "15" }}
            data-testid="btn-nav-play">
            🔊
          </button>
          <button
            onClick={() => index < curriculum.length - 1
              ? setLocation(`/alphabet-lesson/${curriculum[index + 1].id}`)
              : setLocation("/alphabet-folders")}
            className="flex-1 rounded-2xl py-3 font-bold text-sm border border-white/10 text-white/50"
            data-testid="btn-nav-next">
            {index < curriculum.length - 1 ? curriculum[index + 1].arabic : "✓"} →
          </button>
        </div>
      </div>
    </div>
  );
}
