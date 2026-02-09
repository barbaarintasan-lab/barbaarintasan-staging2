import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Lock, Play, FileText, HelpCircle, ClipboardList, Video, Image, ChevronLeft, ZoomIn, ZoomOut, RotateCcw, X, Calendar } from "lucide-react";
import { useLocation } from "wouter";

interface Lesson {
  id: string;
  title: string;
  lessonType: string;
  moduleId?: string;
  order: number;
  isLive?: boolean;
}

interface Module {
  id: string;
  name: string;
  order: number;
}

interface Course {
  id: string;
  title: string;
  imageUrl?: string;
  description?: string;
}

interface LessonProgress {
  lessonId: string;
  completed: boolean;
}

interface MindMapOverlayProps {
  courseId: string;
  onClose: () => void;
  hasAccess?: boolean;
}

const lessonTypeIcons: Record<string, any> = {
  video: Video,
  qoraal: FileText,
  text: FileText,
  suaalo: HelpCircle,
  quiz: HelpCircle,
  hawlgal: ClipboardList,
  assignment: ClipboardList,
  live: Calendar,
  sawirro: Image,
};

const lessonTypeColors: Record<string, string> = {
  video: "#3B82F6",
  qoraal: "#10B981",
  text: "#10B981",
  suaalo: "#F59E0B",
  quiz: "#F59E0B",
  hawlgal: "#8B5CF6",
  assignment: "#8B5CF6",
  live: "#EF4444",
  sawirro: "#EC4899",
};

const lessonTypeLabels: Record<string, string> = {
  video: "Video",
  qoraal: "Qoraal",
  text: "Qoraal",
  suaalo: "Su'aalo",
  quiz: "Su'aalo",
  hawlgal: "Hawlgal",
  assignment: "Hawlgal",
  live: "Toos",
  sawirro: "Sawirro",
};

