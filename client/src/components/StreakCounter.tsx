import { useQuery } from "@tanstack/react-query";
import { Flame, Trophy, Star, Medal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastStreakDate: string | null;
}

interface StreakCounterProps {
  size?: "sm" | "md" | "lg";
  showLongest?: boolean;
  className?: string;
}

export function StreakCounter({ size = "md", showLongest = false, className = "" }: StreakCounterProps) {
  const { t } = useTranslation();
  const { data: streak, isLoading } = useQuery<StreakData>({
    queryKey: ["parentStreak", "current"],
    queryFn: async () => {
      const res = await fetch("/api/parent/streak", { credentials: "include" });
      if (!res.ok) return { currentStreak: 0, longestStreak: 0, lastStreakDate: null };
      return res.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
        <div className="w-8 h-4 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!streak) {
    return null;
  }

  const sizeClasses = {
    sm: { icon: "w-4 h-4", text: "text-sm", container: "gap-1" },
    md: { icon: "w-5 h-5", text: "text-base font-semibold", container: "gap-1.5" },
    lg: { icon: "w-7 h-7", text: "text-xl font-bold", container: "gap-2" },
  };

  const { icon, text, container } = sizeClasses[size];
  const hasStreak = streak.currentStreak > 0;

  return (
    <div className={`flex flex-col ${className}`} data-testid="streak-counter">
      <div className={`flex items-center ${container}`}>
        <AnimatePresence>
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: hasStreak ? [1, 1.1, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            <Flame 
              className={`${icon} ${hasStreak ? "text-orange-500 fill-orange-500" : "text-gray-400"}`} 
            />
          </motion.div>
        </AnimatePresence>
        <span className={`${text} ${hasStreak ? "text-orange-600" : "text-gray-500"}`} data-testid="streak-count">
          {streak.currentStreak}
        </span>
        {size !== "sm" && (
          <span className="text-xs text-gray-500">
            {streak.currentStreak === 1 ? t("streak.day") : t("streak.days")}
          </span>
        )}
      </div>
      {showLongest && streak.longestStreak > 0 && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
          <span>{t("streak.longest")} {streak.longestStreak} {streak.longestStreak === 1 ? t("streak.day") : t("streak.days")}</span>
        </div>
      )}
    </div>
  );
}

export function StreakCard({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const { data: streak, isLoading } = useQuery<StreakData>({
    queryKey: ["parentStreak", "current"],
    queryFn: async () => {
      const res = await fetch("/api/parent/streak", { credentials: "include" });
      if (!res.ok) return { currentStreak: 0, longestStreak: 0, lastStreakDate: null };
      return res.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className={`bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 ${className}`}>
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-200 rounded-full" />
          <div className="flex-1">
            <div className="h-5 bg-orange-200 rounded w-24 mb-2" />
            <div className="h-3 bg-orange-100 rounded w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!streak) {
    return null;
  }

  const hasStreak = streak.currentStreak > 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 ${className}`}
      data-testid="streak-card"
    >
      <div className="flex items-center gap-4">
        <motion.div 
          className={`w-14 h-14 rounded-full flex items-center justify-center ${hasStreak ? "bg-gradient-to-br from-orange-400 to-amber-500" : "bg-gray-200"}`}
          animate={hasStreak ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Flame className={`w-7 h-7 ${hasStreak ? "text-white fill-white" : "text-gray-400"}`} />
        </motion.div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${hasStreak ? "text-orange-600" : "text-gray-500"}`}>
              {streak.currentStreak}
            </span>
            {hasStreak && <span className="text-sm text-gray-600">{t("streak.todayActive")} 🎉</span>}
          </div>
          {hasStreak ? (
            <div className="mt-1">
              <p className="text-sm font-semibold text-orange-700">{t("streak.successDay")}</p>
              <p className="text-xs text-gray-600 mt-0.5">
                {t("streak.keepGoing")}
              </p>
              <p className="text-xs text-gray-700 font-medium mt-1">{t("signature.name")}</p>
              <p className="text-[10px] text-gray-500 italic">
                {t("streak.wishSuccess")}
              </p>
            </div>
          ) : (
            <div className="mt-1">
              <p className="text-sm text-gray-600">{t("streak.noLearning")}</p>
              <p className="text-xs text-gray-700 font-medium mt-1">{t("signature.name")}</p>
              <p className="text-[10px] text-gray-500 italic">
                {t("streak.wishSuccess")}
              </p>
            </div>
          )}
          {streak.longestStreak > 0 && streak.longestStreak > streak.currentStreak && (
            <p className="text-xs text-gray-500 mt-1">
              {t("streak.record")} {streak.longestStreak} {t("streak.day")}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Points Card Component
interface PointsData {
  points: number;
}

export function PointsCard({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery<PointsData>({
    queryKey: ["/api/parent/points"],
    queryFn: async () => {
      const res = await fetch("/api/parent/points", { credentials: "include" });
      if (!res.ok) return { points: 0 };
      return res.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className={`bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 ${className}`}>
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-12 h-12 bg-yellow-200 rounded-full" />
          <div className="flex-1">
            <div className="h-5 bg-yellow-200 rounded w-20 mb-2" />
            <div className="h-3 bg-yellow-100 rounded w-28" />
          </div>
        </div>
      </div>
    );
  }

  const points = data?.points || 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 ${className}`}
      data-testid="points-card"
    >
      <div className="flex items-center gap-4">
        <motion.div 
          className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-400"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <Star className="w-7 h-7 text-white fill-white" />
        </motion.div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-yellow-600">
              {points.toLocaleString()}
            </span>
            <span className="text-sm text-gray-600">{t("points.title", "ayaad ilaa hadda haysataa")}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {t("points.earnMore", "Cashar kasta 10 dhibcood ayaad helaysaa ee Casharada")}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Leaderboard Card Component
interface LeaderboardEntry {
  id: string;
  name: string;
  picture: string | null;
  points: number;
}

export function LeaderboardCard({ className = "", limit = 5 }: { className?: string; limit?: number }) {
  const { t } = useTranslation();
  const { data: leaderboard, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard", limit],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard?limit=${limit}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl p-4 border border-gray-200 ${className}`}>
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full" />
              <div className="flex-1 h-4 bg-gray-200 rounded" />
              <div className="w-12 h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return null;
  }

  const getMedalColor = (position: number) => {
    if (position === 0) return "text-yellow-500";
    if (position === 1) return "text-gray-400";
    if (position === 2) return "text-amber-600";
    return "text-gray-300";
  };

  const getMedalIcon = (position: number) => {
    if (position < 3) {
      return <Medal className={`w-5 h-5 ${getMedalColor(position)}`} />;
    }
    return <span className="w-5 text-center text-sm text-gray-500">{position + 1}</span>;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl p-4 border border-gray-200 shadow-sm ${className}`}
      data-testid="leaderboard-card"
    >
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h3 className="font-semibold text-gray-800">{t("leaderboard.title", "Dadka Koorsooyinka ugu Xariifsan")}</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1 ml-7">{t("leaderboard.subtitle", "Dadka koorsooyinkeena ugu dhibcaha badan ee ugu sareeya, hoos ka eeg magacyadooda:")}</p>
      </div>
      <div className="space-y-2">
        {leaderboard.map((entry, index) => (
          <motion.div 
            key={entry.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center gap-3 p-2 rounded-lg ${index === 0 ? "bg-yellow-50" : index === 1 ? "bg-gray-50" : index === 2 ? "bg-amber-50" : ""}`}
            data-testid={`leaderboard-entry-${index}`}
          >
            <div className="w-6 flex justify-center">
              {getMedalIcon(index)}
            </div>
            <Avatar className="w-8 h-8">
              <AvatarImage src={entry.picture || undefined} alt={entry.name} />
              <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                {entry.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 text-sm font-medium text-gray-700 truncate">
              {entry.name}
            </span>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-semibold text-gray-700">{entry.points}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
