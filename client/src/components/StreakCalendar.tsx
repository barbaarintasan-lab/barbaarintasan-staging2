import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Flame, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ActivityDay {
  day: number;
  lessonsCompleted: number;
}

interface CalendarData {
  year: number;
  month: number;
  activityDays: ActivityDay[];
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastStreakDate: string | null;
}

const SOMALI_MONTHS = [
  "Janaayo", "Febraayo", "Maarso", "Abriil", "Maayo", "Juun",
  "Luuliyo", "Ogost", "Sebtembar", "Oktoobar", "Nofembar", "Diseembar"
];

const SOMALI_DAYS = ["Ax", "Is", "Ta", "Ar", "Kh", "Ji", "Sa"];

export function StreakCalendar({ className = "" }: { className?: string }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const { data: streakData } = useQuery<StreakData>({
    queryKey: ["parentStreak", "current"],
    queryFn: async () => {
      const res = await fetch("/api/parent/streak", { credentials: "include" });
      if (!res.ok) return { currentStreak: 0, longestStreak: 0, lastStreakDate: null };
      return res.json();
    },
    retry: false,
  });

  const { data: calendarData, isLoading } = useQuery<CalendarData>({
    queryKey: ["/api/parent/activity-calendar", currentYear, currentMonth],
    queryFn: async () => {
      const res = await fetch(`/api/parent/activity-calendar?year=${currentYear}&month=${currentMonth}`, { 
        credentials: "include" 
      });
      if (!res.ok) return { year: currentYear, month: currentMonth, activityDays: [] };
      return res.json();
    },
    retry: false,
  });

  const goToPrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const activityMap = new Map<number, number>();
  if (calendarData?.activityDays) {
    calendarData.activityDays.forEach(d => activityMap.set(d.day, d.lessonsCompleted));
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const todayDay = today.getDate();
  const isCurrentMonth = today.getMonth() + 1 === currentMonth && today.getFullYear() === currentYear;

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push({ day: 0, isEmpty: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ 
      day: d, 
      isEmpty: false, 
      lessonsCompleted: activityMap.get(d) || 0,
      isToday: isCurrentMonth && d === todayDay,
      isPast: isCurrentMonth ? d < todayDay : currentYear < today.getFullYear() || (currentYear === today.getFullYear() && currentMonth < today.getMonth() + 1),
      isFuture: isCurrentMonth ? d > todayDay : currentYear > today.getFullYear() || (currentYear === today.getFullYear() && currentMonth > today.getMonth() + 1)
    });
  }

  const activeDaysCount = calendarData?.activityDays?.length || 0;

  return (
    <Card className={cn("border-none shadow-lg bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-14 h-14 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-lg"
            >
              <Flame className="w-8 h-8 text-white" />
            </motion.div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                {streakData?.currentStreak || 0} <span className="text-base font-normal text-gray-600">maalmood</span>
              </CardTitle>
              <p className="text-sm text-orange-600 font-medium">
                Qaybahaaga 🔥
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Wakhtigii ugu badnaa Bishan</div>
            <div className="text-lg font-bold text-orange-600">{streakData?.longestStreak || 0}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={goToPrevMonth}
            className="hover:bg-orange-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-500" />
            <span className="font-bold text-gray-800">
              {SOMALI_MONTHS[currentMonth - 1]} {currentYear}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={goToNextMonth}
            className="hover:bg-orange-100"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {SOMALI_DAYS.map((day, i) => (
            <div key={i} className="text-center text-xs font-medium text-gray-500 py-1">
              {day}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentYear}-${currentMonth}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-7 gap-1"
          >
            {days.map((d, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.01 }}
                className={cn(
                  "aspect-square rounded-lg flex items-center justify-center text-sm font-medium relative",
                  d.isEmpty && "bg-transparent",
                  !d.isEmpty && (d.lessonsCompleted || 0) > 0 && "bg-gradient-to-br from-green-400 to-green-500 text-white shadow-sm",
                  !d.isEmpty && (d.lessonsCompleted || 0) === 0 && d.isPast && "bg-gray-100 text-gray-400",
                  !d.isEmpty && (d.lessonsCompleted || 0) === 0 && d.isFuture && "bg-gray-50 text-gray-300",
                  d.isToday && "ring-2 ring-orange-400 ring-offset-1"
                )}
              >
                {!d.isEmpty && (
                  <>
                    <span>{d.day}</span>
                    {(d.lessonsCompleted || 0) > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center"
                      >
                        <Flame className="w-2.5 h-2.5 text-white" />
                      </motion.div>
                    )}
                  </>
                )}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        <div className="mt-4 pt-4 border-t border-orange-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-green-400 to-green-500" />
              <span className="text-gray-600">Maalmaha aad bishan waxbaratay</span>
            </div>
            <span className="font-bold text-green-600">{activeDaysCount} maalmood</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
