import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import confetti from "canvas-confetti";

interface CourseCompleteCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  subtitle?: string;
}

export default function CourseCompleteCelebration({
  isOpen,
  onClose,
  title,
  description,
  subtitle,
}: CourseCompleteCelebrationProps) {
  const [, setLocation] = useLocation();
  const [showText, setShowText] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setShowText(false);
      setShowButton(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const allTimers: ReturnType<typeof setTimeout>[] = [];
    const addTimer = (fn: () => void, ms: number) => {
      const t = setTimeout(() => { if (mountedRef.current) fn(); }, ms);
      allTimers.push(t);
      return t;
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    startTimeRef.current = performance.now();

    const clouds: { x: number; y: number; w: number; h: number; speed: number; opacity: number }[] = [];
    for (let i = 0; i < 12; i++) {
      clouds.push({
        x: Math.random() * canvas.width * 1.5,
        y: 50 + Math.random() * (canvas.height * 0.5),
        w: 120 + Math.random() * 200,
        h: 40 + Math.random() * 60,
        speed: 0.3 + Math.random() * 0.8,
        opacity: 0.4 + Math.random() * 0.5,
      });
    }

    const stars: { x: number; y: number; size: number; twinkle: number }[] = [];
    for (let i = 0; i < 30; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.4,
        size: 1 + Math.random() * 2,
        twinkle: Math.random() * Math.PI * 2,
      });
    }

    const trailPoints: { x: number; y: number; age: number }[] = [];

    function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#0a4da0");
      grad.addColorStop(0.2, "#1a73e8");
      grad.addColorStop(0.5, "#4fc3f7");
      grad.addColorStop(0.8, "#81d4fa");
      grad.addColorStop(1, "#e1f5fe");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      stars.forEach((s) => {
        const alpha = 0.3 + 0.7 * Math.abs(Math.sin(s.twinkle + t * 2));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      });

      const sunX = w * 0.85;
      const sunY = h * 0.15;
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 80);
      sunGrad.addColorStop(0, "rgba(255, 253, 208, 0.9)");
      sunGrad.addColorStop(0.3, "rgba(255, 236, 139, 0.6)");
      sunGrad.addColorStop(0.7, "rgba(255, 200, 50, 0.2)");
      sunGrad.addColorStop(1, "rgba(255, 200, 50, 0)");
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff8c4";
      ctx.beginPath();
      ctx.arc(sunX, sunY, 25, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, opacity: number) {
      ctx.save();
      ctx.globalAlpha = opacity;
      const cloudGrad = ctx.createRadialGradient(x, y, 0, x, y, w * 0.5);
      cloudGrad.addColorStop(0, "#ffffff");
      cloudGrad.addColorStop(1, "rgba(220, 235, 255, 0.8)");
      ctx.fillStyle = cloudGrad;
      ctx.beginPath();
      ctx.ellipse(x, y, w * 0.5, h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(x - w * 0.25, y + h * 0.1, w * 0.35, h * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + w * 0.25, y + h * 0.05, w * 0.3, h * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + w * 0.1, y - h * 0.2, w * 0.25, h * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x - w * 0.15, y - h * 0.15, w * 0.2, h * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawAirplane(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, scale: number, t: number) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.scale(scale, scale);

      ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
      ctx.shadowBlur = 15;
      ctx.shadowOffsetY = 5;

      ctx.fillStyle = "#f0f0f0";
      ctx.beginPath();
      ctx.ellipse(0, 0, 42, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = "transparent";

      ctx.fillStyle = "#e8e8e8";
      ctx.beginPath();
      ctx.ellipse(0, 2, 40, 8, 0, 0, Math.PI);
      ctx.fill();

      ctx.fillStyle = "#dceeff";
      ctx.beginPath();
      ctx.moveTo(28, -4);
      ctx.lineTo(44, -2);
      ctx.lineTo(32, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#1565c0";
      ctx.beginPath();
      ctx.moveTo(-3, -9);
      ctx.lineTo(18, -26);
      ctx.lineTo(22, -9);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#1976d2";
      ctx.beginPath();
      ctx.moveTo(-3, 9);
      ctx.lineTo(18, 26);
      ctx.lineTo(22, 9);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#0d47a1";
      ctx.beginPath();
      ctx.moveTo(-32, -2);
      ctx.lineTo(-42, -20);
      ctx.lineTo(-22, -2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#1565c0";
      ctx.beginPath();
      ctx.moveTo(-36, 0);
      ctx.lineTo(-44, -14);
      ctx.lineTo(-40, 0);
      ctx.closePath();
      ctx.fill();

      for (let i = -18; i <= 12; i += 5) {
        ctx.fillStyle = "#90caf9";
        ctx.beginPath();
        ctx.arc(i, -4, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      const flicker = 0.5 + 0.5 * Math.sin(t * 20);
      const exhaustGrad = ctx.createRadialGradient(46, 0, 0, 46, 0, 8);
      exhaustGrad.addColorStop(0, `rgba(255, 100, 0, ${0.8 * flicker})`);
      exhaustGrad.addColorStop(0.5, `rgba(255, 200, 0, ${0.5 * flicker})`);
      exhaustGrad.addColorStop(1, "rgba(255, 100, 0, 0)");
      ctx.fillStyle = exhaustGrad;
      ctx.beginPath();
      ctx.ellipse(46, 0, 8 + flicker * 4, 4 + flicker * 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ff3d00";
      ctx.beginPath();
      ctx.arc(12, -26, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#00e676";
      ctx.beginPath();
      ctx.arc(12, 26, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function drawTrail(ctx: CanvasRenderingContext2D) {
      if (trailPoints.length < 2) return;
      for (let t = 0; t < 2; t++) {
        const offsetY = t === 0 ? -8 : 8;
        ctx.beginPath();
        for (let i = 0; i < trailPoints.length; i++) {
          const p = trailPoints[i];
          const alpha = Math.max(0, 1 - p.age / 150);
          if (alpha <= 0) continue;
          const px = p.x;
          const py = p.y + offsetY;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      for (let i = 0; i < trailPoints.length; i++) {
        const p = trailPoints[i];
        const alpha = Math.max(0, 1 - p.age / 150);
        const size = Math.max(0.5, 5 * (1 - p.age / 150));
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
        ctx.fill();
      }
    }

    function getAirplanePosition(t: number, w: number, h: number) {
      const totalDuration = 15;
      const progress = Math.min(t / totalDuration, 1);

      const cx = w * 0.5;
      const cy = h * 0.4;

      let x: number, y: number, angle: number;

      if (progress < 0.12) {
        const p = progress / 0.12;
        const eased = 1 - Math.pow(1 - p, 3);
        x = -60 + (w * 0.5 + 60) * eased;
        y = h * 0.75 - eased * h * 0.35;
        angle = -0.4;
      } else if (progress < 0.3) {
        const p = (progress - 0.12) / 0.18;
        const loopAngle = p * Math.PI * 2;
        const radius = Math.min(w, h) * 0.16;
        x = cx + Math.sin(loopAngle) * radius;
        y = cy - Math.cos(loopAngle) * radius + radius;
        angle = loopAngle + Math.PI * 0.5;
      } else if (progress < 0.42) {
        const p = (progress - 0.3) / 0.12;
        const startX = cx;
        const startY = cy;
        const endX = w * 0.78;
        const endY = h * 0.28;
        x = startX + (endX - startX) * p;
        y = startY + (endY - startY) * p + Math.sin(p * Math.PI * 4) * 25;
        angle = Math.atan2(endY - startY, endX - startX) + Math.cos(p * Math.PI * 4) * 0.3;
      } else if (progress < 0.6) {
        const p = (progress - 0.42) / 0.18;
        const loopAngle = p * Math.PI * 2;
        const radius = Math.min(w, h) * 0.13;
        const loopCx = w * 0.78;
        const loopCy = h * 0.28;
        x = loopCx + Math.sin(loopAngle) * radius * 1.3;
        y = loopCy - Math.cos(loopAngle) * radius + radius;
        angle = loopAngle + Math.PI * 0.5;
      } else if (progress < 0.72) {
        const p = (progress - 0.6) / 0.12;
        x = w * 0.78 - p * w * 0.56;
        y = h * 0.28 + Math.sin(p * Math.PI * 3) * 50;
        angle = Math.PI + Math.cos(p * Math.PI * 3) * 0.4;
      } else if (progress < 0.88) {
        const p = (progress - 0.72) / 0.16;
        const loopAngle = p * Math.PI * 2;
        const radius = Math.min(w, h) * 0.19;
        const loopCx = w * 0.22;
        const loopCy = h * 0.35;
        x = loopCx + Math.sin(loopAngle + Math.PI) * radius;
        y = loopCy - Math.cos(loopAngle + Math.PI) * radius + radius;
        angle = loopAngle + Math.PI * 1.5;
      } else {
        const p = (progress - 0.88) / 0.12;
        const eased = p * p;
        x = w * 0.22 + eased * (w * 0.33);
        y = h * 0.35 + eased * h * 0.1;
        angle = -0.1 + eased * 0.3;
      }

      return { x, y, angle };
    }

    addTimer(() => {
      for (let i = 0; i < 5; i++) {
        addTimer(() => {
          confetti({
            particleCount: 80,
            spread: 120,
            origin: { x: Math.random(), y: Math.random() * 0.5 },
            colors: ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ffd700", "#ff6b35", "#10b981"],
            shapes: ["circle", "square"],
          });
        }, i * 2500);
      }
    }, 500);

    addTimer(() => setShowText(true), 8000);
    addTimer(() => setShowButton(true), 11000);

    function playAirplaneSound() {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = audioCtx;
        const now = audioCtx.currentTime;

        const engineOsc = audioCtx.createOscillator();
        const engineGain = audioCtx.createGain();
        const engineFilter = audioCtx.createBiquadFilter();
        engineOsc.type = "sawtooth";
        engineOsc.frequency.setValueAtTime(60, now);
        engineOsc.frequency.linearRampToValueAtTime(100, now + 1);
        engineOsc.frequency.linearRampToValueAtTime(140, now + 3);
        engineOsc.frequency.linearRampToValueAtTime(120, now + 5);
        engineOsc.frequency.linearRampToValueAtTime(160, now + 7);
        engineOsc.frequency.linearRampToValueAtTime(100, now + 10);
        engineOsc.frequency.linearRampToValueAtTime(80, now + 13);
        engineOsc.frequency.linearRampToValueAtTime(60, now + 15);
        engineFilter.type = "lowpass";
        engineFilter.frequency.value = 400;
        engineFilter.Q.value = 2;
        engineGain.gain.setValueAtTime(0, now);
        engineGain.gain.linearRampToValueAtTime(0.06, now + 0.3);
        engineGain.gain.linearRampToValueAtTime(0.08, now + 3);
        engineGain.gain.linearRampToValueAtTime(0.05, now + 7);
        engineGain.gain.linearRampToValueAtTime(0.07, now + 10);
        engineGain.gain.linearRampToValueAtTime(0.03, now + 13);
        engineGain.gain.linearRampToValueAtTime(0, now + 15);
        engineOsc.connect(engineFilter);
        engineFilter.connect(engineGain);
        engineGain.connect(audioCtx.destination);
        engineOsc.start(now);
        engineOsc.stop(now + 15);

        const rumbleOsc = audioCtx.createOscillator();
        const rumbleGain = audioCtx.createGain();
        rumbleOsc.type = "triangle";
        rumbleOsc.frequency.setValueAtTime(30, now);
        rumbleOsc.frequency.linearRampToValueAtTime(50, now + 3);
        rumbleOsc.frequency.linearRampToValueAtTime(40, now + 8);
        rumbleOsc.frequency.linearRampToValueAtTime(25, now + 15);
        rumbleGain.gain.setValueAtTime(0, now);
        rumbleGain.gain.linearRampToValueAtTime(0.04, now + 0.5);
        rumbleGain.gain.linearRampToValueAtTime(0.03, now + 10);
        rumbleGain.gain.linearRampToValueAtTime(0, now + 15);
        rumbleOsc.connect(rumbleGain);
        rumbleGain.connect(audioCtx.destination);
        rumbleOsc.start(now);
        rumbleOsc.stop(now + 15);

        const whineOsc = audioCtx.createOscillator();
        const whineGain = audioCtx.createGain();
        whineOsc.type = "sine";
        whineOsc.frequency.setValueAtTime(800, now);
        whineOsc.frequency.linearRampToValueAtTime(1200, now + 2);
        whineOsc.frequency.linearRampToValueAtTime(1500, now + 4);
        whineOsc.frequency.linearRampToValueAtTime(1000, now + 7);
        whineOsc.frequency.linearRampToValueAtTime(1400, now + 10);
        whineOsc.frequency.linearRampToValueAtTime(800, now + 14);
        whineOsc.frequency.linearRampToValueAtTime(600, now + 15);
        whineGain.gain.setValueAtTime(0, now);
        whineGain.gain.linearRampToValueAtTime(0.015, now + 0.5);
        whineGain.gain.linearRampToValueAtTime(0.02, now + 4);
        whineGain.gain.linearRampToValueAtTime(0.01, now + 8);
        whineGain.gain.linearRampToValueAtTime(0.018, now + 11);
        whineGain.gain.linearRampToValueAtTime(0, now + 15);
        whineOsc.connect(whineGain);
        whineGain.connect(audioCtx.destination);
        whineOsc.start(now);
        whineOsc.stop(now + 15);

        const windNoise = audioCtx.createOscillator();
        const windGain = audioCtx.createGain();
        const windFilter = audioCtx.createBiquadFilter();
        windNoise.type = "sawtooth";
        windNoise.frequency.setValueAtTime(200, now);
        windNoise.frequency.linearRampToValueAtTime(350, now + 3);
        windNoise.frequency.linearRampToValueAtTime(250, now + 8);
        windNoise.frequency.linearRampToValueAtTime(150, now + 15);
        windFilter.type = "bandpass";
        windFilter.frequency.value = 300;
        windFilter.Q.value = 0.5;
        windGain.gain.setValueAtTime(0, now);
        windGain.gain.linearRampToValueAtTime(0.02, now + 1);
        windGain.gain.linearRampToValueAtTime(0.015, now + 10);
        windGain.gain.linearRampToValueAtTime(0, now + 15);
        windNoise.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(audioCtx.destination);
        windNoise.start(now);
        windNoise.stop(now + 15);

        const melody = [
          { freq: 523.25, time: 8.0 },
          { freq: 659.25, time: 8.4 },
          { freq: 783.99, time: 8.8 },
          { freq: 1046.50, time: 9.2 },
          { freq: 783.99, time: 9.8 },
          { freq: 659.25, time: 10.2 },
          { freq: 523.25, time: 10.6 },
          { freq: 659.25, time: 11.0 },
          { freq: 783.99, time: 11.4 },
          { freq: 1046.50, time: 11.8 },
          { freq: 1318.51, time: 12.3 },
          { freq: 1046.50, time: 12.8 },
        ];
        melody.forEach(({ freq, time }) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, now + time);
          gain.gain.linearRampToValueAtTime(0.1, now + time + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, now + time + 0.45);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + time);
          osc.stop(now + time + 0.5);
        });

        addTimer(() => {
          audioCtx.close().catch(() => {});
          audioCtxRef.current = null;
        }, 16000);
      } catch (e) {}
    }
    playAirplaneSound();

    function animate(now: number) {
      if (!mountedRef.current) return;
      const elapsed = (now - startTimeRef.current) / 1000;
      const w = canvas.width;
      const h = canvas.height;

      drawSky(ctx, w, h, elapsed);

      clouds.forEach((c) => {
        c.x -= c.speed;
        if (c.x + c.w < -100) {
          c.x = w + 100 + Math.random() * 200;
          c.y = 50 + Math.random() * (h * 0.5);
        }
        drawCloud(ctx, c.x, c.y, c.w, c.h, c.opacity);
      });

      if (elapsed <= 15) {
        const pos = getAirplanePosition(elapsed, w, h);

        trailPoints.push({ x: pos.x, y: pos.y, age: 0 });
        for (let i = trailPoints.length - 1; i >= 0; i--) {
          trailPoints[i].age++;
          if (trailPoints[i].age > 150) {
            trailPoints.splice(i, 1);
          }
        }
        drawTrail(ctx);

        const scale = Math.min(w / 700, 1.8);
        drawAirplane(ctx, pos.x, pos.y, pos.angle, scale, elapsed);
      } else {
        for (let i = trailPoints.length - 1; i >= 0; i--) {
          trailPoints[i].age += 3;
          if (trailPoints[i].age > 150) {
            trailPoints.splice(i, 1);
          }
        }
        if (trailPoints.length > 0) drawTrail(ctx);
      }

      if (elapsed < 18) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
    timersRef.current = allTimers;

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      allTimers.forEach(t => clearTimeout(t));
      window.removeEventListener("resize", resize);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999]"
      data-testid="modal-course-celebration"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 ${showText ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <div className="bg-black/40 backdrop-blur-md rounded-3xl p-6 mx-4 max-w-md text-center shadow-2xl border border-white/20">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl animate-pulse">
            <span className="text-4xl">🎓</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
            {title}
          </h2>

          {subtitle && (
            <p className="text-white/80 text-sm mb-3">{subtitle}</p>
          )}

          <div className="flex justify-center gap-2 mb-4">
            {["🎓", "🏆", "🎉", "💎", "👏"].map((emoji, i) => (
              <span
                key={i}
                className="text-2xl animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                {emoji}
              </span>
            ))}
          </div>

          <p className="text-white/90 text-base leading-relaxed mb-4 whitespace-pre-line">
            {description}
          </p>

          <button
            onClick={onClose}
            className={`w-full bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg active:scale-95 mb-3 ${showButton ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"} transition-all duration-700`}
            data-testid="button-close-course-celebration"
          >
            Sii Wad 🚀
          </button>

          <button
            onClick={() => {
              onClose();
              setLocation("/profile");
              setTimeout(() => {
                document.getElementById("certificates-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 500);
            }}
            className={`w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${showButton ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"} transition-all duration-700`}
            style={{ transitionDelay: "0.2s" }}
            data-testid="button-go-to-certificate"
          >
            📜 Shahaadada
          </button>
        </div>
      </div>
    </div>
  );
}