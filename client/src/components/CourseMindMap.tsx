import { useMemo, useState } from "react";
import { CheckCircle, Circle, PlayCircle, FileText, HelpCircle, ClipboardList, Calendar, Lock, ChevronDown, ChevronUp, Map, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import MindMapOverlay from "./MindMapOverlay";

interface Lesson {
  id: string;
  title: string;
  moduleNumber?: number;
  order: number;
  lessonType?: string;
  isLive?: boolean;
}

interface LessonProgressItem {
  lessonId: string;
  completed: boolean;
}

interface CourseMindMapProps {
  lessons: Lesson[];
  lessonProgress: LessonProgressItem[];
  hasAccess: boolean;
  courseId: string;
}

const getLessonIcon = (lesson: Lesson) => {
  if (lesson.isLive) return Calendar;
  switch (lesson.lessonType) {
    case "text": return FileText;
    case "quiz": return HelpCircle;
    case "assignment": return ClipboardList;
    default: return PlayCircle;
  }
};

const getLessonTypeLabel = (lesson: Lesson) => {
  if (lesson.isLive) return "Toos";
  switch (lesson.lessonType) {
    case "text": return "Qoraal";
    case "quiz": return "Su'aalo";
    case "assignment": return "Hawlgal";
    default: return "Video";
  }
};

export default function CourseMindMap({ lessons, lessonProgress, hasAccess, courseId }: CourseMindMapProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showOverlay, setShowOverlay] = useState(false);

  const groupedLessons = useMemo(() => {
    const groups: Record<number, Lesson[]> = {};
    lessons.forEach((lesson) => {
      const moduleNum = lesson.moduleNumber || 1;
      if (!groups[moduleNum]) {
        groups[moduleNum] = [];
      }
      groups[moduleNum].push(lesson);
    });
    Object.keys(groups).forEach((key) => {
      groups[Number(key)].sort((a, b) => a.order - b.order);
    });
    return groups;
  }, [lessons]);

  const moduleNumbers = useMemo(() => {
    return Object.keys(groupedLessons).map(Number).sort((a, b) => a - b);
  }, [groupedLessons]);

  const progressStats = useMemo(() => {
    const completedIds = new Set(lessonProgress.filter(p => p.completed).map(p => p.lessonId));
    const completed = lessons.filter(l => completedIds.has(l.id)).length;
    const total = lessons.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  }, [lessons, lessonProgress]);

  const isLessonCompleted = (lessonId: string) => {
    return lessonProgress.some(p => p.lessonId === lessonId && p.completed);
  };

  if (lessons.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-4 border border-blue-100 shadow-sm">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
            <Map className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Khariidadda Koorsada</h3>
            <p className="text-sm text-gray-600">
              {progressStats.completed}/{progressStats.total} cashar ({progressStats.percentage}%)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressStats.percentage}%` }}
            />
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
            onClick={(e) => { e.stopPropagation(); setShowOverlay(true); }}
            title="Khariidad weyn"
            data-testid="button-open-mindmap-overlay"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="p-1">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {moduleNumbers.map((moduleNum, moduleIndex) => {
            const moduleLessons = groupedLessons[moduleNum];
            const moduleCompletedCount = moduleLessons.filter(l => isLessonCompleted(l.id)).length;
            const isModuleComplete = moduleCompletedCount === moduleLessons.length;

            return (
              <div key={moduleNum} className="relative">
                {/* Module Header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isModuleComplete 
                      ? "bg-green-500 text-white" 
                      : "bg-blue-100 text-blue-700"
                  }`}>
                    {moduleNum}
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    Qaybta {moduleNum}
                    <span className="text-xs text-gray-500 ml-2">
                      ({moduleCompletedCount}/{moduleLessons.length})
                    </span>
                  </span>
                </div>

                {/* Lessons in Module */}
                <div className="ml-4 relative">
                  {/* Vertical connecting line */}
                  <div className="absolute left-3 top-0 bottom-4 w-0.5 bg-gradient-to-b from-blue-200 to-purple-200" />

                  {moduleLessons.map((lesson, lessonIndex) => {
                    const completed = isLessonCompleted(lesson.id);
                    const Icon = getLessonIcon(lesson);
                    const isLast = lessonIndex === moduleLessons.length - 1;

                    return (
                      <div 
                        key={lesson.id}
                        className={`relative flex items-start gap-3 ${!isLast ? "pb-3" : ""}`}
                      >
                        {/* Node dot */}
                        <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center ${
                          completed 
                            ? "bg-green-500" 
                            : hasAccess 
                              ? "bg-white border-2 border-blue-300" 
                              : "bg-gray-200"
                        }`}>
                          {completed ? (
                            <CheckCircle className="w-4 h-4 text-white" />
                          ) : hasAccess ? (
                            <Circle className="w-3 h-3 text-blue-400" />
                          ) : (
                            <Lock className="w-3 h-3 text-gray-400" />
                          )}
                        </div>

                        {/* Lesson Card */}
                        {hasAccess ? (
                          <Link href={`/lesson/${lesson.id}`} className="flex-1">
                            <div className={`p-3 rounded-xl transition-all cursor-pointer ${
                              completed 
                                ? "bg-green-50 border border-green-200 hover:border-green-300" 
                                : "bg-white border border-gray-200 hover:border-blue-300 hover:shadow-sm"
                            }`}>
                              <div className="flex items-center gap-2">
                                <Icon className={`w-4 h-4 ${completed ? "text-green-600" : "text-blue-500"}`} />
                                <span className={`text-sm font-medium ${completed ? "text-green-700" : "text-gray-800"}`}>
                                  {lesson.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  completed 
                                    ? "bg-green-100 text-green-600" 
                                    : "bg-blue-50 text-blue-600"
                                }`}>
                                  {getLessonTypeLabel(lesson)}
                                </span>
                                {completed && (
                                  <span className="text-xs text-green-600">✓ Dhammaystay</span>
                                )}
                              </div>
                            </div>
                          </Link>
                        ) : (
                          <div className="flex-1 p-3 rounded-xl bg-gray-50 border border-gray-200 opacity-60">
                            <div className="flex items-center gap-2">
                              <Lock className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-500">{lesson.title}</span>
                            </div>
                            <span className="text-xs text-gray-400 mt-1 block">
                              {getLessonTypeLabel(lesson)} - Xidhan
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Connector to next module */}
                {moduleIndex < moduleNumbers.length - 1 && (
                  <div className="flex justify-center my-2">
                    <div className="w-0.5 h-4 bg-gradient-to-b from-purple-200 to-blue-200" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showOverlay && (
        <MindMapOverlay courseId={courseId} onClose={() => setShowOverlay(false)} hasAccess={hasAccess} />
      )}
    </div>
  );
}
