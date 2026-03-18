import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useLocation } from "wouter";
import { useChildAuth } from "@/contexts/ChildAuthContext";

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
  recitationScore?: number;
};

type Point = { x: number; y: number };
type Step = "listen" | "trace" | "done";

const TRACE_PASS_SCORE = 55;
const DISTANCE_THRESHOLD = 22;

const AUDIO_SLUG_BY_ARABIC: Record<string, string> = {
  "ا": "alif", "ب": "ba", "ت": "ta", "ث": "tha", "ج": "jeem",
  "ح": "ha", "خ": "kha", "د": "dal", "ذ": "dhal", "ر": "ra",
  "ز": "zay", "س": "seen", "ش": "sheen", "ص": "sad", "ض": "dad",
  "ط": "taa", "ظ": "zaa", "ع": "ain", "غ": "ghain", "ف": "fa",
  "ق": "qaf", "ك": "kaf", "ل": "lam", "م": "meem", "ن": "noon",
  "ه": "ha2", "و": "waw", "ي": "ya",
};

const LETTER_COLORS: string[] = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FECA57",
  "#FF9FF3", "#54A0FF", "#5F27CD", "#00D2D3", "#FF9F43",
  "#EE5A24", "#009432", "#0652DD", "#9980FA", "#C4E538",
  "#FDA7DF", "#D980FA", "#FFC312", "#12CBC4", "#B53471",
  "#833471", "#1289A7", "#C4E538", "#F79F1F", "#A3CB38",
  "#1B1464", "#6F1E51", "#ED4C67",
];

const QURAN_WORDS: Record<string, { word: string; meaning: string; emoji: string; sound?: string }> = {
  "ا": { word: "اللَّه", meaning: "Allah", emoji: "✨", sound: "Allah" },
  "ب": { word: "بِسْمِ", meaning: "Magaciisa", emoji: "📖", sound: "Bismi" },
  "ت": { word: "تَوْبَة", meaning: "Toobad", emoji: "🤲", sound: "Tawbah" },
  "ث": { word: "ثَوَاب", meaning: "Ajar", emoji: "⭐", sound: "Thawaab" },
  "ج": { word: "جَنَّة", meaning: "Jannada", emoji: "🌿", sound: "Jannah" },
  "ح": { word: "حَمْد", meaning: "Mahad", emoji: "🙏", sound: "Hamd" },
  "خ": { word: "خَيْر", meaning: "Wanaag", emoji: "💫", sound: "Khayr" },
  "د": { word: "دُعَاء", meaning: "Ducada", emoji: "🤲", sound: "Du'aa" },
  "ذ": { word: "ذِكْر", meaning: "Xusuus", emoji: "💝", sound: "Dhikr" },
  "ر": { word: "رَحْمَة", meaning: "Naxariis", emoji: "❤️", sound: "Rahmah" },
  "ز": { word: "زَكَاة", meaning: "Sadar", emoji: "💛", sound: "Zakaah" },
  "س": { word: "سَلَام", meaning: "Nabad", emoji: "☮️", sound: "Salaam" },
  "ش": { word: "شُكْر", meaning: "Mahadnaq", emoji: "😊", sound: "Shukr" },
  "ص": { word: "صَلَاة", meaning: "Salaadda", emoji: "🕌", sound: "Salaah" },
  "ض": { word: "ضِيَاء", meaning: "Nuur", emoji: "💡", sound: "Diyaa" },
  "ط": { word: "طَهَارَة", meaning: "Nadiifnimo", emoji: "✨", sound: "Taharah" },
  "ظ": { word: "ظَفَر", meaning: "Guul", emoji: "🏆", sound: "Zafar" },
  "ع": { word: "عِبَادَة", meaning: "Cibaado", emoji: "⭐", sound: "Ibaadah" },
  "غ": { word: "غُفْرَان", meaning: "Dambi dhaaf", emoji: "🤲", sound: "Ghufran" },
  "ف": { word: "فُرْقَان", meaning: "Quraanka", emoji: "📖", sound: "Furqaan" },
  "ق": { word: "قُرْآن", meaning: "Quraanka", emoji: "📗", sound: "Qur'aan" },
  "ك": { word: "كَرِيم", meaning: "Karim", emoji: "💎", sound: "Kariim" },
  "ل": { word: "لَطِيف", meaning: "Naxariis leh", emoji: "💙", sound: "Latiif" },
  "م": { word: "مُحَمَّد", meaning: "Nabigeena ﷺ", emoji: "🌙", sound: "Muhammad" },
  "ن": { word: "نُور", meaning: "Nuur", emoji: "⭐", sound: "Nuur" },
  "ه": { word: "هُدَى", meaning: "Hanuunin", emoji: "🌟", sound: "Huda" },
  "و": { word: "وَحْي", meaning: "Waxy", emoji: "📜", sound: "Wahy" },
  "ي": { word: "يَقِين", meaning: "Xaqiiq", emoji: "💫", sound: "Yaqiin" },
};