export default function MindMapOverlay({ courseId, onClose, hasAccess = true }: MindMapOverlayProps) {
  const [, navigate] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredLesson, setHoveredLesson] = useState<Lesson | null>(null);

  const handleLessonClick = (lessonId: string) => {
    if (hasAccess) {
      onClose();
      navigate(`/lesson/${lessonId}`);
    }
  };

  const { data: course } = useQuery<Course>({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}`);
      if (!res.ok) throw new Error("Failed to fetch course");
      return res.json();
    },
  });

  const { data: modules = [] } = useQuery<Module[]>({
    queryKey: ["modules", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/modules`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: lessons = [] } = useQuery<Lesson[]>({
    queryKey: ["lessons", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/lessons?courseId=${courseId}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: progressData } = useQuery<{ completedLessons: LessonProgress[]; totalLessons: number; completedCount: number }>({
    queryKey: ["courseProgress", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/parent/course/${courseId}/progress`, { credentials: "include" });
      if (!res.ok) return { completedLessons: [], totalLessons: 0, completedCount: 0 };
      return res.json();
    },
  });

  const completedLessonIds = new Set(
    progressData?.completedLessons?.filter((p) => p.completed).map((p) => p.lessonId) || []
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 2.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const sortedModules = [...modules].sort((a, b) => a.order - b.order);
  const lessonsWithoutModule = lessons.filter((l) => !l.moduleId).sort((a, b) => a.order - b.order);

  const allBranches = [
    ...sortedModules.map((m) => ({
      type: "module" as const,
      id: m.id,
      name: m.name,
      lessons: lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.order - b.order),
    })),
    ...(lessonsWithoutModule.length > 0
      ? [{ type: "ungrouped" as const, id: "ungrouped", name: "Casharada Kale", lessons: lessonsWithoutModule }]
      : []),
  ];

  const totalBranches = allBranches.length || 1;

  const viewBoxWidth = 900;
  const viewBoxHeight = 700;
  const centerX = viewBoxWidth / 2;
  const centerY = viewBoxHeight / 2;
  
  // Total available extent from center (with padding for nodes at edges)
  const maxExtent = Math.min(viewBoxWidth, viewBoxHeight) / 2 - 30;
  const nodeRadius = 14; // Node size
  const minNodeSpacing = nodeRadius * 2.2; // Minimum center-to-center spacing (~31px)
  
  // Layout proportions - smaller module hub to allow more lesson space
  const moduleRadius = 120; // Module hub distance from center
  const maxLessonExtent = maxExtent - moduleRadius - nodeRadius; // Max distance lessons can extend (~170px)
  
  // Max angle spread for lesson distribution (full half circle)
  const maxAngleSpread = Math.PI;

  const angleStep = (2 * Math.PI) / totalBranches;

  const progressPercentage = progressData?.totalLessons 
    ? Math.round((progressData.completedCount / progressData.totalLessons) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black/30 backdrop-blur-sm border-b border-white/10">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/10"
          data-testid="button-close-mindmap"
        >
          <X className="w-5 h-5" />
          <span className="hidden sm:inline">Xidh</span>
        </button>
        
        <div className="text-center">
          <h1 className="text-white font-bold text-lg">{course?.title || "Khariidadda Koorsada"}</h1>
          <p className="text-white/60 text-sm">
            {progressData?.completedCount || 0} / {progressData?.totalLessons || lessons.length} cashar • {progressPercentage}%
          </p>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={handleZoomOut} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20" data-testid="button-zoom-out">
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-white/60 text-sm min-w-[40px] text-center hidden sm:block">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20" data-testid="button-zoom-in">
            <ZoomIn className="w-5 h-5" />
          </button>
          <button onClick={handleReset} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20" data-testid="button-reset-view">
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-black/20 px-4 py-2 flex flex-wrap gap-3 justify-center border-b border-white/5">
          {Object.entries(lessonTypeColors).slice(0, 6).map(([type, color]) => {
            const Icon = lessonTypeIcons[type];
            if (!Icon || !lessonTypeLabels[type]) return null;
            return (
              <div key={type} className="flex items-center gap-1.5 text-white/70 text-xs">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: color }}>
                  <Icon className="w-3 h-3 text-white" />
                </div>
                <span>{lessonTypeLabels[type]}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-1.5 text-white/70 text-xs border-l border-white/20 pl-3">
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
            <span>Dhameystay</span>
          </div>
        </div>

        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setIsDragging(false)}
        >
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
            style={{ 
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transformOrigin: 'center center'
            }}
            className="touch-none"
          >
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="courseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22C55E" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>

            {allBranches.map((branch, branchIndex) => {
              const angle = branchIndex * angleStep - Math.PI / 2;
              const branchX = centerX + Math.cos(angle) * moduleRadius;
              const branchY = centerY + Math.sin(angle) * moduleRadius;

              const branchLessons = branch.lessons;
              const completedInBranch = branchLessons.filter(l => completedLessonIds.has(l.id)).length;
              const branchProgress = branchLessons.length > 0 ? completedInBranch / branchLessons.length : 0;
              
              // Calculate ring layout for this branch
              const lessonCount = branchLessons.length;
              
              // Ring layout: calculate how many can fit in each ring without overlap
              // First ring must clear the module hub (radius 42 + lesson node radius 14 + buffer 10 = 66)
              const firstRingRadius = 65;
              const ringGap = 32; // Space between rings
              const capacityAtRadius = (r: number) => Math.max(1, Math.floor((r * maxAngleSpread) / minNodeSpacing) + 1);
              
              // Build rings until all lessons are placed
              const rings: { radius: number; startIdx: number; count: number }[] = [];
              let placed = 0;
              let currentRadius = firstRingRadius;
              
              // Allow rings up to maxLessonExtent
              while (placed < lessonCount && currentRadius <= maxLessonExtent + ringGap) {
                const clampedRadius = Math.min(currentRadius, maxLessonExtent);
                const capacity = capacityAtRadius(clampedRadius);
                const toPlace = Math.min(capacity, lessonCount - placed);
                rings.push({ radius: clampedRadius, startIdx: placed, count: toPlace });
                placed += toPlace;
                currentRadius += ringGap;
              }
              
              // If we still have lessons and no rings, create a fallback ring
              if (rings.length === 0) {
                rings.push({ radius: firstRingRadius, startIdx: 0, count: lessonCount });
              }
              
              // Get ring info for a lesson index
              const getLessonRing = (idx: number) => {
                for (const ring of rings) {
                  if (idx >= ring.startIdx && idx < ring.startIdx + ring.count) {
                    return { 
                      radius: ring.radius, 
                      indexInRing: idx - ring.startIdx, 
                      totalInRing: ring.count 
                    };
                  }
                }
                return { radius: firstRingRadius, indexInRing: 0, totalInRing: 1 };
              };

              return (
                <g key={branch.id}>
                  <line
                    x1={centerX}
                    y1={centerY}
                    x2={branchX}
                    y2={branchY}
                    stroke={branchProgress === 1 ? "#22C55E" : "rgba(255,255,255,0.2)"}
                    strokeWidth="3"
                    strokeDasharray={branchProgress === 1 ? "none" : "8,4"}
                  />

                  <circle 
                    cx={branchX} 
                    cy={branchY} 
                    r="42" 
                    fill={branchProgress === 1 ? "#22C55E" : "rgba(99, 102, 241, 0.9)"} 
                    filter="url(#glow)" 
                  />
                  <circle
                    cx={branchX}
                    cy={branchY}
                    r="38"
                    fill="none"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="2"
                    strokeDasharray={`${branchProgress * 239} 239`}
                    transform={`rotate(-90 ${branchX} ${branchY})`}
                  />
                  <text
                    x={branchX}
                    y={branchY - 5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="11"
                    fontWeight="bold"
                    className="pointer-events-none select-none"
                  >
                    {branch.name.length > 10 ? branch.name.slice(0, 10) + "…" : branch.name}
                  </text>
                  <text
                    x={branchX}
                    y={branchY + 12}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="rgba(255,255,255,0.8)"
                    fontSize="10"
                    className="pointer-events-none select-none"
                  >
                    {completedInBranch}/{branchLessons.length}
                  </text>

                  {branchLessons.map((lesson, lessonIndex) => {
                    // Get ring info for this lesson
                    const { radius: ringRadius, indexInRing, totalInRing } = getLessonRing(lessonIndex);
                    
                    // Calculate angle for this lesson in its ring
                    const ringAngleSpread = totalInRing > 1 
                      ? Math.min(maxAngleSpread, (totalInRing - 1) * minNodeSpacing / ringRadius)
                      : 0;
                    const ringStartAngle = angle - ringAngleSpread / 2;
                    const ringAngleStep = totalInRing > 1 ? ringAngleSpread / (totalInRing - 1) : 0;
                    
                    const lessonAngle = totalInRing === 1 ? angle : ringStartAngle + indexInRing * ringAngleStep;
                    const lessonX = branchX + Math.cos(lessonAngle) * ringRadius;
                    const lessonY = branchY + Math.sin(lessonAngle) * ringRadius;

                    const isCompleted = completedLessonIds.has(lesson.id);
                    const lessonType = lesson.isLive ? "live" : (lesson.lessonType || "video");
                    const typeColor = lessonTypeColors[lessonType] || "#6B7280";
                    const Icon = lessonTypeIcons[lessonType] || Video;
                    const isLocked = !hasAccess;

                    return (
                      <g 
                        key={lesson.id} 
                        className={hasAccess ? "cursor-pointer" : "cursor-not-allowed"} 
                        data-testid={`mindmap-lesson-${lesson.id}`}
                        onMouseEnter={() => setHoveredLesson(lesson)}
                        onMouseLeave={() => setHoveredLesson(null)}
                        onClick={() => handleLessonClick(lesson.id)}
                      >
                        <line
                          x1={branchX}
                          y1={branchY}
                          x2={lessonX}
                          y2={lessonY}
                          stroke={isCompleted ? "#22C55E" : "rgba(255,255,255,0.15)"}
                          strokeWidth="2"
                        />
                        <circle
                          cx={lessonX}
                          cy={lessonY}
                          r={nodeRadius}
                          fill={isLocked ? "#6B7280" : (isCompleted ? "#22C55E" : typeColor)}
                          opacity={hoveredLesson?.id === lesson.id ? 1 : 0.85}
                          filter="url(#glow)"
                          className="transition-opacity duration-200"
                        />
                        {hoveredLesson?.id === lesson.id && (
                          <circle
                            cx={lessonX}
                            cy={lessonY}
                            r={nodeRadius + 4}
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            opacity="0.5"
                          />
                        )}
                        <foreignObject x={lessonX - 10} y={lessonY - 10} width="20" height="20">
                          <div className="w-5 h-5 flex items-center justify-center">
                            {isLocked ? (
                              <Lock className="w-4 h-4 text-white" />
                            ) : isCompleted ? (
                              <Check className="w-4 h-4 text-white" />
                            ) : (
                              <Icon className="w-4 h-4 text-white" />
                            )}
                          </div>
                        </foreignObject>
                      </g>
                    );
                  })}
                </g>
              );
            })}

            <circle cx={centerX} cy={centerY} r="65" fill="url(#courseGradient)" filter="url(#glow)" />
            <circle
              cx={centerX}
              cy={centerY}
              r="60"
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="4"
              strokeDasharray={`${(progressPercentage / 100) * 377} 377`}
              transform={`rotate(-90 ${centerX} ${centerY})`}
              strokeLinecap="round"
            />
            
            {course?.imageUrl ? (
              <>
                <clipPath id="courseImageClip">
                  <circle cx={centerX} cy={centerY} r="50" />
                </clipPath>
                <image
                  href={course.imageUrl}
                  x={centerX - 50}
                  y={centerY - 50}
                  width="100"
                  height="100"
                  clipPath="url(#courseImageClip)"
                  preserveAspectRatio="xMidYMid slice"
                />
              </>
            ) : (
              <text
                x={centerX}
                y={centerY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="28"
                fontWeight="bold"
              >
                📚
              </text>
            )}
          </svg>

          {hoveredLesson && (
            <div 
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-xl px-4 py-3 text-white max-w-xs text-center border border-white/10"
              style={{ pointerEvents: 'none' }}
            >
              <p className="font-semibold text-sm">{hoveredLesson.title}</p>
              <p className="text-xs text-white/60 mt-1">
                {lessonTypeLabels[hoveredLesson.isLive ? "live" : (hoveredLesson.lessonType || "video")]}
                {completedLessonIds.has(hoveredLesson.id) && " • ✓ Dhameystay"}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 bg-black/30 border-t border-white/10 text-center">
        <p className="text-white/50 text-xs">
          Jiid si aad u socoto • Guji cashar si aad u daawato
        </p>
      </div>
    </div>
  );
}
