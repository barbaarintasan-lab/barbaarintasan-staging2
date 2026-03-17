import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

interface CommunityAudioPlayerProps {
  audioUrl: string;
  title?: string;
  description?: string;
  authorName?: string;
}

export function CommunityAudioPlayer({ audioUrl, title, description, authorName }: CommunityAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const barsRef = useRef<number[]>([]);

  useEffect(() => {
    const bars: number[] = [];
    for (let i = 0; i < 50; i++) {
      bars.push(0.15 + Math.random() * 0.85);
    }
    barsRef.current = bars;
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const bars = barsRef.current;
    const barCount = bars.length;
    const gap = 2;
    const barWidth = (w - (barCount - 1) * gap) / barCount;
    const progressPos = progress * w;

    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + gap);
      let barH = bars[i] * h * 0.8;

      if (isPlaying) {
        const wave = Math.sin(Date.now() / 300 + i * 0.4) * 0.15;
        barH = barH * (1 + wave);
      }

      const minH = 3;
      barH = Math.max(barH, minH);
      const y = (h - barH) / 2;

      if (x + barWidth <= progressPos) {
        const gradient = ctx.createLinearGradient(x, y, x, y + barH);
        gradient.addColorStop(0, "#f97316");
        gradient.addColorStop(1, "#ef4444");
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = "rgba(156, 163, 175, 0.35)";
      }

      const radius = Math.min(barWidth / 2, 2);
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, barH, radius);
      } else {
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + barWidth - radius, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        ctx.lineTo(x + barWidth, y + barH - radius);
        ctx.quadraticCurveTo(x + barWidth, y + barH, x + barWidth - radius, y + barH);
        ctx.lineTo(x + radius, y + barH);
        ctx.quadraticCurveTo(x, y + barH, x, y + barH - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
      }
      ctx.fill();
    }

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(drawWaveform);
    }
  }, [progress, isPlaying]);

  useEffect(() => {
    drawWaveform();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [drawWaveform]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    };
    const onLoaded = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio || !duration) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    audio.currentTime = pct * duration;
    setProgress(pct);
  };

  return (
    <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 border border-orange-100/60 shadow-sm">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={togglePlay}
            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-lg transition-all active:scale-95 ${
              isPlaying 
                ? "bg-gradient-to-br from-red-500 to-orange-500" 
                : "bg-gradient-to-br from-orange-500 to-amber-500"
            }`}
            data-testid="button-community-audio-play"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white fill-white" />
            ) : (
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            {title && (
              <h4 className="font-bold text-gray-800 text-sm truncate">{title}</h4>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Volume2 className="w-3 h-3 text-orange-400" />
              {authorName && <span className="truncate">{authorName}</span>}
              {authorName && <span>·</span>}
              <span>{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{duration ? formatTime(duration) : "--:--"}</span>
            </div>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          className="w-full h-10 cursor-pointer"
          onClick={handleSeek}
          data-testid="canvas-community-audio-waveform"
        />

        {description && (
          <p className="text-xs text-gray-600 mt-2 leading-relaxed line-clamp-2">{description}</p>
        )}
      </div>
    </div>
  );
}