function fallbackSpeak(text: string) {
  if (!("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ar-SA";
  utter.rate = 0.7;
  utter.pitch = 1.1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function scalePathToCanvas(pathD: string, width: number, height: number) {
  const pad = 40;
  const sx = (width - pad * 2) / 100;
  const sy = (height - pad * 2) / 100;
  let idx = 0;
  return pathD.replace(/-?\d+(\.\d+)?/g, (raw) => {
    const value = Number.parseFloat(raw);
    const isX = idx % 2 === 0;
    idx += 1;
    return String(isX ? pad + value * sx : pad + value * sy);
  });
}

function sampleSvgPath(pathD: string, samples: number, width: number, height: number): Point[] {
  const svgNS = "http://www.w3.org/2000/svg";
  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", scalePathToCanvas(pathD, width, height));
  const total = path.getTotalLength();
  const out: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    const p = path.getPointAtLength((i / samples) * total);
    out.push({ x: p.x, y: p.y });
  }
  return out;
}

function computeTraceScore(user: Point[], reference: Point[], threshold: number) {
  if (user.length === 0 || reference.length === 0) return 0;
  let covered = 0;
  for (const ref of reference) {
    let min = Infinity;
    for (const up of user) {
      const d = distance(ref, up);
      if (d < min) min = d;
    }
    if (min <= threshold) covered++;
  }
  let precise = 0;
  for (const up of user) {
    let min = Infinity;
    for (const ref of reference) {
      const d = distance(ref, up);
      if (d < min) min = d;
    }
    if (min <= threshold) precise++;
  }
  const coverage = (covered / reference.length) * 100;
  const precision = user.length > 0 ? (precise / user.length) * 100 : 0;
  return Math.max(0, Math.min(100, Math.round(coverage * 0.65 + precision * 0.35)));
}

const CANVAS_SIZE = 300;

export default function AlphabetLesson() {
  const { child, isLoading } = useChildAuth();
  const [, setLocation] = useLocation();

  const [curriculum, setCurriculum] = useState<AlphabetItem[]>([]);
  const [loadingCurriculum, setLoadingCurriculum] = useState(true);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<Step>("listen");
  const [traceScore, setTraceScore] = useState<number | null>(null);
  const [traceFeedback, setTraceFeedback] = useState<"" | "pass" | "fail">("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [traceAttempts, setTraceAttempts] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const userPointsRef = useRef<Point[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isLoading && !child) setLocation("/child-login");
  }, [child, isLoading, setLocation]);

  useEffect(() => {
    if (!child) return;
    fetch("/api/quran/alphabet/curriculum", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        const items = Array.isArray(data.items) ? data.items : FALLBACK_CURRICULUM;
        setCurriculum(items.length > 0 ? items : FALLBACK_CURRICULUM);
        setLoadingCurriculum(false);
      })
      .catch(() => {
        setCurriculum(FALLBACK_CURRICULUM);
        setLoadingCurriculum(false);
      });
  }, [child]);

  const current = curriculum[index];
  const letterColor = LETTER_COLORS[index % LETTER_COLORS.length];
  const qWord = current ? (QURAN_WORDS[current.arabic] || { word: current.arabic, meaning: current.nameSomali, emoji: "⭐" }) : null;
  const tracingPath = current?.tracingPath || `M50 15 C50 15 50 85 50 85`;

  const referencePoints = useMemo(() => {
    return sampleSvgPath(tracingPath, 300, CANVAS_SIZE, CANVAS_SIZE);
  }, [tracingPath]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * ratio;
    canvas.height = CANVAS_SIZE * ratio;
    canvas.style.width = `${CANVAS_SIZE}px`;
    canvas.style.height = `${CANVAS_SIZE}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const rows = 6, cols = 6;
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, (r / rows) * CANVAS_SIZE);
      ctx.lineTo(CANVAS_SIZE, (r / rows) * CANVAS_SIZE);
      ctx.stroke();
    }
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo((c / cols) * CANVAS_SIZE, 0);
      ctx.lineTo((c / cols) * CANVAS_SIZE, CANVAS_SIZE);
      ctx.stroke();
    }

    const scaledPath = scalePathToCanvas(tracingPath, CANVAS_SIZE, CANVAS_SIZE);
    const refPath = new Path2D(scaledPath);

    ctx.save();
    ctx.shadowColor = letterColor + "66";
    ctx.shadowBlur = 15;
    ctx.strokeStyle = letterColor + "40";
    ctx.lineWidth = 28;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(refPath);
    ctx.restore();

    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(refPath);
    ctx.setLineDash([]);

    const refs = referencePoints;
    if (refs.length > 0) {
      const start = refs[0];
      const end = refs[refs.length - 1];

      ctx.beginPath();
      ctx.arc(start.x, start.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = "#4ADE80";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("1", start.x, start.y);

      ctx.beginPath();
      ctx.arc(end.x, end.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#FF6B6B";
      ctx.fill();
    }

    userPointsRef.current = [];
  }, [tracingPath, referencePoints, letterColor]);

  useEffect(() => {
    if (!current) return;
    setStep("listen");
    setTraceScore(null);
    setTraceFeedback("");
    setTraceAttempts(0);
    setShowCelebration(false);
    setTimeout(() => autoPlayAudio(), 500);
  }, [current]);

  useEffect(() => {
    if (step === "trace") {
      setTimeout(() => drawCanvas(), 100);
    }
  }, [step, drawCanvas]);

  function speakLetter(item: AlphabetItem) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const sayText = (text: string, lang: string, rate = 0.75, pitch = 1.1) => {
      return new Promise<void>((resolve) => {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = lang;
        utter.rate = rate;
        utter.pitch = pitch;
        utter.onend = () => resolve();
        utter.onerror = () => resolve();
        window.speechSynthesis.speak(utter);
      });
    };

    setAudioPlaying(true);
    // Say Arabic letter name first, then the Somali name
    sayText(item.nameArabic, "ar-SA", 0.7, 1.0)
      .then(() => new Promise<void>(r => setTimeout(r, 400)))
      .then(() => sayText(item.nameSomali, "en-US", 0.8, 1.1))
      .finally(() => setAudioPlaying(false));
  }

  function autoPlayAudio() {
    if (!current) return;
    speakLetter(current);
  }

  function playAudio() {
    if (!current) return;
    window.speechSynthesis.cancel();
    speakLetter(current);
  }

  function getPoint(e: ReactPointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    return {
      x: (e.clientX - rect.left),
      y: (e.clientY - rect.top),
    };
  }

  function pointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    drawingRef.current = true;
    const p = getPoint(e);
    userPointsRef.current.push(p);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function pointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ratio = window.devicePixelRatio || 1;
    const points = userPointsRef.current;
    const prev = points[points.length - 1];
    const cur = getPoint(e);
    points.push(cur);

    let minDist = Infinity;
    for (const rp of referencePoints) {
      const d = distance(cur, rp);
      if (d < minDist) minDist = d;
    }

    ctx.save();
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.strokeStyle = minDist <= DISTANCE_THRESHOLD ? "#4ADE80" : "#FF6B6B";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = minDist <= DISTANCE_THRESHOLD ? "#4ADE80" : "#FF6B6B";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(cur.x, cur.y);
    ctx.stroke();
    ctx.restore();
  }

  function pointerUp() {
    drawingRef.current = false;
  }

  async function submitTracing() {
    if (!current) return;
    if (userPointsRef.current.length < 5) {
      return;
    }
    const score = computeTraceScore(userPointsRef.current, referencePoints, DISTANCE_THRESHOLD);
    setTraceScore(score);
    const pass = score >= TRACE_PASS_SCORE;
    setTraceFeedback(pass ? "pass" : "fail");
    setTraceAttempts((a) => a + 1);

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
        setStep("done");
      }
    } catch { /* non-blocking */ }
  }

  function goNext() {
    if (index < curriculum.length - 1) {
      setIndex((p) => p + 1);
    } else {
      setLocation("/child-dashboard");
    }
  }

  function goBack() {
    if (window.history.length > 1) window.history.back();
    else setLocation("/child-dashboard");
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
          onClick={() => setLocation("/child-dashboard")}>Dib u noqo</button>
      </div>
    );
  }

  const completedCount = curriculum.filter(l => l.completed).length;
  const progressPct = Math.round((completedCount / curriculum.length) * 100);

  return (
    <div className="min-h-screen bg-[#1a1a2e] relative overflow-hidden pb-10">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="absolute rounded-full bg-white animate-pulse pointer-events-none"
          style={{
            width: `${Math.random() * 3 + 1}px`,
            height: `${Math.random() * 3 + 1}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${Math.random() * 2 + 2}s`,
            opacity: Math.random() * 0.6 + 0.2,
          }}
        />
      ))}

      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="absolute text-4xl animate-bounce"
              style={{
                top: `${Math.random() * 70 + 5}%`,
                left: `${Math.random() * 80 + 10}%`,
                animationDelay: `${i * 0.15}s`,
                animationDuration: "0.8s",
              }}>
              {["⭐", "🌟", "✨", "🎉", "🎊"][i % 5]}
            </div>
          ))}
        </div>
      )}

      <div className="relative z-10 max-w-md mx-auto px-4 pt-5">
        <div className="flex items-center justify-between mb-5">
          <button onClick={goBack}
            className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold"
            data-testid="btn-back">
            ←
          </button>
          <div className="text-center">
            <h1 className="text-white font-black text-lg">Baro Alifka</h1>
            <p className="text-white/40 text-xs">{index + 1} / {curriculum.length}</p>
          </div>
          <button onClick={() => setLocation("/alphabet-games")}
            className="px-3 py-2 rounded-2xl bg-purple-500/30 border border-purple-400/40 text-purple-300 font-bold text-xs"
            data-testid="btn-games">
            🎮 Ciyaaro
          </button>
        </div>

        <div className="mb-4 rounded-full bg-white/10 h-2.5 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, backgroundColor: letterColor }} />
        </div>
        <p className="text-white/30 text-xs text-center mb-5">{completedCount} / {curriculum.length} xuruuf — {progressPct}%</p>

        <div className="rounded-3xl p-6 mb-5 text-center relative overflow-hidden border border-white/10"
          style={{ background: `linear-gradient(135deg, ${letterColor}15, ${letterColor}08)` }}>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[200px] font-black leading-none opacity-5 select-none"
              style={{ fontFamily: "serif", color: letterColor }}>
              {current.arabic}
            </span>
          </div>

          <div className="relative z-10">
            <button onClick={playAudio}
              className={`text-[120px] leading-none font-black drop-shadow-2xl mb-2 block mx-auto transition-transform active:scale-95 ${audioPlaying ? "animate-pulse" : ""}`}
              style={{ fontFamily: "serif", color: letterColor, textShadow: `0 0 40px ${letterColor}80` }}
              data-testid="btn-play-letter">
              {current.arabic}
            </button>

            <div className="flex items-center justify-center gap-3 mb-3">
              {audioPlaying && (
                <div className="flex gap-1 items-end h-5">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-1.5 rounded-full animate-bounce"
                      style={{ height: `${i * 6 + 4}px`, backgroundColor: letterColor, animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              )}
              <p className="text-3xl font-black text-white/90" style={{ fontFamily: "serif" }}>
                {current.nameArabic}
              </p>
            </div>

            <p className="text-white/60 font-bold text-base">{current.nameSomali}</p>

            {qWord && (
              <div className="mt-4 rounded-2xl px-4 py-3 border border-white/10"
                style={{ backgroundColor: letterColor + "15" }}>
                <p className="text-white/40 text-xs mb-1">Erayga Quraanka ah</p>
                <p className="text-2xl font-black mb-1" style={{ fontFamily: "serif", color: letterColor, direction: "rtl" }}>
                  {qWord.word} {qWord.emoji}
                </p>
                <p className="text-white/50 text-sm font-bold">{qWord.meaning}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-5">
          {(["listen", "trace", "done"] as Step[]).map((s, i) => (
            <div key={s} className="flex-1 h-1.5 rounded-full transition-all"
              style={{ backgroundColor: step === s ? letterColor : (["listen", "trace", "done"].indexOf(step) > i ? letterColor + "60" : "rgba(255,255,255,0.1)") }} />
          ))}
        </div>

        {step === "listen" && (
          <div className="space-y-3">
            <button onClick={playAudio}
              className="w-full rounded-3xl py-5 text-xl font-black flex items-center justify-center gap-3 active:scale-98 transition-transform border border-white/10"
              style={{ backgroundColor: letterColor + "25", color: "white" }}
              data-testid="btn-listen-again">
              <span className="text-3xl">🔊</span>
              Dhageyso Mar Kale
            </button>

            <button onClick={() => setStep("trace")}
              className="w-full rounded-3xl py-5 text-xl font-black flex items-center justify-center gap-3 active:scale-98 transition-transform"
              style={{ background: `linear-gradient(135deg, ${letterColor}, ${letterColor}cc)`, color: "#0f172a" }}
              data-testid="btn-go-trace">
              <span className="text-3xl">✏️</span>
              Hadda Qor!
            </button>
          </div>
        )}

        {step === "trace" && (
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
                  <canvas
                    ref={canvasRef}
                    className="touch-none block"
                    style={{ width: `${CANVAS_SIZE}px`, height: `${CANVAS_SIZE}px`, cursor: "crosshair" }}
                    onPointerDown={pointerDown}
                    onPointerMove={pointerMove}
                    onPointerUp={pointerUp}
                    onPointerCancel={pointerUp}
                    data-testid="trace-canvas"
                  />
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
                className="flex-1 rounded-2xl py-4 font-bold text-white/60 border border-white/15 bg-white/5 active:scale-95 transition-transform"
                data-testid="btn-clear">
                🧹 Nadiifi
              </button>
              <button onClick={submitTracing}
                className="flex-2 flex-grow rounded-2xl py-4 font-black text-slate-900 active:scale-95 transition-transform"
                style={{ background: `linear-gradient(135deg, ${letterColor}, ${letterColor}cc)`, minWidth: "60%" }}
                data-testid="btn-check-trace">
                ✅ Hubi
              </button>
            </div>

            {traceAttempts >= 3 && traceFeedback !== "pass" && (
              <button onClick={() => { setStep("done"); setShowCelebration(false); }}
                className="w-full mt-3 rounded-2xl py-3 font-bold text-white/40 border border-white/10 text-sm"
                data-testid="btn-skip">
                Xarafka xiga →
              </button>
            )}
          </div>
        )}

        {step === "done" && (
          <div className="text-center space-y-4">
            <div className="rounded-3xl p-8 border border-white/10"
              style={{ backgroundColor: letterColor + "15" }}>
              <div className="text-7xl mb-4">🌟</div>
              <h2 className="text-3xl font-black text-white mb-2">Aad u fiican!</h2>
              <p className="text-white/60 font-bold">
                <span style={{ color: letterColor }} className="text-2xl">{current.arabic}</span> — {current.nameSomali}
              </p>
              {traceScore && (
                <p className="text-white/40 text-sm mt-2">Natiijo: {traceScore}% ⭐</p>
              )}
            </div>

            <button onClick={goNext}
              className="w-full rounded-3xl py-5 text-xl font-black active:scale-98 transition-transform"
              style={{ background: `linear-gradient(135deg, ${letterColor}, ${letterColor}cc)`, color: "#0f172a" }}
              data-testid="btn-next-letter">
              {index < curriculum.length - 1 ? "Xarafka xiga →" : "🎉 Dhammaad!"}
            </button>

            <button onClick={() => setLocation("/alphabet-games")}
              className="w-full rounded-3xl py-4 text-lg font-bold border border-purple-400/30 text-purple-300"
              data-testid="btn-go-to-games">
              🎮 Tag Ciyaaraha
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const FALLBACK_CURRICULUM: AlphabetItem[] = [
  "ا","ب","ت","ث","ج","ح","خ","د","ذ","ر","ز","س","ش","ص","ض","ط","ظ","ع","غ","ف","ق","ك","ل","م","ن","ه","و","ي"
].map((arabic, i) => {
  const names: Record<string, [string, string]> = {
    "ا": ["أَلِف","Alif"], "ب": ["بَاء","Baa"], "ت": ["تَاء","Taa"], "ث": ["ثَاء","Thaa"],
    "ج": ["جِيم","Jiim"], "ح": ["حَاء","Haa"], "خ": ["خَاء","Khaa"], "د": ["دَال","Daal"],
    "ذ": ["ذَال","Dhaal"], "ر": ["رَاء","Raa"], "ز": ["زَاي","Zay"], "س": ["سِين","Siin"],
    "ش": ["شِين","Shiin"], "ص": ["صَاد","Saad"], "ض": ["ضَاد","Daad"], "ط": ["طَاء","Taa'"],
    "ظ": ["ظَاء","Dhaa'"], "ع": ["عَيْن","'Ayn"], "غ": ["غَيْن","Ghayn"], "ف": ["فَاء","Faa"],
    "ق": ["قَاف","Qaaf"], "ك": ["كَاف","Kaaf"], "ل": ["لَام","Laam"], "م": ["مِيم","Miim"],
    "ن": ["نُون","Nuun"], "ه": ["هَاء","Haa'"], "و": ["وَاو","Waaw"], "ي": ["يَاء","Yaa"],
  };
  const [nameArabic, nameSomali] = names[arabic] || [arabic, arabic];
  return {
    id: i + 1, arabic, nameArabic, nameSomali, phase: 1, order: i + 1,
    tracingPath: `M50 15 C50 15 50 85 50 85`,
  };
});
