import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Play, FileText, Lock, Volume2, LogIn, CheckCircle, Video, Calendar, ExternalLink, ClipboardList, Send, Loader2, Award, X, HelpCircle, Bookmark, BookmarkCheck, Download, Wifi, WifiOff, Headphones } from "lucide-react";
import { toast } from "sonner";
import { Link, useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import confetti from "canvas-confetti";
import { useTranslation } from "react-i18next";
import CelebrationModal, { CelebrationType } from "@/components/CelebrationModal";
import CourseCompleteCelebration from "@/components/CourseCompleteCelebration";
import { ExerciseRenderer } from "@/components/exercises/ExerciseRenderer";
import { useOffline } from "@/contexts/OfflineContext";
import LessonDiscussionGroup from "@/components/LessonDiscussionGroup";
import { useOfflineDownloads } from "@/hooks/useOfflineDownloads";
import { getOfflineLesson } from "@/lib/offlineStorage";

function getYouTubeId(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  return match ? match[1] : "";
}

function getVimeoId(url: string): string {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : "";
}

function getGoogleDriveId(url: string): string {
  // Handle formats like:
  // https://drive.google.com/file/d/FILE_ID/view
  // https://drive.google.com/open?id=FILE_ID
  const fileMatch = url.match(/\/file\/d\/([^\/\?]+)/);
  if (fileMatch) return fileMatch[1];
  
  const openMatch = url.match(/[?&]id=([^&]+)/);
  if (openMatch) return openMatch[1];
  
  return "";
}

function isGoogleDriveUrl(url: string): boolean {
  return url.includes("drive.google.com");
}

// Somali day and month names
const SOMALI_DAYS: Record<string, string> = {
  'Sunday': 'Axad',
  'Monday': 'Isniin',
  'Tuesday': 'Talaado',
  'Wednesday': 'Arbaco',
  'Thursday': 'Khamiis',
  'Friday': 'Jimce',
  'Saturday': 'Sabti'
};

const SOMALI_MONTHS: Record<string, string> = {
  'January': 'Janaayo',
  'February': 'Febraayo',
  'March': 'Maarso',
  'April': 'Abriil',
  'May': 'Maajo',
  'June': 'Juun',
  'July': 'Luuliyo',
  'August': 'Ogosto',
  'September': 'Sebteembar',
  'October': 'Oktoobar',
  'November': 'Nofeembar',
  'December': 'Diseembar'
};

function formatSomaliDate(dateStr: string): string {
  try {
    // Parse date from different formats
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const somaliDay = SOMALI_DAYS[dayName] || dayName;
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${somaliDay} ${day}.${month}.${year} Saacadda ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}

function getTimezoneLabel(timezone: string): string {
  const labels: { [key: string]: string } = {
    "Africa/Mogadishu": "🇸🇴 Soomaaliya",
    "Africa/Nairobi": "🇰🇪 Kenya",
    "Africa/Addis_Ababa": "🇪🇹 Ethiopia",
    "Asia/Dubai": "🇦🇪 Dubai",
    "Asia/Riyadh": "🇸🇦 Saudi",
    "Europe/London": "🇬🇧 London",
    "Europe/Stockholm": "🇸🇪 Sweden",
    "Europe/Amsterdam": "🇳🇱 Netherlands",
    "America/New_York": "🇺🇸 New York",
    "America/Los_Angeles": "🇺🇸 LA",
    "America/Toronto": "🇨🇦 Toronto",
    "Australia/Melbourne": "🇦🇺 Melbourne",
  };
  return labels[timezone] || timezone;
}

function generateGoogleCalendarLink(title: string, date: string, meetUrl: string): string {
  try {
    const startDate = new Date(date);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour
    
    const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
      details: `Cashar LIVE ah - Barbaarintasan Academy\n\nKu biir Google Meet: ${meetUrl}`,
      location: meetUrl,
    });
    
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  } catch {
    return '';
  }
}

