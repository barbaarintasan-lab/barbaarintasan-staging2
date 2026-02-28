import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { openSSOLink } from "@/lib/api";
import { PlayCircle, FileText, HelpCircle, ChevronLeft, ChevronDown, ChevronUp, Lock, CheckCircle, Video, ClipboardList, Calendar, Loader2, Star, Download, Users, ChevronRight } from "lucide-react";
import CourseMindMap from "@/components/CourseMindMap";
import { Textarea } from "@/components/ui/textarea";
import { Link, useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useOfflineDownloads } from "@/hooks/useOfflineDownloads";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/hooks/useLanguage";


export default function CourseDetail() {
  const { t } = useTranslation();
  const { apiLanguage } = useLanguage();
  const [, params] = useRoute("/course/:id");
  const [, setLocation] = useLocation();
  const courseId = params?.id;
  const [expandedModules, setExpandedModules] = useState<number[]>([1]);

  const queryClient = useQueryClient();

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}?lang=${apiLanguage}`);
      if (!res.ok) throw new Error("Course not found");
      return res.json();
    },
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons", course?.id],
    queryFn: async () => {
      if (!course?.id) return [];
      const res = await fetch(`/api/lessons?courseId=${course.id}&lang=${apiLanguage}`);
      return res.json();
    },
    enabled: !!course?.id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: courseQuizzes = [] } = useQuery({
    queryKey: ["courseQuizzes", course?.id],
    queryFn: async () => {
      if (!course?.id) return [];
      const res = await fetch(`/api/courses/${course.id}/quizzes?lang=${apiLanguage}`);
      return res.json();
    },
    enabled: !!course?.id,
  });

  const { data: courseAssignments = [] } = useQuery({
    queryKey: ["courseAssignments", course?.id],
    queryFn: async () => {
      if (!course?.id) return [];
      const res = await fetch(`/api/courses/${course.id}/assignments`);
      return res.json();
    },
    enabled: !!course?.id,
  });

  const { parent, isLoading: parentLoading } = useParentAuth();
  const isLoggedIn = !!parent;

  const { isOnline } = useOffline();
  const { 
    isCourseDownloaded, 
    getCourseDownloadProgress, 
    downloadCourse, 
    isDownloading,
    downloadQueue
  } = useOfflineDownloads();
  const [isDownloadingCourse, setIsDownloadingCourse] = useState(false);

  const isProfileComplete = useMemo(() => {
    if (!parent) return false;
    return !!(parent.name && parent.phone && parent.email);
  }, [parent]);

  const { data: accessInfo } = useQuery({
    queryKey: ["courseAccess", course?.id],
    queryFn: async () => {
      const res = await fetch(`/api/course/${course.id}/access`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to check access");
      return res.json();
    },
    enabled: !!course?.id,
  });

  const hasAccess = accessInfo?.hasAccess === true;

  const { data: lessonProgress = [] } = useQuery({
    queryKey: ["lessonProgress", course?.id],
    queryFn: async () => {
      if (!course?.id) return [];
      const res = await fetch(`/api/parent/course/${course.id}/progress`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!course?.id && isLoggedIn,
  });

  const { data: reviewsData, refetch: refetchReviews } = useQuery({
    queryKey: ["courseReviews", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/reviews`);
      if (!res.ok) return { reviews: [], average: 0, count: 0 };
      return res.json();
    },
    enabled: !!courseId,
  });

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");

  const submitReview = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rating: reviewRating, review: reviewText }),
      });
      if (!res.ok) throw new Error("Failed to submit review");
      return res.json();
    },
    onSuccess: () => {
      toast.success(t("courseDetail.reviewThankYou"));
      setShowReviewModal(false);
      setReviewText("");
      refetchReviews();
    },
    onError: () => {
      toast.error(t("courseDetail.reviewError"));
    },
  });

  if (courseLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{t("courseDetail.courseNotFound")}</p>
          <Link href="/courses">
            <Button>{t("lesson.backToCourse")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!course.contentReady) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b sticky top-0 z-10 px-4 py-3">
          <Link href="/courses">
            <button className="flex items-center text-gray-600 hover:text-gray-900">
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">{t("lesson.backToCourse")}</span>
            </button>
          </Link>
        </div>

        <div className="flex items-center justify-center min-h-[80vh] p-4">
          <Dialog open={true} onOpenChange={() => {}}>
            <DialogContent className="max-w-md bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 border-0 text-white rounded-3xl p-0 overflow-hidden">
              <div className="p-8 text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L13.09 8.26L18 7L14.74 11.09L21 13L14.74 12.91L18 17L13.09 15.74L12 22L10.91 15.74L6 17L9.26 12.91L3 13L9.26 11.09L6 7L10.91 8.26L12 2Z" />
                    </svg>
                  </div>
                </div>

                <DialogTitle className="text-2xl font-bold text-white">
                  Koorsadan Waa Soo Socotaa!
                </DialogTitle>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white">{course.title}</h3>
                  <p className="text-white/90 text-lg">
                    {course.comingSoonMessage || "Sanadka 2026 bilihiisa dambe ayey diyaar noqonaysaa ee la soco!"}
                  </p>
                </div>

                <div className="bg-white/20 rounded-2xl p-4 text-white/90">
                  <p className="text-sm leading-relaxed">
                    Waalidka qaaliga ah, waanu kugu faraxsanahay inaad nala joogto. Koorsooyin badan oo cusub ayaa soo socda - sug oo la soco wararkooda!
                  </p>
                </div>

                <Link href="/courses">
                  <Button className="w-full bg-white text-purple-600 hover:bg-white/90 font-bold py-6 rounded-xl text-lg">
                    Waa Hagaag, Waan Sugayaa
                  </Button>
                </Link>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  const lessonsWithExtras = [...lessons].map((lesson: any) => ({
    ...lesson,
    type: "lesson"
  }));
  
  lessonsWithExtras.sort((a: any, b: any) => {
    if ((a.moduleNumber || 1) !== (b.moduleNumber || 1)) {
      return (a.moduleNumber || 1) - (b.moduleNumber || 1);
    }
    return (a.order || 0) - (b.order || 0);
  });

  const groupedLessons = lessonsWithExtras.reduce((acc: any, lesson: any) => {
    const moduleNum = lesson.moduleNumber || 1;
    if (!acc[moduleNum]) acc[moduleNum] = [];
    acc[moduleNum].push(lesson);
    return acc;
  }, {});

  const moduleNames: { [key: number]: string } = {
    1: course.courseId === "0-6-bilood" ? "Koorsada 0-6 Bilood jirka BISHA KOWAAD" : "HORDHACA: Koorsada Ilmo Is-Dabira oo Isku-Filan",
    2: course.courseId === "0-6-bilood" ? "Koorsada 0-6 Bilood jirka BISHA LABAAD" : "DHEXDA: Koorsada Ilmo Is-Dabira oo isku Filan",
    3: course.courseId === "0-6-bilood" ? "Koorsada 0-6 Bilood jirka BISHA SADDEXAAD" : "GABAGABADA: Koorsada Ilmo Is-Dabira oo isku Filan",
    4: "Koorsada 0-6 Bilood jirka BISHA AFRAAD",
    5: "Koorsada 0-6 Bilood jirka BISHA SHANAAD",
    6: "Koorsada 0-6 Bilood jirka BISHA LIXAAD",
  };

  const toggleModule = (moduleNum: number) => {
    setExpandedModules(prev => 
      prev.includes(moduleNum) 
        ? prev.filter(m => m !== moduleNum)
        : [...prev, moduleNum]
    );
  };

  const getLessonIcon = (lesson: any) => {
    if (lesson.type === "quiz") {
      return <HelpCircle className="w-5 h-5 text-purple-600" />;
    }
    if (lesson.type === "assignment") {
      return <ClipboardList className="w-5 h-5 text-orange-600" />;
    }
    
    const lessonType = lesson.lessonType || "video";
    
    if (lessonType === "quiz") {
      return <HelpCircle className="w-5 h-5 text-purple-600" />;
    }
    if (lessonType === "assignment") {
      return <ClipboardList className="w-5 h-5 text-orange-600" />;
    }
    if (lessonType === "live" || lesson.isLive) {
      return <Calendar className="w-5 h-5 text-red-600" />;
    }
    if (lessonType === "text") {
      return <FileText className="w-5 h-5 text-blue-600" />;
    }
    if (lessonType === "video" || lesson.videoUrl) {
      return <Video className="w-5 h-5 text-green-600" />;
    }
    return <FileText className="w-5 h-5 text-blue-600" />;
  };

  const getLessonTypeLabel = (lesson: any) => {
    if (lesson.type === "quiz") return "Su'aalo";
    if (lesson.type === "assignment") return "Hawlgal";
    
    const lessonType = lesson.lessonType || "video";
    switch (lessonType) {
      case "video": return "Video";
      case "text": return "Qoraal";
      case "quiz": return "Su'aalo";
      case "assignment": return "Hawlgal";
      case "live": return "LIVE";
      default: return "Cashar";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8 font-body">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4 lg:px-8">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-gray-900 font-display line-clamp-1">{t("courseDetail.courseInfo")}</h1>
        </div>
      </header>

      {/* Course Hero */}
      <div className="bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 px-4 py-8 border-b border-sky-100 lg:px-8 lg:py-12">
        <div className="max-w-4xl mx-auto lg:text-center">
          <div className="flex items-center gap-1 mb-3">
            {[1,2,3,4,5].map(i => (
              <Star 
                key={i} 
                className={`w-5 h-5 ${i <= Math.round(reviewsData?.average || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
              />
            ))}
            <span className="text-gray-500 text-sm ml-2">
              ({reviewsData?.count || 0} {reviewsData?.count === 1 ? t("courseDetail.rating") : t("courseDetail.ratings")})
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{course.title}</h1>
          <p className="text-gray-600 leading-relaxed">{course.description}</p>
        </div>
      </div>

      {/* Access Banner for enrolled users */}
      {hasAccess && (
        <section className="px-4 py-6 bg-green-500">
          <div className="max-w-md mx-auto text-center">
            <div className="inline-flex items-center gap-3 bg-white/20 rounded-full px-6 py-3 mb-3">
              <CheckCircle className="w-6 h-6 text-white" />
              <span className="text-white font-bold text-lg">{t("courseDetail.courseOpen")}</span>
            </div>
            <p className="text-green-100 text-sm">{t("courseDetail.clickToStart")}</p>
            
            {/* Offline Download Button */}
            {course && lessons.length > 0 && (
              <div className="mt-4">
                {isCourseDownloaded(course.id) ? (
                  <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 text-white text-sm">
                    <CheckCircle className="w-4 h-4" />
                    {t("courseDetail.availableOffline") || "La keydiyey Offline"}
                  </div>
                ) : isDownloadingCourse || downloadQueue.some(q => q.courseId === course.id) ? (
                  <div className="inline-flex flex-col items-center gap-2 bg-white/20 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 text-white text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("courseDetail.downloading") || "Waa la soo dejinayaa..."}
                    </div>
                    <Progress value={getCourseDownloadProgress(course.id)} className="h-2 w-32 bg-white/30" />
                  </div>
                ) : (
                  <Button
                    onClick={async () => {
                      if (!isOnline) {
                        toast.error(t("courseDetail.needInternetToDownload") || "Waxaad u baahan tahay internet si aad u soo dejiso");
                        return;
                      }
                      setIsDownloadingCourse(true);
                      try {
                        await downloadCourse(course, lessons);
                        toast.success(t("courseDetail.downloadComplete") || "Casharrada waa la soo dejiyey!");
                      } catch (error) {
                        toast.error(t("courseDetail.downloadError") || "Wax qalad ah ayaa dhacay");
                      } finally {
                        setIsDownloadingCourse(false);
                      }
                    }}
                    disabled={!isOnline}
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                    data-testid="button-download-course"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {t("courseDetail.downloadForOffline") || "Soo Dejiso Offline"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* CTA Section - Only show if user doesn't have access */}
      {!hasAccess && (
        <section className="px-4 py-8 bg-white">
          <div className="max-w-md mx-auto">
            {isLoggedIn ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
                  <span className="text-3xl">🌐</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">Casharada Oo Dhan Ka Arag</h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Si aad casharada oo dhan u aragto, booqo websaydhkeena barbaarintasan.com
                </p>
                <button 
                  onClick={openSSOLink}
                  className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-bold px-8 py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all text-lg flex items-center gap-3 mx-auto"
                  data-testid="button-visit-website"
                >
                  🌐 Booqo barbaarintasan.com
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{t("courseDetail.loginWithGmail")}</h2>
                <p className="text-gray-600 mb-6">{t("courseDetail.loginToViewCourse")}</p>
                <Link href="/register">
                  <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-3 rounded-xl flex items-center gap-2 shadow-lg active:scale-[0.98] transition-all mx-auto" data-testid="button-register">
                    {t("auth.register")}
                  </button>
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Course Mind Map */}
      {isLoggedIn && lessons.length > 0 && (
        <section className="px-4 py-6 bg-white border-t border-gray-100">
          <div className="max-w-4xl mx-auto">
            <CourseMindMap 
              lessons={lessons}
              lessonProgress={lessonProgress}
              hasAccess={hasAccess}
              courseId={course.courseId}
            />
          </div>
        </section>
      )}

      {/* Group Discussion Link */}
      <section className="px-4 py-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <button
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 border-0 rounded-xl p-4 cursor-pointer transition-all active:scale-[0.98] shadow-lg shadow-indigo-200"
            onClick={async () => {
              const courseGroupMap: Record<string, string> = {
                "02eec0ad-c335-4756-9b94-861117bfb058": "a58cb8d0-1570-40b2-a13a-9fb2d42f18e0",
                "fde44d06-e012-4eab-867f-59d52e312453": "e90c36cf-0793-4079-9d43-57f4bce38a1e",
              };
              const groupId = course?.id ? courseGroupMap[course.id] : null;
              if (groupId) {
                try {
                  await fetch(`/api/groups/${groupId}/join`, {
                    method: "POST",
                    credentials: "include",
                  });
                } catch {}
                setLocation(`/groups?group=${groupId}`);
              } else {
                setLocation("/groups");
              }
            }}
            data-testid="link-course-group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-bold text-sm">Ku Biir Guruubka lagu falanqeeyo Casharkan</p>
                <p className="text-indigo-100 text-xs">Waalidiinta kale la wadaag fikradahaaga</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/80" />
            </div>
          </button>
        </div>
      </section>

      {/* Course Curriculum */}
      <section className="px-4 py-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">{t("courseDetail.courseLessons")} {course.title}</h2>
          
          <div className="space-y-4">
            {Object.keys(groupedLessons).map((moduleKey) => {
              const moduleNum = parseInt(moduleKey);
              const moduleLessons = groupedLessons[moduleNum] || [];
              const isExpanded = expandedModules.includes(moduleNum);

              return (
                <Card key={moduleNum} className="border-0 shadow-lg overflow-hidden">
                  <button
                    onClick={() => toggleModule(moduleNum)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
                    data-testid={`button-module-${moduleNum}`}
                  >
                    <h3 className="text-orange-600 font-bold text-left">{moduleNames[moduleNum] || `Module ${moduleNum}`}</h3>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-orange-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-orange-600" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {moduleLessons.map((lesson: any, index: number) => {
                        const lessonNumber = Object.keys(groupedLessons)
                          .slice(0, Object.keys(groupedLessons).indexOf(moduleKey))
                          .reduce((sum, key) => sum + (groupedLessons[parseInt(key)]?.length || 0), 0) + index + 1;
                        
                        const linkPath = lesson.type === "quiz" 
                          ? `/quiz/${lesson.quizId}` 
                          : lesson.type === "assignment"
                          ? `/assignment/${lesson.assignmentId}`
                          : `/lesson/${lesson.id}`;
                        
                        const isQuizItem = lesson.type === "quiz";
                        const isAssignmentItem = lesson.type === "assignment";
                        
                        const LIVE_COURSE_IDS = [
                          '02eec0ad-c335-4756-9b94-861117bfb058',
                          'fde44d06-e012-4eab-867f-59d52e312453'
                        ];
                        const UNLOCK_DATE = new Date('2026-02-07T00:00:00');
                        const isLiveCourse = LIVE_COURSE_IDS.includes(course?.id || '');
                        const lessonOrder = typeof lesson.order === 'number' ? lesson.order : 999;
                        const isTimeLocked = isLiveCourse && lessonOrder >= 20 && new Date() < UNLOCK_DATE;
                        
                        const isFreeTrial = lesson.isFree === true || lessonNumber <= 5;
                        
                        const isLessonAccessible = (hasAccess && !isTimeLocked) || isFreeTrial;
                        
                        const isLessonDone = lessonProgress.some((p: any) => p.lessonId === lesson.id && p.completed);
                        
                        const handleLessonClick = (e: React.MouseEvent) => {
                          if (isTimeLocked && hasAccess) {
                            e.preventDefault();
                            toast.info("Casharkaan wuxuu furmi doonaa 7.2.2026", { duration: 3000 });
                          } else if (!hasAccess && !isFreeTrial) {
                            e.preventDefault();
                            toast.info("Si aad casharada oo dhan u aragto, booqo barbaarintasan.com", { duration: 5000 });
                          }
                        };
                        
                        return (
                        <Link key={lesson.id} href={isLessonAccessible ? linkPath : '#'} onClick={handleLessonClick}>
                          <div 
                            className={`px-6 py-4 flex items-center gap-4 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer ${isLessonDone ? 'bg-green-50' : isQuizItem ? 'bg-purple-50' : isAssignmentItem ? 'bg-orange-50' : 'bg-white'} ${isTimeLocked && hasAccess ? 'opacity-60' : ''}`}
                            data-testid={`lesson-${lesson.id}`}
                          >
                            <span className={`w-7 h-7 rounded-full ${isLessonDone ? 'bg-green-500 text-white' : isQuizItem ? 'bg-purple-100 text-purple-600' : isAssignmentItem ? 'bg-orange-100 text-orange-600' : 'bg-white border-2 border-gray-300 text-gray-600'} text-sm font-bold flex items-center justify-center flex-shrink-0`}>
                              {isLessonDone ? '✓' : lessonNumber}
                            </span>
                            {getLessonIcon(lesson)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  lesson.lessonType === 'video' || (!lesson.lessonType && lesson.videoUrl) ? 'bg-green-100 text-green-700' :
                                  lesson.lessonType === 'text' ? 'bg-blue-100 text-blue-700' :
                                  lesson.lessonType === 'quiz' || lesson.type === 'quiz' ? 'bg-purple-100 text-purple-700' :
                                  lesson.lessonType === 'assignment' || lesson.type === 'assignment' ? 'bg-orange-100 text-orange-700' :
                                  lesson.lessonType === 'live' || lesson.isLive ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {getLessonTypeLabel(lesson)}
                                </span>
                                {isFreeTrial && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                    ✨ Tijaabi oo Arag
                                  </span>
                                )}
                                {isTimeLocked && hasAccess && (
                                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                                    Furmi: 7.2.2026
                                  </span>
                                )}
                              </div>
                              <p className={`font-medium line-clamp-2 ${isQuizItem ? 'text-purple-900' : 'text-gray-900'}`}>{lesson.title}</p>
                            </div>
                            {lesson.duration && (
                              <span className="text-gray-400 text-sm flex-shrink-0">{lesson.duration}</span>
                            )}
                            {isLessonDone ? (
                              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                            ) : isLessonAccessible ? (
                              <PlayCircle className={`w-5 h-5 ${isQuizItem ? 'text-purple-500' : 'text-green-500'} flex-shrink-0`} />
                            ) : isTimeLocked && hasAccess ? (
                              <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            ) : (
                              <Lock className="w-4 h-4 text-gray-300 flex-shrink-0" />
                            )}
                          </div>
                        </Link>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="px-4 py-8 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{t("courseDetail.viewParentReviews")}</h2>
            {hasAccess && isLoggedIn && (
              <Button 
                onClick={() => setShowReviewModal(true)}
                variant="outline"
                className="text-blue-600 border-blue-200"
                data-testid="button-write-review"
              >
                <Star className="w-4 h-4 mr-2" />
                {t("courseDetail.writeReview")}
              </Button>
            )}
          </div>
          
          {reviewsData?.reviews?.length > 0 ? (
            <div className="space-y-4">
              {reviewsData.reviews.slice(0, 5).map((review: any) => (
                <Card key={review.id} className="border border-gray-100">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {review.parentPicture ? (
                          <img src={review.parentPicture} alt={review.parentName} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          review.parentName?.charAt(0) || 'W'
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900">{review.parentName}</p>
                          <div className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map(i => (
                              <Star 
                                key={i} 
                                className={`w-4 h-4 ${i <= review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                        </div>
                        {review.review && (
                          <p className="text-gray-600 mt-2 text-sm">{review.review}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{t("courseDetail.noReviewsYet")}</p>
              {hasAccess && isLoggedIn && (
                <Button 
                  onClick={() => setShowReviewModal(true)}
                  className="mt-4 bg-blue-600 hover:bg-blue-700"
                >
                  {t("courseDetail.beFirst")}
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{t("courseDetail.writeYourReview")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">{t("courseDetail.starsRating")}</Label>
              <div className="flex items-center gap-2">
                {[1,2,3,4,5].map(i => (
                  <button 
                    key={i} 
                    onClick={() => setReviewRating(i)}
                    className="focus:outline-none"
                    data-testid={`star-${i}`}
                  >
                    <Star 
                      className={`w-8 h-8 cursor-pointer transition-all ${i <= reviewRating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 hover:text-yellow-300'}`} 
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="review-text" className="mb-2 block">{t("courseDetail.yourReviewOptional")}</Label>
              <Textarea
                id="review-text"
                placeholder={t("courseDetail.reviewPlaceholder")}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="min-h-[100px]"
                data-testid="textarea-review"
              />
            </div>
            <Button 
              onClick={() => submitReview.mutate()}
              disabled={submitReview.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
              data-testid="button-submit-review"
            >
              {submitReview.isPending ? t("courseDetail.submitting") : t("courseDetail.submitReview")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
