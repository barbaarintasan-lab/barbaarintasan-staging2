import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X, Trophy, Star, Award, Flame, BookOpen, GraduationCap, Sparkles, Zap, Crown } from "lucide-react";
import confetti from "canvas-confetti";

export type CelebrationType = 
  | "badge" 
  | "lesson_complete" 
  | "course_complete" 
  | "streak_milestone" 
  | "first_lesson"
  | "quiz_perfect"
  | "milestone_complete"
  | "level_up";

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: CelebrationType;
  title: string;
  description: string;
  subtitle?: string;
  imageUrl?: string;
  soundEnabled?: boolean;
}

const celebrationConfig: Record<CelebrationType, {
  gradient: string;
  icon: React.ReactNode;
  emojis: string[];
  confettiColors: string[];
}> = {
  badge: {
    gradient: "from-amber-400 via-orange-500 to-pink-500",
    icon: <Award className="w-12 h-12 text-white" />,
    emojis: ["🏆", "⭐", "🎖️", "💫", "✨"],
    confettiColors: ["#ffd700", "#ff6b35", "#ff1493", "#ffcc00"],
  },
  lesson_complete: {
    gradient: "from-green-400 via-emerald-500 to-teal-500",
    icon: <BookOpen className="w-12 h-12 text-white" />,
    emojis: ["📚", "✅", "🎯", "💪", "🌟"],
    confettiColors: ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0"],
  },
  course_complete: {
    gradient: "from-purple-500 via-violet-500 to-indigo-600",
    icon: <GraduationCap className="w-12 h-12 text-white" />,
    emojis: ["🎓", "🏆", "🎉", "💎", "👏"],
    confettiColors: ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ffd700"],
  },
  streak_milestone: {
    gradient: "from-orange-400 via-red-500 to-pink-500",
    icon: <Flame className="w-12 h-12 text-white" />,
    emojis: ["🔥", "💪", "⚡", "🚀", "🌟"],
    confettiColors: ["#f97316", "#ef4444", "#ec4899", "#fbbf24"],
  },
  first_lesson: {
    gradient: "from-blue-400 via-cyan-500 to-teal-400",
    icon: <Star className="w-12 h-12 text-white" />,
    emojis: ["🎉", "🌈", "✨", "🎊", "💫"],
    confettiColors: ["#3b82f6", "#06b6d4", "#14b8a6", "#fbbf24"],
  },
  quiz_perfect: {
    gradient: "from-yellow-400 via-amber-500 to-orange-500",
    icon: <Trophy className="w-12 h-12 text-white" />,
    emojis: ["💯", "🏆", "⭐", "🎯", "👑"],
    confettiColors: ["#fbbf24", "#f59e0b", "#d97706", "#fcd34d"],
  },
  milestone_complete: {
    gradient: "from-emerald-400 via-green-500 to-teal-500",
    icon: <Sparkles className="w-12 h-12 text-white" />,
    emojis: ["🌟", "✨", "🎉", "💪", "🥳"],
    confettiColors: ["#10b981", "#14b8a6", "#059669", "#6ee7b7"],
  },
  level_up: {
    gradient: "from-indigo-500 via-purple-600 to-pink-500",
    icon: <Crown className="w-12 h-12 text-white" />,
    emojis: ["👑", "🚀", "⚡", "💎", "🏅"],
    confettiColors: ["#8b5cf6", "#ec4899", "#6366f1", "#a855f7"],
  },
};

// Sound configurations for different celebration types
const soundConfigs: Record<CelebrationType, { notes: number[]; type: OscillatorType; tempo: number }> = {
  badge: { notes: [523.25, 659.25, 783.99, 1046.50], type: "sine", tempo: 0.12 },
  lesson_complete: { notes: [392, 523.25, 659.25], type: "sine", tempo: 0.15 },
  course_complete: { notes: [261.63, 329.63, 392, 523.25, 659.25, 783.99], type: "sine", tempo: 0.1 },
  streak_milestone: { notes: [440, 554.37, 659.25, 880], type: "triangle", tempo: 0.1 },
  first_lesson: { notes: [523.25, 659.25, 783.99], type: "sine", tempo: 0.15 },
  quiz_perfect: { notes: [392, 493.88, 587.33, 783.99, 987.77], type: "sine", tempo: 0.08 },
  milestone_complete: { notes: [440, 523.25, 659.25, 783.99], type: "sine", tempo: 0.12 },
  level_up: { notes: [261.63, 329.63, 392, 493.88, 587.33, 698.46, 783.99], type: "square", tempo: 0.06 },
};