export default function LessonView() {
  const { t } = useTranslation();
  const [, params] = useRoute("/lesson/:id");
  const lessonId = params?.id;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [, setLocation] = useLocation();
  const [assignmentContent, setAssignmentContent] = useState("");
  const queryClient = useQueryClient();
  
  // Offline support
  const { isOnline } = useOffline();
  const { isLessonDownloaded, getLessonDownloadStatus, downloadLesson } = useOfflineDownloads();
  const [offlineLesson, setOfflineLesson] = useState<any>(null);
  const [isDownloadingLesson, setIsDownloadingLesson] = useState(false);
  
  // Load offline lesson data if available
  useEffect(() => {
    if (lessonId) {
      getOfflineLesson(lessonId).then(setOfflineLesson).catch(() => setOfflineLesson(null));
    }
  }, [lessonId]);
  const [videoWatchedPercent, setVideoWatchedPercent] = useState(0);
  const [showVideoWarning, setShowVideoWarning] = useState(false);
  const [celebration, setCelebration] = useState<{
    isOpen: boolean;
    type: CelebrationType;
    title: string;
    subtitle: string;
    description: string;
  } | null>(null);
  const lastProgressUpdateRef = useRef<number>(0);
  const iframeProgressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const iframeStartTimeRef = useRef<number>(0);
  
  // Quiz state
  const [quizCurrentQuestion, setQuizCurrentQuestion] = useState(0);
  const [quizSelectedAnswers, setQuizSelectedAnswers] = useState<(number | string)[]>([]);
  const [quizShowFeedback, setQuizShowFeedback] = useState(false);
  const [quizIsCorrect, setQuizIsCorrect] = useState(false);
  const [quizShowResults, setQuizShowResults] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(true);
  
  // Scheduling limit popup state
  const [showLimitPopup, setShowLimitPopup] = useState<{
    isOpen: boolean;
    type: "daily" | "weekly";
  } | null>(null);
  
  // Reset assignment, quiz, video and prerequisite state when lesson changes
  useEffect(() => {
    setAssignmentContent("");
    setVideoWatchedPercent(0);
    setShowVideoWarning(false);
    setQuizCurrentQuestion(0);
    setQuizSelectedAnswers([]);
    setQuizShowFeedback(false);
    setQuizIsCorrect(false);
    setQuizShowResults(false);
    setVideoError(null);
    setVideoLoading(true);
    setPrerequisiteBlocked({ blocked: false }); // Reset prerequisite check for new lesson
    setScheduleLockedSlug(null); // Reset schedule lock slug for new lesson
    setAccessDeniedCourseSlug(null);
  }, [lessonId]);

  // Track when lesson is viewed (for "last accessed" feature)
  useEffect(() => {
    if (lessonId) {
      fetch(`/api/lessons/${lessonId}/viewed`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    }
  }, [lessonId]);

  const [accessDeniedCourseSlug, setAccessDeniedCourseSlug] = useState<string | null>(null);
  const [prerequisiteBlocked, setPrerequisiteBlocked] = useState<{
    blocked: boolean;
    previousLessonId?: string;
    previousLessonTitle?: string;
    courseSlug?: string;
  }>({ blocked: false });
  // Custom error interface to carry schedule lock data
  interface ScheduleLockedError extends Error {
    unlockDate?: string;
    courseSlug?: string;
    reason?: string;
  }
  
  // Keep state as backup for fallback navigation
  const [scheduleLockedSlug, setScheduleLockedSlug] = useState<string | null>(null);
  
  const { data: lesson, isLoading, error, isError } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const res = await fetch(`/api/lessons/${lessonId}`, { credentials: "include" });
      if (res.status === 401) {
        window.location.href = "/login";
        throw new Error("Unauthorized");
      }
      if (res.status === 403) {
        const data = await res.json();
        if (data.code === "PREREQUISITE_INCOMPLETE") {
          setPrerequisiteBlocked({
            blocked: true,
            previousLessonId: data.previousLessonId,
            previousLessonTitle: data.previousLessonTitle,
            courseSlug: data.courseSlug
          });
          throw new Error("PrerequisiteIncomplete");
        }
        if (data.code === "SCHEDULE_LOCKED") {
          // Store courseSlug in state for fallback navigation
          if (data.courseSlug) setScheduleLockedSlug(data.courseSlug);
          // Attach data directly to error object to avoid race condition
          const err = new Error("ScheduleLocked") as ScheduleLockedError;
          err.unlockDate = data.unlockDate;
          err.courseSlug = data.courseSlug;
          err.reason = data.error;
          throw err;
        }
        if (data.courseSlug) {
          setAccessDeniedCourseSlug(data.courseSlug);
        }
        throw new Error("AccessDenied");
      }
      if (!res.ok) throw new Error("Lesson not found");
      return res.json();
    },
    retry: false,
  });

  // Fetch course info to get the courseId slug for navigation
  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses");
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    },
  });

  // Find the course that contains this lesson
  const course = courses?.find((c: any) => c.id === lesson?.courseId);
  const courseSlug = course?.courseId || "ilmo-is-dabira"; // fallback

  // Timer-based progress tracking for iframe videos (YouTube, Vimeo, Google Drive)
  // Since we can't track actual video progress from iframes due to cross-origin restrictions,
  // we estimate progress based on time spent on the lesson page
  useEffect(() => {
    const isIframeVideo = lesson?.videoUrl && (
      lesson.videoUrl.includes("youtube.com") || 
      lesson.videoUrl.includes("youtu.be") ||
      lesson.videoUrl.includes("vimeo.com")
    );

    if (!isIframeVideo || !lessonId || !lesson) {
      return;
    }

    // Parse duration from lesson (e.g., "2:44" or "10 daqiiqo")
    let estimatedDurationSeconds = 180; // Default 3 minutes
    if (lesson.duration) {
      const timeMatch = lesson.duration.match(/(\d+):(\d+)/);
      if (timeMatch) {
        estimatedDurationSeconds = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
      } else {
        const minMatch = lesson.duration.match(/(\d+)/);
        if (minMatch) {
          estimatedDurationSeconds = parseInt(minMatch[1]) * 60;
        }
      }
    }

    // Start tracking time
    iframeStartTimeRef.current = Date.now();
    lastProgressUpdateRef.current = videoWatchedPercent;

    // Update progress every 5 seconds
    iframeProgressIntervalRef.current = setInterval(() => {
      const elapsedSeconds = (Date.now() - iframeStartTimeRef.current) / 1000;
      const newPercent = Math.min(100, Math.round((elapsedSeconds / estimatedDurationSeconds) * 100));
      
      setVideoWatchedPercent(newPercent);

      // Update backend every 10% or when reaching 80%
      if (newPercent >= lastProgressUpdateRef.current + 10 || (newPercent >= 80 && lastProgressUpdateRef.current < 80)) {
        if (newPercent > lastProgressUpdateRef.current) {
          lastProgressUpdateRef.current = newPercent;
          fetch(`/api/lessons/${lessonId}/video-progress`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ percent: newPercent }),
          }).catch(() => {});
        }
      }
    }, 5000);

    return () => {
      if (iframeProgressIntervalRef.current) {
        clearInterval(iframeProgressIntervalRef.current);
        iframeProgressIntervalRef.current = null;
      }
    };
  }, [lesson?.videoUrl, lessonId, lesson?.duration, lesson]);

  // Fetch AI-generated images for this lesson
  const { data: lessonImages = [] } = useQuery({
    queryKey: ["lessonImages", lessonId],
    queryFn: async () => {
      const res = await fetch(`/api/lessons/${lessonId}/images`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!lessonId,
  });

  // Fetch all lessons for this course to enable navigation
  const { data: allLessons } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => {
      const res = await fetch("/api/lessons");
      if (!res.ok) throw new Error("Failed to fetch lessons");
      return res.json();
    },
  });

  // Get lessons for this course, sorted by module and order
  const courseLessons = (allLessons || [])
    .filter((l: any) => l.courseId === lesson?.courseId)
    .sort((a: any, b: any) => {
      if (a.moduleNumber !== b.moduleNumber) return (a.moduleNumber || 0) - (b.moduleNumber || 0);
      return (a.order || 0) - (b.order || 0);
    });

  // Find current lesson index and calculate navigation
  const currentIndex = courseLessons.findIndex((l: any) => l.id === lessonId);
  const isValidIndex = currentIndex >= 0;
  const previousLesson = isValidIndex && currentIndex > 0 ? courseLessons[currentIndex - 1] : null;
  const nextLesson = isValidIndex && currentIndex < courseLessons.length - 1 ? courseLessons[currentIndex + 1] : null;
  const isLastLesson = isValidIndex && currentIndex === courseLessons.length - 1;
  const progressPercent = isValidIndex && courseLessons.length > 0 ? Math.round(((currentIndex + 1) / courseLessons.length) * 100) : 0;

  // Assignment submission
  const { data: myAssignment } = useQuery({
    queryKey: ["myAssignment", lessonId],
    queryFn: async () => {
      const res = await fetch(`/api/lessons/${lessonId}/my-assignment`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!lessonId,
  });

  const submitAssignment = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/lessons/${lessonId}/assignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myAssignment", lessonId] });
      setAssignmentContent("");
    },
  });

  // Progress tracking - check if lesson is completed
  const { data: progressData = [] } = useQuery({
    queryKey: ["lessonProgress"],
    queryFn: async () => {
      const res = await fetch("/api/parent/progress", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const isLessonCompleted = progressData.some(
    (p: any) => p.lessonId === lessonId && p.completed
  );

  // Check if entire course is completed (all lessons done)
  const isCourseFullyCompleted = courseLessons.length > 0 && courseLessons.every(
    (l: any) => progressData.some((p: any) => p.lessonId === l.id && p.completed)
  );

  // Auto-show celebration for fully completed course (once per session visit)
  useEffect(() => {
    if (!isCourseFullyCompleted || !lesson?.courseId) return;
    const sessionKey = `celebration_session_${lesson.courseId}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "true");
    setCelebration({
      isOpen: true,
      type: "course_complete",
      title: t("lessonView.success"),
      subtitle: course?.title || "",
      description: t("lessonView.founderMessage"),
    });
  }, [isCourseFullyCompleted, lesson?.courseId]);

  // Scheduling status for 0-6 course (daily/weekly lesson limits)
  const { data: schedulingStatus, refetch: refetchScheduling } = useQuery({
    queryKey: ["schedulingStatus", courseSlug],
    queryFn: async () => {
      if (courseSlug !== "0-6") return null;
      const res = await fetch(`/api/courses/${courseSlug}/scheduling`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: courseSlug === "0-6",
  });

  // Mark lesson as complete mutation
  const markComplete = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/lessons/${lessonId}/complete`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json();
        // Throw an object that preserves both message and code for structured error handling
        const err: any = new Error(errorData.message || errorData.error || "Failed to mark complete");
        err.code = errorData.code;
        throw err;
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Invalidate all queries that start with "lessonProgress" to refresh Profile page data
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === "lessonProgress" || 
        query.queryKey[0] === "parentEnrollments"
      });
      queryClient.invalidateQueries({ queryKey: ["earnedBadges"] });
      setShowVideoWarning(false);
      
      // Check if server confirmed all lessons in the course are now completed
      if (data.courseCompleted) {
        setCelebration({
          isOpen: true,
          type: "course_complete",
          title: t("lessonView.success"),
          subtitle: course?.title || "",
          description: t("lessonView.founderMessage"),
        });
        return;
      }
      
      // Show badge celebration if badges were awarded
      if (data.awardedBadges && data.awardedBadges.length > 0) {
        setCelebration({
          isOpen: true,
          type: "badge",
          title: t("lessonView.congratsNewBadge"),
          subtitle: data.awardedBadges.join(", "),
          description: `${t("lessonView.congratsNewBadge")} ${data.awardedBadges.join(", ")}. Mahadsanid dadaalkaaga!`,
        });
        return;
      }
      
      // Show lesson complete celebration
      setCelebration({
        isOpen: true,
        type: "lesson_complete",
        title: "Hambalyo Casharkan waad Dhameysay!",
        subtitle: lesson?.title || "",
        description: "10 Dhibcood ayaad heshay.\nWaalid Dadaalaya! Hooyo/Aabe ❤️",
      });
      
      // Refresh scheduling status after successful completion
      if (courseSlug === "0-6") {
        refetchScheduling();
      }
    },
    onError: (error: any) => {
      // Check for structured error code first
      const errorCode = error?.code || "";
      const errorMessage = error?.message || String(error);
      
      if (errorMessage.includes("video") || errorMessage.includes("Video")) {
        setShowVideoWarning(true);
      } else if (errorCode === "DAILY_LIMIT_REACHED" || errorCode === "WEEKLY_LIMIT_REACHED" || 
                 errorMessage.includes("dhamaysay") || errorMessage.includes("cashar")) {
        // Scheduling limit reached - show beautiful popup
        const limitType = errorCode === "WEEKLY_LIMIT_REACHED" ? "weekly" : "daily";
        setShowLimitPopup({ isOpen: true, type: limitType });
        if (courseSlug === "0-6") {
          refetchScheduling();
        }
      } else {
        toast.error(errorMessage);
      }
    }
  });

  // Update video progress mutation
  const updateVideoProgress = useMutation({
    mutationFn: async (percent: number) => {
      const res = await fetch(`/api/lessons/${lessonId}/video-progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ percent }),
      });
      if (!res.ok) return null;
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessonProgress"] });
    },
  });

  // Update video position for resume
  const updateVideoPosition = useMutation({
    mutationFn: async (position: number) => {
      const res = await fetch(`/api/lessons/${lessonId}/video-position`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ position }),
      });
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Fetch lesson unlock status
  const { data: unlockStatus } = useQuery({
    queryKey: ["lessonUnlock", lessonId],
    queryFn: async () => {
      const res = await fetch(`/api/lessons/${lessonId}/unlock-status`, { credentials: "include" });
      if (!res.ok) return { unlocked: true };
      return res.json();
    },
    enabled: !!lessonId,
  });

  // Handle video time update for HTML5 video
  const lastPositionUpdateRef = useRef(0);
  const handleVideoTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const percent = video.duration > 0 ? (video.currentTime / video.duration) * 100 : 0;
    const roundedPercent = Math.round(percent);
    const currentPosition = Math.round(video.currentTime);
    
    setVideoWatchedPercent(roundedPercent);
    
    // Update backend every 10% progress
    if (roundedPercent >= lastProgressUpdateRef.current + 10 || roundedPercent >= 80) {
      if (roundedPercent > lastProgressUpdateRef.current) {
        lastProgressUpdateRef.current = roundedPercent;
        updateVideoProgress.mutate(roundedPercent);
      }
    }
    
    // Save position every 15 seconds for resume
    if (Math.abs(currentPosition - lastPositionUpdateRef.current) >= 15) {
      lastPositionUpdateRef.current = currentPosition;
      updateVideoPosition.mutate(currentPosition);
    }
  }, [updateVideoProgress, updateVideoPosition]);

  // Load existing video progress and resume position
  useEffect(() => {
    const existingProgress = progressData.find((p: any) => p.lessonId === lessonId);
    if (existingProgress?.videoWatchedPercent) {
      setVideoWatchedPercent(existingProgress.videoWatchedPercent);
      lastProgressUpdateRef.current = existingProgress.videoWatchedPercent;
    }
    // Resume video from saved position
    if (existingProgress?.videoPosition && videoRef.current) {
      const savedPosition = existingProgress.videoPosition;
      if (savedPosition > 5) {
        videoRef.current.currentTime = savedPosition;
        lastPositionUpdateRef.current = savedPosition;
      }
    }
  }, [progressData, lessonId]);

  // Detect if lesson is an assignment
  const isAssignment = lesson?.lessonType === "assignment" || 
    lesson?.title?.toLowerCase().includes("assignment") ||
    lesson?.title?.includes("Hawlgal") ||
    lesson?.title?.includes("Qor ") ||
    lesson?.title?.includes("Soo dir") ||
    !!lesson?.assignmentRequirements;

  const { data: accessInfo } = useQuery({
    queryKey: ["courseAccess", lesson?.courseId],
    queryFn: async () => {
      const res = await fetch(`/api/course/${lesson.courseId}/access`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to check access");
      return res.json();
    },
    enabled: !!lesson?.courseId,
  });

  // Bookmark query and mutations
  const { data: bookmarkData } = useQuery({
    queryKey: ["bookmark", lessonId],
    queryFn: async () => {
      const res = await fetch(`/api/parent/bookmarks/${lessonId}`, { credentials: "include" });
      if (!res.ok) return { isBookmarked: false };
      return res.json();
    },
    enabled: !!lessonId,
  });

  const isBookmarked = bookmarkData?.isBookmarked || false;

  const toggleBookmark = useMutation({
    mutationFn: async () => {
      if (isBookmarked) {
        await fetch(`/api/parent/bookmarks/${lessonId}`, { method: "DELETE", credentials: "include" });
      } else {
        await fetch("/api/parent/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ lessonId })
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmark", lessonId] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success(isBookmarked ? "Casharkan waa laga saaray keydka" : "Casharkan waa la keydiyey!");
    }
  });

  const { data: exerciseData } = useQuery({
    queryKey: ["exercises", lessonId],
    queryFn: async () => {
      const res = await fetch(`/api/lessons/${lessonId}/exercises`, { credentials: "include" });
      if (!res.ok) return { exercises: [], progress: [] };
      return res.json();
    },
    enabled: !!lessonId,
  });

  const exercises = exerciseData?.exercises || [];
  const exerciseProgress = exerciseData?.progress || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  if (isError && error?.message === "Unauthorized") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <LogIn className="w-16 h-16 mx-auto mb-4 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Fadlan Soo Gal</h2>
            <p className="text-gray-600 mb-4">Cashirada waxaad u baahan tahay inaad soo gasho akoonkaaga.</p>
            <Link href="/login">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Soo Gal / Is-Diiwaangeli
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prerequisite not completed - previous lesson required
  if (isError && error?.message === "PrerequisiteIncomplete") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-blue-200">
          <CardContent className="p-6 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <Lock className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Dhammee Casharkii hore</h2>
            <p className="text-gray-600 mb-6">
              Si aad u furto casharka cusub, waa inaad marka hore dhameysataa casharka ka horeeyay.
            </p>
            {prerequisiteBlocked.previousLessonTitle && (
              <p className="text-sm text-gray-500 mb-4">
                Cashar: <span className="font-semibold">{prerequisiteBlocked.previousLessonTitle}</span>
              </p>
            )}
            <Link href={prerequisiteBlocked.previousLessonId ? `/lesson/${prerequisiteBlocked.previousLessonId}` : (prerequisiteBlocked.courseSlug ? `/course/${prerequisiteBlocked.courseSlug}` : "/courses")}>
              <Button className="w-full h-14 text-lg font-bold bg-blue-500 hover:bg-blue-600" data-testid="button-go-previous-lesson">
                Aad Casharka Hore
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Schedule locked - lesson will unlock on specific date
  if (isError && error?.message === "ScheduleLocked") {
    // Get data directly from error object (avoids race condition with async state)
    const scheduleError = error as ScheduleLockedError;
    
    // Format date as DD.MM.YYYY only (without day name)
    const formatDateOnly = (dateStr?: string) => {
      if (!dateStr) return "";
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
      } catch {
        return dateStr;
      }
    };
    
    // Format the unlock date nicely with day name
    const formatUnlockDate = (dateStr?: string) => {
      if (!dateStr) return "";
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const somaliDay = SOMALI_DAYS[dayName] || dayName;
        return `${somaliDay}, ${formatDateOnly(dateStr)}`;
      } catch {
        return dateStr;
      }
    };
    
    // Build the message - always show the actual date
    const unlockDateStr = formatDateOnly(scheduleError.unlockDate);
    // API always sends reason with formatted date, use unlockDate as backup
    const displayMessage = scheduleError.reason || `Casharkani wuxuu furmayaa ${unlockDateStr}`;

    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-purple-200">
          <CardContent className="p-6 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
              <Calendar className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Casharkani weli ma furan yahay</h2>
            <p className="text-gray-600 mb-4">
              {displayMessage}
            </p>
            {scheduleError.unlockDate && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-purple-700 font-medium">
                  Taariikhda: <span className="font-bold">{formatUnlockDate(scheduleError.unlockDate)}</span>
                </p>
              </div>
            )}
            <Link href={scheduleError.courseSlug ? `/course/${scheduleError.courseSlug}` : "/courses"}>
              <Button className="w-full h-14 text-lg font-bold bg-purple-500 hover:bg-purple-600" data-testid="button-back-to-course">
                Ku Noqo Koorsada
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Access denied - course not purchased
  if (isError && error?.message === "AccessDenied") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-orange-200">
          <CardContent className="p-6 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
              <Lock className="w-10 h-10 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">🔒 Koorsadani way kaa xiran tahay</h2>
            <p className="text-gray-600 mb-6">
              Si aad u aragto cashirada koorsadan, fadlan marka hore iibso koorsada.
            </p>
            <Link href={accessDeniedCourseSlug ? `/course/${accessDeniedCourseSlug}` : "/courses"}>
              <Button className="w-full h-14 text-lg font-bold bg-orange-500 hover:bg-orange-600" data-testid="button-buy-course">
                🛒 Iibso Koorsada
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!lesson) {
    // Try to use any available course slug from error states
    const scheduleErrorSlug = (error as ScheduleLockedError)?.courseSlug || scheduleLockedSlug;
    const fallbackCourseSlug = scheduleErrorSlug || accessDeniedCourseSlug || prerequisiteBlocked.courseSlug;
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{t("lessonView.lessonNotFound")}</p>
          <Link href={fallbackCourseSlug ? `/course/${fallbackCourseSlug}` : "/courses"}>
            <Button>{t("lessonView.backToCourses")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check access: either user has subscription access OR lesson is free trial
  const hasAccess = accessInfo?.hasAccess === true || lesson.isFree === true;
  const hasVideo = lesson.videoUrl && lesson.videoUrl.trim() !== '';
  const isQuiz = lesson.title.toLowerCase().includes("quiz") || 
                 lesson.title.includes("Su'aal") || 
                 lesson.title.includes("Jawaab") ||
                 lesson.title.includes("Qor ");

  const renderVideoPlayer = () => {
    if (!lesson.videoUrl) return null;
    
    if (lesson.videoUrl.includes("youtube.com") || lesson.videoUrl.includes("youtu.be")) {
      return (
        <div className="relative w-full aspect-video rounded-xl shadow-lg overflow-hidden bg-black">
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={`https://www.youtube.com/embed/${getYouTubeId(lesson.videoUrl)}?rel=0&modestbranding=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            data-testid="youtube-player"
          />
        </div>
      );
    }
    
    if (lesson.videoUrl.includes("vimeo.com")) {
      return (
        <div className="relative w-full aspect-video rounded-xl shadow-lg overflow-hidden bg-black">
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={`https://player.vimeo.com/video/${getVimeoId(lesson.videoUrl)}?badge=0&autopause=0&player_id=0&app_id=58479`}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            data-testid="vimeo-player"
          />
        </div>
      );
    }

    const originalUrl = (lesson.videoUrl || '').trim();
    
    const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      const video = e.currentTarget;
      const error = video.error;
      let errorMessage = t("lessonView.videoLoadError") || "Video-ga ma soo dejin karo";
      
      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = "Video-ga waa la joojiyey";
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = "Internet-ka ayaa dhibaato ka jirta. Fadlan hubi xiriirkaaga";
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = "Video-ga qaab khaldan ayuu leeyahay";
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = "Video-ga qaabkiisa ma la taageerin";
            break;
        }
      }
      
      console.error("Video playback error:", error, errorMessage);
      setVideoError(errorMessage);
      setVideoLoading(false);
    };

    const handleVideoLoaded = () => {
      setVideoLoading(false);
      setVideoError(null);
    };

    const handleRetry = () => {
      setVideoError(null);
      setVideoLoading(true);
      if (videoRef.current) {
        videoRef.current.load();
      }
    };

    // Google Drive video - use server proxy to hide file ID and prevent downloads
    if (isGoogleDriveUrl(lesson.videoUrl)) {
      const proxyUrl = `/api/video/stream/${lesson.id}`;
      return (
        <div className="relative rounded-xl overflow-hidden shadow-lg bg-black">
          <video
            key={proxyUrl}
            ref={videoRef}
            controls
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            className="w-full aspect-video rounded-xl bg-black"
            data-testid="video-player-proxy"
            playsInline
            webkit-playsinline="true"
            preload="metadata"
            onContextMenu={(e) => e.preventDefault()}
            onTimeUpdate={handleVideoTimeUpdate}
            onError={handleVideoError}
            onLoadedData={handleVideoLoaded}
            onCanPlay={handleVideoLoaded}
          >
            <source src={proxyUrl} type="video/mp4" />
            Browser-kaagu ma taageero video-ga HTML5
          </video>
        </div>
      );
    }

    if (videoError) {
      return (
        <div className="relative rounded-xl overflow-hidden shadow-lg bg-gray-900 aspect-video flex flex-col items-center justify-center p-6 text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-white font-medium mb-2">{videoError}</p>
          <p className="text-gray-400 text-sm mb-4">
            {t("lessonView.videoRetryHint") || "Haddii dhibaatadu sii jirto, fadlan refresh garee bogga ama soo laabo mar dambe"}
          </p>
          <button
            onClick={handleRetry}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            data-testid="button-retry-video"
          >
            {t("lessonView.videoRetry")}
          </button>
        </div>
      );
    }
    
    return (
      <div className="relative rounded-xl overflow-hidden shadow-lg bg-black">
        <video 
          key={originalUrl}
          ref={videoRef}
          controls 
          className="w-full aspect-video rounded-xl bg-black"
          data-testid="video-player"
          playsInline
          webkit-playsinline="true"
          preload="metadata"
          onContextMenu={(e) => e.preventDefault()}
          onTimeUpdate={handleVideoTimeUpdate}
          onError={handleVideoError}
          onLoadedData={handleVideoLoaded}
          onCanPlay={handleVideoLoaded}
        >
          <source src={originalUrl} type="video/mp4" />
          Browser-kaagu ma taageero video-ga HTML5
        </video>
      </div>
    );
  };

  const renderVideoProgress = () => {
    if (!hasVideo || !lesson.videoWatchRequired) return null;
    
    const isWatched = videoWatchedPercent >= 80;
    
    return (
      <div className={`mt-3 p-3 rounded-lg ${isWatched ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
        <div className="flex items-center gap-2 mb-2">
          {isWatched ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <Play className="w-5 h-5 text-amber-500" />
          )}
          <span className={`text-sm font-medium ${isWatched ? 'text-green-700' : 'text-amber-700'}`}>
            {isWatched ? t("lessonView.videoWatched") : t("lessonView.watchToComplete")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={videoWatchedPercent} className="h-2 flex-1" />
          <span className="text-xs font-bold text-gray-600">{videoWatchedPercent}%</span>
        </div>
      </div>
    );
  };

  // Parse quiz questions from textContent (JSON format)
  const parseQuizQuestions = (): any[] => {
    if (!lesson?.textContent) return [];
    try {
      const parsed = JSON.parse(lesson.textContent);
      if (Array.isArray(parsed)) return parsed;
      
      // Combine both multiple choice questions and open-ended questions
      const mcQuestions = parsed.questions && Array.isArray(parsed.questions) ? parsed.questions : [];
      const openEndedQuestions = parsed.openEndedQuestions && Array.isArray(parsed.openEndedQuestions) 
        ? parsed.openEndedQuestions.map((q: any) => ({ ...q, questionType: "open_ended" }))
        : [];
      
      return [...mcQuestions, ...openEndedQuestions];
    } catch {
      return [];
    }
  };

  const quizQuestions = lesson?.lessonType === "quiz" ? parseQuizQuestions() : [];
  const isQuizLesson = lesson?.lessonType === "quiz" && quizQuestions.length > 0;

  const renderQuiz = () => {
    if (!isQuizLesson) return null;

    const currentQ = quizQuestions[quizCurrentQuestion];
    if (!currentQ) return null;

    const options = typeof currentQ.options === "string" ? JSON.parse(currentQ.options) : currentQ.options || [];
    const isOpenEnded = currentQ.questionType === "open_ended";
    const totalQuestions = quizQuestions.length;

    const handleSelectAnswer = (answerIndex: number) => {
      if (quizShowFeedback) return;
      const newAnswers = [...quizSelectedAnswers];
      newAnswers[quizCurrentQuestion] = answerIndex;
      setQuizSelectedAnswers(newAnswers);
    };

    const handleOpenEndedChange = (text: string) => {
      const newAnswers = [...quizSelectedAnswers];
      newAnswers[quizCurrentQuestion] = text;
      setQuizSelectedAnswers(newAnswers);
    };

    const handleCheckAnswer = () => {
      if (isOpenEnded) {
        setQuizIsCorrect(true);
        setQuizShowFeedback(true);
        return;
      }
      const userAnswer = quizSelectedAnswers[quizCurrentQuestion];
      const correct = userAnswer === currentQ.correctAnswer;
      setQuizIsCorrect(correct);
      setQuizShowFeedback(true);
    };

    const handleNextQuestion = () => {
      setQuizShowFeedback(false);
      if (quizCurrentQuestion < totalQuestions - 1) {
        setQuizCurrentQuestion(quizCurrentQuestion + 1);
      } else {
        setQuizShowResults(true);
      }
    };

    const calculateScore = () => {
      let correct = 0;
      quizQuestions.forEach((q: any, idx: number) => {
        if (q.questionType === "open_ended") {
          correct++;
        } else if (quizSelectedAnswers[idx] === q.correctAnswer) {
          correct++;
        }
      });
      return Math.round((correct / totalQuestions) * 100);
    };

    const restartQuiz = () => {
      setQuizCurrentQuestion(0);
      setQuizSelectedAnswers([]);
      setQuizShowFeedback(false);
      setQuizIsCorrect(false);
      setQuizShowResults(false);
    };

    if (quizShowResults) {
      const score = calculateScore();
      const passed = score >= 70;
      return (
        <div className="w-full max-w-lg mx-auto px-2">
          <Card className={`border-3 shadow-xl ${passed ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50' : 'border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50'}`}>
            <CardContent className="p-6 sm:p-8 text-center">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${passed ? 'bg-green-100' : 'bg-orange-100'}`}>
                {passed ? <Award className="w-14 h-14 text-green-600" /> : <X className="w-14 h-14 text-orange-600" />}
              </div>
              <h3 className="text-3xl font-bold mb-4">{passed ? "Hambalyo! 🎉" : "Isku day mar kale 💪"}</h3>
              <div className={`inline-block px-8 py-4 rounded-2xl mb-6 ${passed ? 'bg-green-100' : 'bg-orange-100'}`}>
                <p className="text-6xl font-bold" style={{ color: passed ? '#16a34a' : '#ea580c' }}>{score}%</p>
              </div>
              <p className="text-lg text-gray-600 mb-8">
                {passed ? "Waxaad si fiican u jawaabday su'aalaha!" : "Waxaad u baahan tahay 70% si aad u guulaysato."}
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={restartQuiz} 
                  variant="outline" 
                  className="w-full h-12 text-lg border-2"
                  data-testid="button-restart-quiz"
                >
                  🔄 Dib u bilaw
                </Button>
                {passed && (
                  <Button 
                    onClick={() => markComplete.mutate()} 
                    className="w-full h-14 text-lg font-bold bg-green-500 hover:bg-green-600"
                    data-testid="button-complete-quiz"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" /> ✅ Dhameystir Casharka
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    const answerLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
    
    return (
      <div className="w-full max-w-lg mx-auto px-2">
        <Card className="border-3 border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-xl">
          <CardContent className="p-4 sm:p-6">
            {/* Progress Header */}
            <div className="bg-purple-600 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 py-4 rounded-t-xl mb-6">
              <div className="flex items-center justify-between text-white">
                <span className="text-lg font-bold">
                  Su'aal {quizCurrentQuestion + 1} / {totalQuestions}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm opacity-80">{Math.round(((quizCurrentQuestion + 1) / totalQuestions) * 100)}%</span>
                </div>
              </div>
              <Progress value={((quizCurrentQuestion + 1) / totalQuestions) * 100} className="mt-3 h-3 bg-purple-400" />
            </div>

            {/* Question */}
            <div className="bg-white rounded-xl p-4 mb-6 border-2 border-purple-200 shadow-sm">
              <p className="text-xs text-purple-600 font-medium mb-2">❓ SU'AASHA:</p>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 leading-relaxed">{currentQ.question}</h3>
            </div>

            {/* Answer Options */}
            {isOpenEnded ? (
              <div className="mb-6">
                <p className="text-xs text-purple-600 font-medium mb-2">✍️ JAWAABTA:</p>
                <Textarea
                  placeholder="Halkan ku qor jawaabta..."
                  value={(quizSelectedAnswers[quizCurrentQuestion] as string) || ""}
                  onChange={(e) => handleOpenEndedChange(e.target.value)}
                  rows={5}
                  className="text-lg p-4 border-2 border-purple-200 focus:border-purple-500 rounded-xl"
                  disabled={quizShowFeedback}
                />
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                <p className="text-xs text-purple-600 font-medium mb-2">👆 DOORO JAWAABTA:</p>
                {options.map((option: string, idx: number) => {
                  const isSelected = quizSelectedAnswers[quizCurrentQuestion] === idx;
                  const isCorrectOption = idx === currentQ.correctAnswer;
                  let containerClass = "bg-white border-gray-200 hover:border-purple-400 hover:bg-purple-50";
                  let labelClass = "bg-gray-100 text-gray-600";
                  
                  if (quizShowFeedback) {
                    if (isCorrectOption) {
                      containerClass = "bg-green-50 border-green-500 ring-2 ring-green-500";
                      labelClass = "bg-green-500 text-white";
                    } else if (isSelected && !isCorrectOption) {
                      containerClass = "bg-red-50 border-red-500 ring-2 ring-red-500";
                      labelClass = "bg-red-500 text-white";
                    }
                  } else if (isSelected) {
                    containerClass = "bg-purple-100 border-purple-500 ring-2 ring-purple-500";
                    labelClass = "bg-purple-500 text-white";
                  }
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectAnswer(idx)}
                      disabled={quizShowFeedback}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${containerClass}`}
                      data-testid={`quiz-option-${idx}`}
                    >
                      <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${labelClass}`}>
                        {answerLabels[idx]}
                      </span>
                      <span className="text-base sm:text-lg font-medium text-gray-800">{option}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Feedback */}
            {quizShowFeedback && (
              <div className={`p-4 rounded-xl mb-6 ${quizIsCorrect ? 'bg-green-100 border-2 border-green-300' : 'bg-red-100 border-2 border-red-300'}`}>
                <div className="flex items-center gap-3">
                  {quizIsCorrect ? (
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                      <X className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <span className="text-xl font-bold">{quizIsCorrect ? "Saxan! ✓" : "Khalad ✗"}</span>
                </div>
                {currentQ.explanation && <p className="mt-3 text-base text-gray-700">{currentQ.explanation}</p>}
              </div>
            )}

            {/* Action Button */}
            <div className="flex justify-center">
              {!quizShowFeedback ? (
                <Button
                  onClick={handleCheckAnswer}
                  disabled={quizSelectedAnswers[quizCurrentQuestion] === undefined || (isOpenEnded && !(quizSelectedAnswers[quizCurrentQuestion] as string)?.trim())}
                  className="w-full h-14 text-lg font-bold bg-purple-600 hover:bg-purple-700 rounded-xl"
                  data-testid="button-check-answer"
                >
                  ✅ Hubi Jawaabta
                </Button>
              ) : (
                <Button 
                  onClick={handleNextQuestion} 
                  className="w-full h-14 text-lg font-bold bg-purple-600 hover:bg-purple-700 rounded-xl"
                  data-testid="button-next-question"
                >
                  {quizCurrentQuestion < totalQuestions - 1 ? "Su'aal Xiga →" : "📊 Natiijada Eeg"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderLessonLocked = () => {
    if (!unlockStatus || unlockStatus.unlocked) return null;
    
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 font-display mb-3">
              {t("lessonView.lessonLocked")}
            </h2>
            <p className="text-gray-600 mb-4 text-lg">
              {unlockStatus.reason}
            </p>
            {unlockStatus.unlockDate && (
              <p className="text-amber-700 font-medium">
                📅 {t("lessonView.unlocksOn")} {new Date(unlockStatus.unlockDate).toLocaleDateString('so-SO', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            )}
            <div className="mt-6">
              <Link href={`/course/${courseSlug}`}>
                <Button variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  {t("lessonView.backToCourses")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderLockedContent = () => {
    const reason = accessInfo?.reason;
    
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 font-display mb-3">
              {t("lessonView.lessonLocked2")}
            </h2>
            
            {reason === "not_authenticated" ? (
              <>
                <p className="text-gray-600 mb-6 text-lg">
                  {t("lessonView.loginPrompt")}
                </p>
                <Link href="/profile">
                  <Button className="bg-orange-500 hover:bg-orange-600 h-12 px-8 text-base font-bold shadow-lg">
                    <LogIn className="w-5 h-5 mr-2" />
                    {t("lessonView.loginButton")}
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-6 text-lg">
                  {t("lessonView.buyToContinue")}
                </p>
                <Link href={`/course/${courseSlug}`}>
                  <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 h-12 px-8 text-base font-bold shadow-lg">
                    {t("lessonView.buyCourse")}
                  </Button>
                </Link>
              </>
            )}
            
            <div className="mt-8 p-4 bg-white/50 rounded-xl">
              <p className="text-sm text-gray-500">
                {t("lessonView.theLesson")} <span className="font-medium text-gray-700">{lesson.title}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 font-body">
      {/* Celebration Modal */}
      {celebration && celebration.type === "course_complete" ? (
        <CourseCompleteCelebration
          isOpen={celebration.isOpen}
          onClose={() => setCelebration(null)}
          title={celebration.title}
          subtitle={celebration.subtitle}
          description={celebration.description}
        />
      ) : celebration ? (
        <CelebrationModal
          isOpen={celebration.isOpen}
          onClose={() => setCelebration(null)}
          type={celebration.type}
          title={celebration.title}
          subtitle={celebration.subtitle}
          description={celebration.description}
        />
      ) : null}
      
      {/* Scheduling Limit Popup Modal */}
      <Dialog open={showLimitPopup?.isOpen || false} onOpenChange={(open) => !open && setShowLimitPopup(null)}>
        <DialogContent className="sm:max-w-md mx-4 p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-gradient-to-b from-orange-50 to-amber-50 p-8 text-center">
            {/* Sad Emoji */}
            <div className="text-7xl mb-4">😢</div>
            
            {/* Title */}
            <h2 className="text-2xl font-bold text-orange-800 mb-4">
              {showLimitPopup?.type === "weekly" ? "Usbuucan Waa Dhamaaday!" : "Maanta Waa Dhamaaday!"}
            </h2>
            
            {/* Explanation */}
            <div className="space-y-3 text-gray-700 mb-6">
              <p className="text-lg">
                Waan ka xunnahay, laakiin waxaan raacaynaa xeer caafimaad leh oo waxbarasho ah.
              </p>
              
              <div className="bg-white/70 rounded-lg p-4 text-left space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📚</span>
                  <span><strong>Maalintii:</strong> 2 cashar oo kaliya</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📅</span>
                  <span><strong>Usbuucii:</strong> 4 cashar (2 maalmood × 2 cashar)</span>
                </div>
              </div>
              
              {showLimitPopup?.type === "weekly" ? (
                <p className="text-orange-700 font-medium">
                  Usbuuca dambe Isniinta ayaad sii wadan kartaa. Mahadsanid dulqaadkaaga! 🙏
                </p>
              ) : (
                <p className="text-orange-700 font-medium">
                  Berri ayaad 2 cashar kale qaadan kartaa. Mahadsanid dulqaadkaaga! 🙏
                </p>
              )}
            </div>
            
            {/* Action Button */}
            <Button 
              onClick={() => setShowLimitPopup(null)}
              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 text-lg rounded-full"
            >
              Waan Fahamsanahay ✓
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href={`/course/${courseSlug}`}>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-orange-50" data-testid="button-back">
              <ChevronLeft className="w-5 h-5 text-orange-600" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-medium text-gray-500">{t("lesson.lesson")}</h1>
              {/* Offline indicator */}
              {offlineLesson ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  Offline
                </span>
              ) : !isOnline && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                  <WifiOff className="w-3 h-3" />
                  No Internet
                </span>
              )}
            </div>
            <p className="text-base font-bold text-gray-900 font-display line-clamp-1">{lesson.title}</p>
          </div>
          {/* Download button for individual lesson */}
          {hasAccess && !offlineLesson && isOnline && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-indigo-50"
              onClick={async () => {
                setIsDownloadingLesson(true);
                try {
                  await downloadLesson(lesson, { id: lesson.courseId, name: course?.title });
                  toast.success(t("lesson.downloadComplete") || "Casharku waa la soo dejiyey!");
                  // Refresh offline lesson data
                  getOfflineLesson(lessonId!).then(setOfflineLesson);
                } catch (error) {
                  toast.error(t("lesson.downloadError") || "Wax qalad ah ayaa dhacay");
                } finally {
                  setIsDownloadingLesson(false);
                }
              }}
              disabled={isDownloadingLesson}
              data-testid="button-download-lesson"
            >
              {isDownloadingLesson ? (
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              ) : (
                <Download className="w-5 h-5 text-indigo-600" />
              )}
            </Button>
          )}
          {hasAccess && (
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full ${isBookmarked ? 'text-orange-500 bg-orange-50' : 'hover:bg-orange-50'}`}
              onClick={() => toggleBookmark.mutate()}
              disabled={toggleBookmark.isPending}
              data-testid="button-bookmark"
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-5 h-5" />
              ) : (
                <Bookmark className="w-5 h-5 text-gray-400" />
              )}
            </Button>
          )}
          {hasAccess && previousLesson && (
            <Link href={`/lesson/${previousLesson.id}`}>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-orange-50" data-testid="button-prev-header">
                <ChevronRight className="w-5 h-5 text-orange-600" />
              </Button>
            </Link>
          )}
        </div>
        {/* Progress Bar */}
        {hasAccess && isValidIndex && courseLessons.length > 0 && (
          <div className="max-w-6xl mx-auto px-4 py-2 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Progress value={progressPercent} className="h-2" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="font-bold text-green-600">{progressPercent}%</span>
                <span className="text-gray-500">({currentIndex + 1}/{courseLessons.length})</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Check Access */}
      {!hasAccess ? (
        renderLockedContent()
      ) : unlockStatus && !unlockStatus.unlocked ? (
        renderLessonLocked()
      ) : (
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Live Lesson Layout */}
          {lesson.isLive ? (
            <div className="max-w-3xl mx-auto">
              {/* Live Badge */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-full animate-pulse">
                  <Video className="w-4 h-4" /> LIVE
                </span>
                {lesson.liveDate && (
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 text-sm font-bold rounded-full">
                    <Calendar className="w-4 h-4" /> {formatSomaliDate(lesson.liveDate)}
                    {lesson.liveTimezone && ` (${getTimezoneLabel(lesson.liveTimezone)})`}
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-bold text-gray-900 font-display mb-4">{lesson.title}</h2>
              
              {lesson.description && (
                <p className="text-gray-600 mb-6">{lesson.description}</p>
              )}

              {/* Live Session Card */}
              <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 mb-6">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Video className="w-10 h-10 text-red-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-red-900 mb-3">{t("lessonView.liveMeeting")}</h3>
                  <p className="text-red-700 mb-6 text-lg">
                    {t("lessonView.joinMeetingPrompt")}
                  </p>
                  {lesson.liveUrl ? (
                    <div className="space-y-4">
                      <a href={lesson.liveUrl} target="_blank" rel="noopener noreferrer">
                        <Button className="bg-red-500 hover:bg-red-600 text-white text-lg px-8 py-6 h-auto font-bold w-full sm:w-auto" data-testid="button-join-meeting">
                          <ExternalLink className="w-5 h-5 mr-3" />
                          {t("lessonView.joinMeeting")}
                        </Button>
                      </a>
                      {lesson.liveDate && (
                        <div className="pt-4 border-t border-red-200">
                          <p className="text-sm text-red-700 mb-3">{t("lessonView.addToCalendar")}</p>
                          <a 
                            href={generateGoogleCalendarLink(lesson.title, lesson.liveDate, lesson.liveUrl)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50" data-testid="button-add-calendar">
                              <Calendar className="w-4 h-4 mr-2" />
                              {t("lessonView.addCalendarButton")}
                            </Button>
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button className="bg-gray-400 text-white text-lg px-8 py-6 h-auto font-bold" disabled>
                      {t("lessonView.linkNotReady")}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Text Content for Live Lesson (hide for quiz lessons since textContent is JSON) */}
              {lesson.textContent && lesson.lessonType !== "quiz" && (
                <Card className="border-none shadow-md bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                      <FileText className="w-5 h-5 text-cyan-600" />
                      <h3 className="font-bold text-gray-900 text-lg">{t("lessonView.moreDetails")}</h3>
                    </div>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-line text-base">
                      {lesson.textContent}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : hasVideo ? (
            <div className="flex flex-col gap-6">
              {/* Video Player */}
              <div className="w-full max-w-4xl mx-auto">
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-3 shadow-xl">
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">
                      <Play className="w-3 h-3" /> {t("lessonView.video")}
                    </span>
                  </div>
                  {renderVideoPlayer()}
                  <div className="mt-3 flex items-center justify-between text-white/70 text-sm">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4" />
                      <span>{t("lessonView.listenWatch")}</span>
                    </div>
                    {lesson.duration && (
                      <span className="text-white/50">{lesson.duration}</span>
                    )}
                  </div>
                  {renderVideoProgress()}
                </div>
              </div>
              
              {/* Content Section - Below Video */}
              <div className="w-full max-w-4xl mx-auto space-y-6">

              {/* Video Warning */}
              {showVideoWarning && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <Lock className="w-5 h-5" />
                    <span className="font-medium">{t("lessonView.watch80Percent")}</span>
                  </div>
                </div>
              )}

              {/* Title and Description */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 font-display mb-2">{lesson.title}</h2>
                {lesson.description && (
                  <p className="text-gray-600">{lesson.description}</p>
                )}
              </div>

              {/* Text Content - Below Video (hide for quiz lessons since textContent is JSON) */}
              {lesson.textContent && lesson.lessonType !== "quiz" && (
                <Card className="border-none shadow-md bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                      <FileText className="w-5 h-5 text-cyan-600" />
                      <h3 className="font-bold text-gray-900 text-lg">{t("lessonView.readAfterVideo")}</h3>
                    </div>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-line text-base">
                      {lesson.textContent}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI-Generated Educational Images */}
              {lessonImages.length > 0 && (
                <Card className="border-none shadow-md bg-white mt-4">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                      <span className="text-purple-500">✨</span>
                      <h3 className="font-bold text-gray-900 text-lg">Sawirrada Casharkan</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {lessonImages.map((img: any) => (
                        <div key={img.id} className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                          <img 
                            src={img.imageUrl} 
                            alt={img.caption || "Sawir waxbarasho"} 
                            className="w-full h-48 object-cover"
                            data-testid={`lesson-image-${img.id}`}
                          />
                          {img.caption && (
                            <div className="p-3 text-sm text-gray-700 bg-white border-t border-gray-100">
                              {img.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Interactive Exercises */}
              {exercises.length > 0 && (
                <ExerciseRenderer
                  exercises={exercises}
                  lessonId={lessonId || ""}
                  existingProgress={exerciseProgress}
                />
              )}
              </div>
            </div>
          ) : lesson.lessonType === "sawirro" ? (
            /* Sawirro Lesson - Image-focused content */
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
                  <span>✨</span> Sawirro Waxbarasho
                </div>
                <h2 className="text-2xl font-bold text-gray-900 font-display mb-2">{lesson.title}</h2>
                {lesson.description && (
                  <p className="text-gray-600">{lesson.description}</p>
                )}
              </div>

              {/* Images Gallery */}
              {lessonImages.length > 0 ? (
                <div className="space-y-6">
                  {lessonImages.map((img: any, index: number) => (
                    <Card key={img.id} className="border-none shadow-lg overflow-hidden">
                      <img 
                        src={img.imageUrl} 
                        alt={img.caption || `Sawir ${index + 1}`} 
                        className="w-full h-auto max-h-[500px] object-contain bg-gray-50"
                        data-testid={`sawirro-image-${img.id}`}
                      />
                      {img.caption && (
                        <CardContent className="p-4 bg-gradient-to-r from-purple-50 to-pink-50">
                          <p className="text-gray-800 font-medium text-center">{img.caption}</p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">🖼️</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-700 mb-2">Sawirro ma jiraan</h3>
                    <p className="text-gray-500">Casharkan weli sawiro kuma jiraan.</p>
                  </CardContent>
                </Card>
              )}

              {/* Optional Text Content below images */}
              {lesson.textContent && (
                <Card className="mt-6 border-none shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                      <FileText className="w-5 h-5 text-cyan-600" />
                      <h3 className="font-bold text-gray-900 text-lg">Faahfaahin Dheeraad ah</h3>
                    </div>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {lesson.textContent}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Interactive Exercises for Sawirro lessons */}
              {exercises.length > 0 && (
                <ExerciseRenderer
                  exercises={exercises}
                  lessonId={lessonId || ""}
                  existingProgress={exerciseProgress}
                />
              )}
            </div>
          ) : (
            /* No Video - Just Content (or Audio lesson) */
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 font-display mb-4">{lesson.title}</h2>
              
              {lesson.description && (
                <p className="text-gray-600 mb-6">{lesson.description}</p>
              )}

              {/* Audio Player for Audio Lessons */}
              {(lesson as any).audioUrl && (
                <Card className="mb-6 border-none shadow-md bg-gradient-to-r from-teal-50 to-cyan-50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4 border-b border-teal-100 pb-3">
                      <Headphones className="w-5 h-5 text-teal-600" />
                      <h3 className="font-bold text-gray-900 text-lg">Dhageyso Casharka</h3>
                    </div>
                    <audio
                      controls
                      className="w-full"
                      src={(() => {
                        const url = (lesson as any).audioUrl;
                        if (url && url.includes('drive.google.com')) {
                          const match = url.match(/[-\w]{25,}/);
                          if (match) return `/api/tts-audio/${match[0]}`;
                        }
                        return url;
                      })()}
                      data-testid="audio-lesson-player"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Text Content (hide for quiz lessons since textContent is JSON) */}
              {lesson.textContent && lesson.lessonType !== "quiz" && (
                <Card className="mb-6 border-none shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                      <FileText className="w-5 h-5 text-cyan-600" />
                      <h3 className="font-bold text-gray-900 text-lg">{t("lessonView.readAfterVideo")}</h3>
                    </div>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {lesson.textContent}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI-Generated Educational Images for No-Video Lessons */}
              {lessonImages.length > 0 && (
                <Card className="mb-6 border-none shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                      <span className="text-purple-500">✨</span>
                      <h3 className="font-bold text-gray-900 text-lg">Sawirrada Casharkan</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {lessonImages.map((img: any) => (
                        <div key={img.id} className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                          <img 
                            src={img.imageUrl} 
                            alt={img.caption || "Sawir waxbarasho"} 
                            className="w-full h-48 object-cover"
                          />
                          {img.caption && (
                            <div className="p-3 text-sm text-gray-700 bg-white border-t border-gray-100">
                              {img.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quiz UI */}
              {isQuizLesson && renderQuiz()}
              
              {/* Show message for quiz lessons without valid questions */}
              {lesson.lessonType === "quiz" && !isQuizLesson && (
                <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 mb-6">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <HelpCircle className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-purple-900 mb-2">Su'aalaha Quiz-ka</h3>
                    <p className="text-purple-700">Su'aalaha weli ma diyaarsanayn. Fadlan sug.</p>
                  </CardContent>
                </Card>
              )}

              {/* Assignment Submission UI */}
              {isAssignment && (
                <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 mb-6">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <ClipboardList className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-orange-900">{t("lessonView.assignment")}</h3>
                        <p className="text-orange-700 text-sm">{t("lessonView.writeAndSubmit")}</p>
                      </div>
                    </div>

                    {lesson.assignmentRequirements && (
                      <div className="bg-white rounded-lg p-4 mb-4 border border-orange-200">
                        <p className="font-semibold text-gray-800 mb-2">{t("lessonView.requirements")}</p>
                        <p className="text-gray-700 whitespace-pre-line">{lesson.assignmentRequirements}</p>
                      </div>
                    )}

                    {myAssignment ? (
                      <div className="space-y-4">
                        <div className="bg-white rounded-lg p-4 border border-green-200">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="font-bold text-green-700">{t("lessonView.submitted")}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              myAssignment.status === "approved" ? "bg-green-100 text-green-700" :
                              myAssignment.status === "reviewed" ? "bg-blue-100 text-blue-700" :
                              "bg-yellow-100 text-yellow-700"
                            }`}>
                              {myAssignment.status === "approved" ? t("lessonView.approved") :
                               myAssignment.status === "reviewed" ? t("lessonView.reviewed") : t("lessonView.pending")}
                            </span>
                          </div>
                          <p className="text-gray-700">{myAssignment.content}</p>
                          {myAssignment.feedback && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="font-semibold text-gray-800">{t("lessonView.teacherFeedback")}</p>
                              <p className="text-gray-700">{myAssignment.feedback}</p>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 text-center">
                          {t("lessonView.editPrompt")}
                        </p>
                        <Textarea
                          placeholder={t("lessonView.writeNewAnswer")}
                          value={assignmentContent}
                          onChange={(e) => setAssignmentContent(e.target.value)}
                          rows={4}
                          className="bg-white"
                        />
                        <Button
                          onClick={() => submitAssignment.mutate(assignmentContent)}
                          disabled={!assignmentContent.trim() || submitAssignment.isPending}
                          className="w-full bg-orange-500 hover:bg-orange-600"
                        >
                          {submitAssignment.isPending ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("lessonView.sending")}</>
                          ) : (
                            <><Send className="w-4 h-4 mr-2" /> {t("lessonView.update")}</>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Textarea
                          placeholder={t("lessonView.writeAnswerHere")}
                          value={assignmentContent}
                          onChange={(e) => setAssignmentContent(e.target.value)}
                          rows={5}
                          className="bg-white"
                          data-testid="textarea-assignment"
                        />
                        <Button
                          onClick={() => submitAssignment.mutate(assignmentContent)}
                          disabled={!assignmentContent.trim() || submitAssignment.isPending}
                          className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-lg"
                          data-testid="button-submit-assignment"
                        >
                          {submitAssignment.isPending ? (
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {t("lessonView.sending")}</>
                          ) : (
                            <><Send className="w-5 h-5 mr-2" /> {t("lessonView.submitAnswer")}</>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Interactive Exercises for No-Video Lessons */}
              {exercises.length > 0 && !isQuiz && !isQuizLesson && (
                <ExerciseRenderer
                  exercises={exercises}
                  lessonId={lessonId || ""}
                  existingProgress={exerciseProgress}
                />
              )}

              {!isQuiz && !isQuizLesson && !isAssignment && !lesson.textContent && (
                <Card className="border-2 border-gray-200">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">{t("lessonView.noContent")}</h3>
                    <p className="text-gray-500">
                      {t("lessonView.noContentDesc")}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Scheduling Status for 0-6 course */}
          {courseSlug === "0-6" && schedulingStatus && hasAccess && (
            <div className={`mt-6 p-4 rounded-xl border ${schedulingStatus.canAccessLesson ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className={`w-5 h-5 ${schedulingStatus.canAccessLesson ? 'text-blue-600' : 'text-orange-600'}`} />
                  <div className="text-sm">
                    <p className={`font-medium ${schedulingStatus.canAccessLesson ? 'text-blue-800' : 'text-orange-800'}`}>
                      Maanta: {schedulingStatus.lessonsToday}/{schedulingStatus.maxPerDay} cashar
                    </p>
                    <p className={`${schedulingStatus.canAccessLesson ? 'text-blue-600' : 'text-orange-600'}`}>
                      Usbuucan: {schedulingStatus.lessonsThisWeek}/{schedulingStatus.maxPerWeek} cashar
                    </p>
                  </div>
                </div>
                {!schedulingStatus.canAccessLesson && (
                  <div className="text-right">
                    <p className="text-xs text-orange-600 font-medium">{schedulingStatus.reason}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mark Complete Button */}
          {hasAccess && !isLessonCompleted && (
            <div className="mt-6">
              <Button
                onClick={() => markComplete.mutate()}
                disabled={markComplete.isPending || (courseSlug === "0-6" && schedulingStatus && !schedulingStatus.canAccessLesson)}
                className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-mark-complete"
              >
                {markComplete.isPending ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {t("lessonView.registering")}</>
                ) : courseSlug === "0-6" && schedulingStatus && !schedulingStatus.canAccessLesson ? (
                  <><Lock className="w-5 h-5 mr-2" /> Waqti kale ku soo laabo</>
                ) : (
                  <><CheckCircle className="w-5 h-5 mr-2" /> {t("lessonView.completeLesson")}</>
                )}
              </Button>
            </div>
          )}

          {hasAccess && isLessonCompleted && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <span className="text-green-700 font-bold">{t("lessonView.lessonCompleted")}</span>
              </div>
              {isCourseFullyCompleted && (
                <div className="mt-3 pt-3 border-t border-green-200 space-y-2">
                  <p className="text-green-800 font-bold text-sm">🎓 Koorsada dhan waad dhamaysay! Hambalyo!</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-yellow-50 border-yellow-400 text-yellow-800 hover:bg-yellow-100"
                      onClick={() => {
                        setCelebration({
                          isOpen: true,
                          type: "course_complete",
                          title: t("lessonView.success"),
                          subtitle: course?.title || "",
                          description: t("lessonView.founderMessage"),
                        });
                      }}
                      data-testid="button-show-celebration"
                    >
                      🎉 Dabaaladga
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-blue-50 border-blue-400 text-blue-800 hover:bg-blue-100"
                      onClick={() => setLocation("/profile")}
                      data-testid="button-view-certificate"
                    >
                      📜 Shahaadada
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lesson Discussion Group */}
          {hasAccess && lessonId && (
            <div className="mt-6">
              <LessonDiscussionGroup lessonId={lessonId} />
            </div>
          )}

          {/* Navigation Buttons */}
          {isValidIndex && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between gap-4">
                {previousLesson ? (
                  <Link href={`/lesson/${previousLesson.id}`} className="flex-1">
                    <Button variant="outline" className="w-full h-12 flex items-center justify-center gap-2 px-6" data-testid="button-previous-lesson">
                      <ChevronLeft className="w-5 h-5" />
                      <span className="font-bold">{t("common.previous")}</span>
                    </Button>
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}
                
                {nextLesson ? (
                  <Button 
                    onClick={async () => {
                      if (!isLessonCompleted) {
                        // Wait for lesson to be marked complete before navigating
                        await new Promise<void>((resolve) => {
                          markComplete.mutate(undefined, {
                            onSuccess: () => resolve(),
                            onError: () => resolve() // Still navigate on error
                          });
                        });
                      }
                      setLocation(`/lesson/${nextLesson.id}`);
                    }}
                    disabled={markComplete.isPending}
                    className="flex-1 w-full h-12 flex items-center justify-center gap-2 px-6 bg-orange-500 hover:bg-orange-600" 
                    data-testid="button-next-lesson"
                  >
                    {markComplete.isPending ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /></>
                    ) : (
                      <>
                        <span className="font-bold">{t("common.next")}</span>
                        <ChevronRight className="w-5 h-5" />
                      </>
                    )}
                  </Button>
                ) : isLastLesson ? (
                  <Button 
                    onClick={async () => {
                      if (!isLessonCompleted) {
                        // Wait for lesson to be marked complete before navigating
                        await new Promise<void>((resolve) => {
                          markComplete.mutate(undefined, {
                            onSuccess: () => resolve(),
                            onError: () => resolve() // Still navigate on error
                          });
                        });
                      }
                      setLocation(`/course/${courseSlug}`);
                    }}
                    disabled={markComplete.isPending}
                    className="flex-1 w-full h-14 flex items-center justify-center gap-3 px-4 bg-green-500 hover:bg-green-600" 
                    data-testid="button-complete-course"
                  >
                    {markComplete.isPending ? (
                      <><Loader2 className="w-5 h-5 text-white animate-spin" /></>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 text-white" />
                        <span className="font-bold text-white">{t("lessonView.courseCompleted")}</span>
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
