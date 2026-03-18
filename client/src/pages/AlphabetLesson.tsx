import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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

const TRACE_PASS_SCORE = 60;
const DISTANCE_THRESHOLD = 18;
const AUDIO_SLUG_BY_ARABIC: Record<string, string> = {
  "ا": "alif",
  "ب": "ba",
  "ت": "ta",
  "ث": "tha",
  "ج": "jeem",
  "ح": "ha",
  "خ": "kha",
  "د": "dal",
  "ذ": "dhal",
  "ر": "ra",
  "ز": "zay",
  "س": "seen",
  "ش": "sheen",
  "ص": "sad",
  "ض": "dad",
  "ط": "taa",
  "ظ": "zaa",
  "ع": "ain",
  "غ": "ghain",
  "ف": "fa",
  "ق": "qaf",
  "ك": "kaf",
  "ل": "lam",
  "م": "meem",
  "ن": "noon",
  "ه": "ha2",
  "و": "waw",
  "ي": "ya",
};

function fallbackSpeak(text: string) {
  if (!("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ar-SA";
  utter.rate = 0.85;
  window.speechSynthesis.speak(utter);
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function sampleSvgPath(pathD: string, samples: number, width: number, height: number): Point[] {
  const svgNS = "http://www.w3.org/2000/svg";
  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", scalePathToCanvas(pathD, width, height));

  const total = path.getTotalLength();
  const out: Point[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const p = path.getPointAtLength((i / samples) * total);
    out.push({ x: p.x, y: p.y });
  }
  return out;
}

function scalePathToCanvas(pathD: string, width: number, height: number) {
  const pad = 36;
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

function computeTraceScore(user: Point[], reference: Point[], threshold: number) {
  if (user.length === 0 || reference.length === 0) return 0;

  let covered = 0;
  for (const ref of reference) {
    let min = Infinity;
    for (const up of user) {
      const d = distance(ref, up);
      if (d < min) min = d;
    }
    if (min <= threshold) covered += 1;
  }

  let precise = 0;
  for (const up of user) {
    let min = Infinity;
    for (const ref of reference) {
      const d = distance(ref, up);
      if (d < min) min = d;
    }
    if (min <= threshold) precise += 1;
  }

  const coverage = (covered / reference.length) * 100;
  const precision = (precise / user.length) * 100;
  return Math.max(0, Math.min(100, Math.round(coverage * 0.7 + precision * 0.3)));
}

export default function AlphabetLesson() {
  const { child, isLoading } = useChildAuth();
  const [, setLocation] = useLocation();

  const [curriculum, setCurriculum] = useState<AlphabetItem[]>([]);
  const [loadingCurriculum, setLoadingCurriculum] = useState(true);
  const [index, setIndex] = useState(0);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [recording, setRecording] = useState(false);
  const [repeatResult, setRepeatResult] = useState<string>("");
  const [traceScore, setTraceScore] = useState<number | null>(null);
  const [traceFeedback, setTraceFeedback] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const userPointsRef = useRef<Point[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const lessonAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isLoading && !child) setLocation("/child-login");
  }, [child, isLoading, setLocation]);

  useEffect(() => {
    if (!child) return;
    fetch("/api/quran/alphabet/curriculum", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        setCurriculum(Array.isArray(data.items) ? data.items : []);
        setLoadingCurriculum(false);
      })
      .catch(() => {
        setCurriculum([]);
        setLoadingCurriculum(false);
      });
  }, [child]);

  const current = curriculum[index];
  const currentAudio = current?.audioUrl || (current ? `/api/audio/alphabet/${resolveLetterSlug(current)}.mp3` : "");
  const tracingPath = current?.tracingPath || "M50 10 L50 90";

  const referencePoints = useMemo(() => {
    return sampleSvgPath(tracingPath, 280, 420, 420);
  }, [tracingPath]);

  useEffect(() => {
    if (!current) return;
    setStep(1);
    setRepeatResult("");
    setTraceScore(null);
    setTraceFeedback("");
    drawBaseCanvas();
  }, [current]);

  useEffect(() => {
    if (!curriculum.length) return;
    const hot = curriculum.slice(0, 6);
    hot.forEach((item) => {
      const audio = new Audio(item.audioUrl || `/api/audio/alphabet/${resolveLetterSlug(item)}.mp3`);
      audio.preload = "auto";
    });
  }, [curriculum]);

  useEffect(() => {
    const prime = () => {
      if (lessonAudioRef.current) return;
      const audio = new Audio();
      audio.preload = "auto";
      audio.muted = true;
      lessonAudioRef.current = audio;
      const maybePromise = audio.play();
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = false;
          })
          .catch(() => {
            audio.muted = false;
          });
      }
      window.removeEventListener("touchstart", prime);
      window.removeEventListener("pointerdown", prime);
    };

    window.addEventListener("touchstart", prime, { passive: true });
    window.addEventListener("pointerdown", prime, { passive: true });
    return () => {
      window.removeEventListener("touchstart", prime);
      window.removeEventListener("pointerdown", prime);
    };
  }, []);

  function resolveLetterSlug(item: AlphabetItem) {
    return AUDIO_SLUG_BY_ARABIC[item.arabic] || item.nameSomali.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  }

  function playPronunciation() {
    if (!current) return;
    const audio = lessonAudioRef.current || new Audio();
    lessonAudioRef.current = audio;
    audio.preload = "auto";
    audio.src = currentAudio;
    audio.onerror = () => fallbackSpeak(current.arabic);
    audio.load();
    audio.play().catch(() => fallbackSpeak(current.arabic));
  }

  function goBack(fallbackPath: string) {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    setLocation(fallbackPath);
  }

  async function startRepeat() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.start();
      setRecording(true);
      setRepeatResult("");
    } catch {
      setRepeatResult("❌ Mar kale isku day!");
    }
  }

  async function stopRepeat() {
    const rec = mediaRecorderRef.current;
    if (!rec || !current) return;

    const done = new Promise<void>((resolve) => {
      rec.onstop = () => {
        rec.stream.getTracks().forEach((t) => t.stop());
        resolve();
      };
    });
    rec.stop();
    setRecording(false);
    await done;

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const form = new FormData();
    form.append("audio", blob, "repeat.webm");
    form.append("letterId", String(current.id));

    let correct = false;
    try {
      const res = await fetch("/api/quran/alphabet/recitation/check", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await res.json();
      correct = !!data.correct;
    } catch {
      correct = blob.size > 12_000;
    }

    setRepeatResult(correct ? "✅ Aad u fiican!" : "❌ Mar kale isku day!");
    if (correct) setStep(3);
  }

  function drawBaseCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ratio = window.devicePixelRatio || 1;
    const width = 420;
    const height = 420;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 8;
    ctx.setLineDash([12, 8]);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const path = new Path2D(scalePathToCanvas(tracingPath, width, height));
    ctx.stroke(path);
    ctx.setLineDash([]);

    userPointsRef.current = [];
  }

  function getPoint(e: ReactPointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function pointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (step !== 3) return;
    drawingRef.current = true;
    const p = getPoint(e);
    userPointsRef.current.push(p);
  }

  function pointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || step !== 3) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const points = userPointsRef.current;
    const prev = points[points.length - 1];
    const cur = getPoint(e);
    points.push(cur);

    let minDist = Infinity;
    for (const rp of referencePoints) {
      const d = distance(cur, rp);
      if (d < minDist) minDist = d;
    }

    ctx.strokeStyle = minDist <= DISTANCE_THRESHOLD ? "#22c55e" : "#ef4444";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(cur.x, cur.y);
    ctx.stroke();
  }

  function pointerUp() {
    drawingRef.current = false;
  }

  async function submitTracing() {
    if (!current) return;
    const score = computeTraceScore(userPointsRef.current, referencePoints, DISTANCE_THRESHOLD);
    setTraceScore(score);

    const pass = score >= TRACE_PASS_SCORE;
    setTraceFeedback(pass ? "✅ Aad u fiican!" : "❌ Mar kale isku day!");

    try {
      await fetch("/api/quran/alphabet/tracing/score", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letterId: current.id,
          phase: current.phase,
          tracingScore: score,
        }),
      });

      if (pass) {
        await fetch("/api/quran/alphabet/complete", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            letterId: current.id,
            phase: current.phase,
            completed: true,
            tracingScore: score,
            recitationScore: 70,
          }),
        });
      }
    } catch {
      // avoid breaking child flow on network error
    }
  }

  function nextLetter() {
    if (index < curriculum.length - 1) {
      setIndex((prev) => prev + 1);
    }
  }

  if (isLoading || loadingCurriculum) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600 font-bold">Waa la soo rarayaa...</div>;
  }

  if (!current) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-xl font-black text-slate-800">Casharka xuruufta wali diyaar ma aha</p>
        <button className="px-5 py-3 rounded-xl bg-sky-600 text-white font-bold" onClick={() => setLocation("/child-dashboard")}>
          Dib u noqo
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-emerald-50 p-4 pb-24">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-sky-100 shadow-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => goBack("/child-dashboard")} className="px-4 py-2 rounded-xl bg-slate-700 text-white font-bold text-sm">
            Dib u noqo
          </button>
          <h2 className="text-2xl font-black text-slate-800">Baro Xuruufta Carabiga</h2>
          <button onClick={() => setLocation("/alphabet-games")} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm">
            Ciyaaro
          </button>
        </div>
        <p className="text-slate-500 font-semibold mb-5">Xaraf {index + 1} / {curriculum.length}</p>

        <div className="mb-5 rounded-2xl border-2 border-sky-200 bg-sky-50 p-6 text-center">
          <p className="text-7xl font-black leading-none text-slate-900">{current.arabic}</p>
          <p className="text-lg font-bold text-slate-700 mt-3">{current.nameSomali}</p>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <button onClick={playPronunciation} className="w-full rounded-2xl bg-amber-400 text-slate-900 font-black py-4 text-lg">Dhageyso ku dhawaaqista</button>
            <button onClick={() => setStep(2)} className="w-full rounded-2xl bg-emerald-600 text-white font-bold py-3">Xiga: Dhageyso oo ku celi</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {!recording ? (
              <button onClick={startRepeat} className="w-full rounded-2xl bg-blue-600 text-white font-black py-4 text-lg">Duub oo ku celi</button>
            ) : (
              <button onClick={stopRepeat} className="w-full rounded-2xl bg-red-600 text-white font-black py-4 text-lg">Jooji</button>
            )}
            {repeatResult && <p className="text-center text-xl font-black">{repeatResult}</p>}
            <button onClick={() => setStep(3)} className="w-full rounded-2xl bg-emerald-600 text-white font-bold py-3">U gudub qorista</button>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="text-slate-700 font-semibold mb-3">Raac xariiqda dhibcaha leh</p>
            <div className="overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
              <canvas
                ref={canvasRef}
                className="touch-none rounded-xl bg-white"
                onPointerDown={pointerDown}
                onPointerMove={pointerMove}
                onPointerUp={pointerUp}
                onPointerCancel={pointerUp}
              />
            </div>

            <div className="mt-3 flex gap-2">
              <button onClick={drawBaseCanvas} className="rounded-xl px-4 py-2 bg-slate-700 text-white font-bold">Nadiifi</button>
              <button onClick={submitTracing} className="rounded-xl px-4 py-2 bg-emerald-600 text-white font-bold">Hubi</button>
            </div>

            {traceScore !== null && (
              <p className="mt-3 text-lg font-black text-slate-800">Natiijo: {traceScore}% {traceFeedback}</p>
            )}

            {traceScore !== null && traceScore >= TRACE_PASS_SCORE && (
              <div className="mt-4 flex gap-2">
                <button onClick={nextLetter} className="rounded-xl px-5 py-3 bg-indigo-600 text-white font-bold">Xarafka xiga</button>
                <button onClick={() => setLocation("/alphabet-games")} className="rounded-xl px-5 py-3 bg-purple-600 text-white font-bold">Tag ciyaaraha</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