// Generate celebration sound using Web Audio API
function playCelebrationSound(type: CelebrationType = "badge") {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const config = soundConfigs[type];
    
    config.notes.forEach((freq, i) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = config.type;
      
      const startTime = audioContext.currentTime + i * config.tempo;
      const duration = 0.25;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  } catch (e) {
    // Audio not supported
  }
}

export default function CelebrationModal({
  isOpen,
  onClose,
  type,
  title,
  description,
  subtitle,
  imageUrl,
  soundEnabled = true,
}: CelebrationModalProps) {
  const [animationPhase, setAnimationPhase] = useState(0);
  const config = celebrationConfig[type];

  useEffect(() => {
    if (isOpen) {
      setAnimationPhase(0);
      
      // Trigger confetti burst
      const duration = 3000;
      const end = Date.now() + duration;

      // Initial burst
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.6 },
        colors: config.confettiColors,
        shapes: ["circle", "square"],
      });

      // Side cannons
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: config.confettiColors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: config.confettiColors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // Play sound if enabled
      if (soundEnabled) {
        playCelebrationSound(type);
      }

      // Animation phases
      setTimeout(() => setAnimationPhase(1), 100);
      setTimeout(() => setAnimationPhase(2), 300);
      setTimeout(() => setAnimationPhase(3), 500);
    }
  }, [isOpen, config.confettiColors, soundEnabled, type]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-sm mx-auto p-0 overflow-hidden border-0 rounded-3xl shadow-2xl"
        data-testid="modal-celebration"
      >
        <div className={`bg-gradient-to-br ${config.gradient} p-6 text-center relative overflow-hidden`}>
          {/* Animated background sparkles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-white rounded-full opacity-60 animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random()}s`,
                }}
              />
            ))}
          </div>

          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-white hover:bg-white/50 transition-colors z-10"
            data-testid="button-close-celebration"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Main icon with pulse animation */}
          <div 
            className={`w-28 h-28 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl transition-all duration-500 ${
              animationPhase >= 1 ? "scale-100 opacity-100" : "scale-50 opacity-0"
            }`}
          >
            <div className={`w-24 h-24 bg-gradient-to-br ${config.gradient} rounded-full flex items-center justify-center animate-pulse`}>
              {imageUrl ? (
                <img src={imageUrl} alt={title} className="w-16 h-16 object-contain" />
              ) : (
                config.icon
              )}
            </div>
          </div>

          <DialogTitle 
            className={`text-2xl font-bold text-white mb-2 drop-shadow-lg transition-all duration-500 ${
              animationPhase >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            {title}
          </DialogTitle>

          {subtitle && (
            <p className={`text-white/90 text-sm mb-3 transition-all duration-500 ${
              animationPhase >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}>
              {subtitle}
            </p>
          )}

          {/* Animated emojis */}
          <div className={`flex justify-center gap-2 mb-3 transition-all duration-500 ${
            animationPhase >= 3 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}>
            {config.emojis.map((emoji, i) => (
              <span 
                key={i}
                className="text-3xl animate-bounce"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {emoji}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 text-center">
          <p className={`text-gray-700 text-lg leading-relaxed mb-4 transition-all duration-500 ${
            animationPhase >= 3 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}>
            {description}
          </p>

          <button
            onClick={onClose}
            className={`w-full bg-gradient-to-r ${config.gradient} text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg active:scale-95`}
            data-testid="button-continue-celebration"
          >
            Sii Wad 🚀
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for easy celebration triggering
export function useCelebration() {
  const [celebrationState, setCelebrationState] = useState<{
    isOpen: boolean;
    type: CelebrationType;
    title: string;
    description: string;
    subtitle?: string;
    imageUrl?: string;
  }>({
    isOpen: false,
    type: "badge",
    title: "",
    description: "",
  });

  const celebrate = (
    type: CelebrationType,
    title: string,
    description: string,
    options?: { subtitle?: string; imageUrl?: string }
  ) => {
    setCelebrationState({
      isOpen: true,
      type,
      title,
      description,
      subtitle: options?.subtitle,
      imageUrl: options?.imageUrl,
    });
  };

  const closeCelebration = () => {
    setCelebrationState(prev => ({ ...prev, isOpen: false }));
  };

  return {
    celebrationState,
    celebrate,
    closeCelebration,
  };
}
