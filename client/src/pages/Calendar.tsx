import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Video,
  FileText,
  Clock,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParentAuth } from "@/contexts/ParentAuthContext";

interface Lesson {
  id: string;
  title: string;
  courseId: string;
  liveDate: string | null;
  liveUrl: string | null;
  lessonType: string | null;
  isLive: boolean;
}

interface Assignment {
  id: string;
  lessonId: string;
  title: string;
  description: string | null;
}

interface Course {
  id: string;
  title: string;
  courseId: string;
}

interface MeetEvent {
  id: string;
  title: string;
  description: string | null;
  meetLink: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  type: "live" | "assignment" | "meet";
  courseTitle: string;
  lessonId?: string;
  liveUrl?: string | null;
  startTime?: string;
  endTime?: string;
  description?: string | null;
};

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  const patterns = [
    /(\d{1,2})\.(\d{1,2})\.(\d{4})/,
    /(\d{4})-(\d{2})-(\d{2})/,
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
  ];
  
  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      if (pattern === patterns[1]) {
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      } else {
        return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
      }
    }
  }
  
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

export default function Calendar() {
  const { t } = useTranslation();
  const { parent } = useParentAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const months = t("calendar.months", { returnObjects: true }) as string[];
  const days = t("calendar.days", { returnObjects: true }) as string[];

  const { data: lessons = [] } = useQuery<Lesson[]>({
    queryKey: ["/api/lessons"],
  });

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const { data: enrollments = [] } = useQuery<any[]>({
    queryKey: ["/api/enrollments", parent?.id],
    enabled: !!parent,
  });

  const { data: meetEvents = [] } = useQuery<MeetEvent[]>({
    queryKey: ["/api/meet-events"],
    queryFn: async () => {
      const res = await fetch("/api/meet-events");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const enrolledCourseIds = useMemo(() => {
    if (!enrollments || !Array.isArray(enrollments)) return new Set<string>();
    return new Set(enrollments.map((e: any) => e.courseId));
  }, [enrollments]);

  const events = useMemo(() => {
    const result: CalendarEvent[] = [];
    const courseMap = new Map(courses.map(c => [c.id, c.title]));

    lessons.forEach(lesson => {
      if (lesson.liveDate && (lesson.isLive || lesson.lessonType === "live")) {
        const date = parseDate(lesson.liveDate);
        if (date) {
          result.push({
            id: `live-${lesson.id}`,
            title: lesson.title,
            date,
            type: "live",
            courseTitle: courseMap.get(lesson.courseId) || t("calendar.course"),
            lessonId: lesson.id,
            liveUrl: lesson.liveUrl,
          });
        }
      }
    });

    meetEvents.filter(e => e.isActive).forEach(event => {
      const date = parseDate(event.eventDate);
      if (date) {
        result.push({
          id: `meet-${event.id}`,
          title: event.title,
          date,
          type: "meet",
          courseTitle: "Google Meet",
          liveUrl: event.meetLink,
          startTime: event.startTime,
          endTime: event.endTime,
          description: event.description,
        });
      }
    });

    return result;
  }, [lessons, courses, meetEvents]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days: (number | null)[] = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getEventsForDate = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return events.filter(event => isSameDay(event.date, date));
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleDayClick = (day: number) => {
    setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
  };

  const calendarDays = generateCalendarDays();
  const today = new Date();
  const selectedEvents = selectedDate 
    ? events.filter(event => isSameDay(event.date, selectedDate))
    : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <button className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-6 h-6" />
            <h1 className="text-xl font-bold">{t("calendar.title")}</h1>
          </div>
        </div>
      </header>

      <div className="p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <button 
              onClick={goToPreviousMonth}
              className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900">
                {months[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button 
                onClick={goToToday}
                className="text-xs text-blue-600 font-medium hover:underline"
              >
                {t("calendar.today")}
              </button>
            </div>
            <button 
              onClick={goToNextMonth}
              className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-gray-100">
            {days.map(day => (
              <div key={day} className="p-2 text-center text-xs font-semibold text-gray-500">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="p-2 h-14" />;
              }

              const dayEvents = getEventsForDate(day);
              const isToday = 
                today.getDate() === day && 
                today.getMonth() === currentDate.getMonth() && 
                today.getFullYear() === currentDate.getFullYear();
              const isSelected = selectedDate && 
                selectedDate.getDate() === day && 
                selectedDate.getMonth() === currentDate.getMonth() &&
                selectedDate.getFullYear() === currentDate.getFullYear();

              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`p-1 h-14 flex flex-col items-center justify-start transition-colors relative ${
                    isSelected 
                      ? "bg-blue-100" 
                      : "hover:bg-gray-50"
                  }`}
                >
                  <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium ${
                    isToday 
                      ? "bg-blue-600 text-white" 
                      : isSelected
                        ? "text-blue-700"
                        : "text-gray-700"
                  }`}>
                    {day}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map((event, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            event.type === "meet" ? "bg-blue-500" : event.type === "live" ? "bg-red-500" : "bg-orange-500"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-4 mt-4 px-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-gray-600">{t("calendar.liveLessons")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-600">Kulanka Meet</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-xs text-gray-600">{t("calendar.tasks")}</span>
          </div>
        </div>

        {selectedDate && (
          <div className="mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3 px-1">
              {selectedDate.getDate()} {months[selectedDate.getMonth()]}
            </h3>
            
            {selectedEvents.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-gray-200">
                <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">{t("calendar.noEvents")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map(event => {
                  const borderColor = event.type === "meet" ? "border-l-blue-500" : event.type === "live" ? "border-l-red-500" : "border-l-orange-500";
                  const bgColor = event.type === "meet" ? "bg-blue-100" : event.type === "live" ? "bg-red-100" : "bg-orange-100";
                  const iconColor = event.type === "meet" ? "text-blue-600" : event.type === "live" ? "text-red-600" : "text-orange-600";

                  const formatTime12 = (t: string) => {
                    const [h, m] = t.split(":").map(Number);
                    const ampm = h >= 12 ? "PM" : "AM";
                    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
                  };

                  let canJoinMeet = false;
                  let isLiveMeet = false;
                  let meetDiffMs = 0;
                  let meetDiffHours = 0;
                  if (event.type === "meet" && event.startTime && event.endTime && selectedDate) {
                    const now = new Date();
                    const eventStart = new Date(`${event.date.toISOString().split("T")[0]}T${event.startTime}`);
                    const eventEnd = new Date(`${event.date.toISOString().split("T")[0]}T${event.endTime}`);
                    const diffMin = (eventStart.getTime() - now.getTime()) / 60000;
                    meetDiffMs = eventStart.getTime() - now.getTime();
                    meetDiffHours = meetDiffMs / 3600000;
                    isLiveMeet = now >= eventStart && now <= eventEnd;
                    canJoinMeet = diffMin <= 15 && now <= eventEnd;
                  }

                  return (
                    <div 
                      key={event.id}
                      className={`bg-white rounded-xl p-4 border-l-4 shadow-sm ${borderColor}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgColor}`}>
                          {event.type === "assignment" ? (
                            <FileText className={`w-5 h-5 ${iconColor}`} />
                          ) : (
                            <Video className={`w-5 h-5 ${iconColor}`} />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            {event.courseTitle}
                          </p>
                          <h4 className="font-semibold text-gray-900">{event.title}</h4>
                          {event.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{event.description}</p>
                          )}
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>
                              {event.type === "meet" && event.startTime && event.endTime
                                ? `${formatTime12(event.startTime)} - ${formatTime12(event.endTime)}`
                                : event.type === "live" ? t("calendar.liveSession") : t("calendar.task")}
                            </span>
                            {isLiveMeet && (
                              <span className="ml-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">LIVE</span>
                            )}
                            {!isLiveMeet && meetDiffHours <= 6 && meetDiffHours > 0 && (
                              <span className="ml-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
                                {Math.floor(meetDiffHours) > 0 ? `${Math.floor(meetDiffHours)}h ${Math.floor((meetDiffMs % 3600000) / 60000)}m` : `${Math.floor(meetDiffMs / 60000)} daq`}
                              </span>
                            )}
                          </div>
                        </div>
                        {event.type === "meet" && event.liveUrl && (
                          parent ? (
                            canJoinMeet ? (
                              <a 
                                href={event.liveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`px-3 py-1.5 text-white text-xs font-medium rounded-lg transition-colors ${isLiveMeet ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
                              >
                                {isLiveMeet ? "Ku Biir" : "Ku Biir"}
                              </a>
                            ) : (
                              <span className="px-3 py-1.5 bg-gray-100 text-gray-400 text-xs font-medium rounded-lg">
                                Wali ma furina
                              </span>
                            )
                          ) : (
                            <Link href="/register">
                              <span className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 cursor-pointer">
                                Isdiiwaangeli
                              </span>
                            </Link>
                          )
                        )}
                        {event.type === "live" && event.liveUrl && (
                          <a 
                            href={event.liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                          >
                            {t("calendar.join")}
                          </a>
                        )}
                        {event.type === "assignment" && event.lessonId && (
                          <Link href={`/lesson/${event.lessonId}`}>
                            <Button size="sm" variant="outline" className="text-xs">
                              {t("calendar.view")}
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!selectedDate && events.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3 px-1">
              {t("calendar.upcomingEvents")}
            </h3>
            <div className="space-y-3">
              {events
                .filter(event => event.date >= today)
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .slice(0, 5)
                .map(event => {
                  const borderColor = event.type === "meet" ? "border-l-blue-500" : event.type === "live" ? "border-l-red-500" : "border-l-orange-500";
                  const bgColor = event.type === "meet" ? "bg-blue-100" : event.type === "live" ? "bg-red-100" : "bg-orange-100";
                  const iconColor = event.type === "meet" ? "text-blue-600" : event.type === "live" ? "text-red-600" : "text-orange-600";
                  return (
                    <div 
                      key={event.id}
                      className={`bg-white rounded-xl p-4 border-l-4 shadow-sm ${borderColor}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgColor}`}>
                          {event.type === "assignment" ? (
                            <FileText className={`w-5 h-5 ${iconColor}`} />
                          ) : (
                            <Video className={`w-5 h-5 ${iconColor}`} />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            {event.date.getDate()} {months[event.date.getMonth()]} - {event.courseTitle}
                          </p>
                          <h4 className="font-semibold text-gray-900">{event.title}</h4>
                          {event.type === "meet" && event.startTime && event.endTime && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>{event.startTime} - {event.endTime}</span>
                            </div>
                          )}
                        </div>
                        {event.type === "live" && event.liveUrl && (
                          <a 
                            href={event.liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                          >
                            {t("calendar.join")}
                          </a>
                        )}
                        {event.type === "meet" && event.liveUrl && (() => {
                          const now2 = new Date();
                          const evStart = new Date(`${event.date.toISOString().split("T")[0]}T${event.startTime}`);
                          const evEnd = new Date(`${event.date.toISOString().split("T")[0]}T${event.endTime}`);
                          const dMin = (evStart.getTime() - now2.getTime()) / 60000;
                          const cJoin = dMin <= 15 && now2 <= evEnd;
                          if (!parent) {
                            return (
                              <Link href="/register">
                                <span className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg cursor-pointer">Isdiiwaangeli</span>
                              </Link>
                            );
                          }
                          return cJoin ? (
                            <a href={event.liveUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
                              Ku Biir
                            </a>
                          ) : (
                            <span className="px-3 py-1.5 bg-gray-100 text-gray-400 text-xs font-medium rounded-lg">Wali ma furina</span>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
