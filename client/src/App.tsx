import { useState, useEffect, useCallback, lazy, Suspense, type ReactNode } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { useBrowserLocation } from "@/hooks/useBrowserLocation";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ParentAuthProvider, useParentAuth } from "@/contexts/ParentAuthContext";
import { NotificationModalProvider } from "@/contexts/NotificationModalContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { ChildAuthProvider } from "@/contexts/ChildAuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RefreshCw, Loader2, Plus, Users } from "lucide-react";
import { Analytics } from "@/components/Analytics";
import { useLocation, useParams } from "wouter";

const Home = lazy(() => import("@/pages/Home"));

const Courses = lazy(() => import("@/pages/Courses"));
const CourseDetail = lazy(() => import("@/pages/CourseDetail"));
const LessonView = lazy(() => import("@/pages/LessonView"));
const Quiz = lazy(() => import("@/pages/Quiz"));
const Profile = lazy(() => import("@/pages/Profile"));
const Admin = lazy(() => import("@/pages/Admin"));
const QuizCreator = lazy(() => import("@/pages/QuizCreator"));
const QuizPlayer = lazy(() => import("@/pages/QuizPlayer"));
const AssignmentView = lazy(() => import("@/pages/AssignmentView"));
const Testimonials = lazy(() => import("@/pages/Testimonials"));
const SubmitTestimonial = lazy(() => import("@/pages/SubmitTestimonial"));
const Calendar = lazy(() => import("@/pages/Calendar"));
const Milestones = lazy(() => import("@/pages/Milestones"));
const Badges = lazy(() => import("@/pages/Badges"));
const Resources = lazy(() => import("@/pages/Resources"));
const Community = lazy(() => import("@/pages/Community"));
const Events = lazy(() => import("@/pages/Events"));
const Assessment = lazy(() => import("@/pages/Assessment"));
const LearningPath = lazy(() => import("@/pages/LearningPath"));
const HomeworkHelper = lazy(() => import("@/pages/HomeworkHelper"));
const AiCaawiye = lazy(() => import("@/pages/AiCaawiye"));
const TarbiyaHelper = lazy(() => import("@/pages/TarbiyaHelper"));
const Register = lazy(() => import("@/pages/Register"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Appointments = lazy(() => import("@/pages/Appointments"));
const Subscription = lazy(() => import("@/pages/Subscription"));
const Bookmarks = lazy(() => import("@/pages/Bookmarks"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const GoldenMembership = lazy(() => import("@/pages/GoldenMembership"));
const Downloads = lazy(() => import("@/pages/Downloads"));
const MessengerPage = lazy(() => import("@/pages/MessengerPage"));
const TermsConditions = lazy(() => import("@/pages/TermsConditions"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const CommunityGuidelines = lazy(() => import("@/pages/CommunityGuidelines"));
const Legal = lazy(() => import("@/pages/Legal"));
const Sheeko = lazy(() => import("@/pages/Sheeko"));
const ShareInfo = lazy(() => import("@/pages/ShareInfo"));
const Install = lazy(() => import("@/pages/Install"));
const Maaweelo = lazy(() => import("@/pages/Maaweelo"));
const Dhambaal = lazy(() => import("@/pages/Dhambaal"));
const ParentProfile = lazy(() => import("@/pages/ParentProfile"));
const Messages = lazy(() => import("@/pages/Messages"));
const ParentFeed = lazy(() => import("@/pages/ParentFeed"));
const ParentCommunityTerms = lazy(() => import("@/pages/ParentCommunityTerms"));
const LearningGroups = lazy(() => import("@/pages/LearningGroups"));
const LearningHub = lazy(() => import("@/pages/LearningHub"));
const ParentTips = lazy(() => import("@/pages/ParentTips"));
const MeetWatch = lazy(() => import("@/pages/MeetWatch"));
const ChildLogin = lazy(() => import("@/pages/ChildLogin"));
const ChildDashboard = lazy(() => import("@/pages/ChildDashboard"));
const QuranFolders = lazy(() => import("@/pages/QuranFolders"));
const JuzFolder = lazy(() => import("@/pages/JuzFolder"));
const QuranLesson = lazy(() => import("@/pages/QuranLesson"));
const AlphabetFolders = lazy(() => import("@/pages/AlphabetFolders"));
const AlphabetLesson = lazy(() => import("@/pages/AlphabetLesson"));
const AlphabetGames = lazy(() => import("@/pages/AlphabetGames"));
const QuranWordPuzzle = lazy(() => import("@/pages/QuranWordPuzzle"));
const QuranMemoryMatch = lazy(() => import("@/pages/QuranMemoryMatch"));
const QuranSurahQuiz = lazy(() => import("@/pages/QuranSurahQuiz"));
const SomaliFlashcardsGame = lazy(() => import("@/pages/SomaliFlashcardsGame"));
const BottomNav = lazy(() => import("@/components/BottomNav"));
const ChatSupport = lazy(() => import("@/components/ChatSupport"));
const NotFound = lazy(() => import("@/pages/not-found"));
const VoiceSpaces = lazy(() => import("@/components/VoiceSpaces").then(m => ({ default: m.VoiceSpaces })));

const ONBOARDING_AVATAR_COLORS = ["#FFD93D", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"];

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );
}

function SheekoRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-background">
      <Suspense fallback={<PageLoader />}>
        <VoiceSpaces initialRoomId={roomId} />
      </Suspense>
    </div>
  );
}


function PullToRefresh() {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone = (window.navigator as any).standalone === true || 
                       window.matchMedia('(display-mode: standalone)').matches;
    setIsIOS(iOS);
    setIsStandalone(standalone);
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startY === 0 || window.scrollY > 0) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    
    if (diff > 0 && diff < 150) {
      setPullDistance(diff);
    }
  }, [startY]);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 80 && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(60);
      
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
      }
      
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      setPullDistance(0);
    }
    setStartY(0);
  }, [pullDistance, isRefreshing]);

  useEffect(() => {
    if (!isIOS || !isStandalone) return;
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isIOS, isStandalone, handleTouchStart, handleTouchMove, handleTouchEnd]);

  if (!isIOS || !isStandalone) return null;

  return (
    <>
      {pullDistance > 0 && (
        <div 
          className="fixed top-0 left-0 right-0 flex items-center justify-center z-[9999] bg-gradient-to-b from-indigo-500 to-transparent transition-all"
          style={{ height: pullDistance, paddingTop: Math.max(0, pullDistance - 40) }}
        >
          <RefreshCw 
            className={`w-6 h-6 text-white ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ 
              transform: `rotate(${pullDistance * 2}deg)`,
              opacity: Math.min(1, pullDistance / 60)
            }}
          />
        </div>
      )}
    </>
  );
}

function Router() {
  const [location] = useLocation();
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const hiddenNavPaths = [
    "/lesson/",
    "/admin",
    "/assessment",
    "/share-info",
    "/maaweelo",
    "/dhambaal",
    "/waalid/feed",
    "/baraha",
    "/reset-password",
    "/child-login",
    "/child-dashboard",
    "/quran-folders",
    "/quran-juz",
    "/quran-lesson",
    "/alphabet-folders",
    "/alphabet-lesson",
    "/alphabet-games",
    "/quran-game/",
  ];
  
  const hiddenNavExactPaths = [
    "/register",
    "/login",
    "/forgot-password",
  ];
  
  const showBottomNav = 
    !hiddenNavPaths.some(path => location.includes(path)) &&
    !hiddenNavExactPaths.includes(location);

  return (
    <div className="bg-gradient-to-b from-blue-100 via-blue-50 to-blue-100 min-h-screen flex flex-col lg:items-center font-semibold">
      <div className="flex-1 w-full lg:max-w-[672px] lg:mx-auto bg-gradient-to-b from-blue-50 via-blue-50 to-blue-100 lg:shadow-xl min-h-screen">
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/courses" component={Courses} />
            <Route path="/course/:id" component={CourseDetail} />
            <Route path="/lesson/:id" component={LessonView} />
            <Route path="/quiz" component={Quiz} />
            <Route path="/quiz/:quizId" component={QuizPlayer} />
            <Route path="/assignment/:id" component={AssignmentView} />
            <Route path="/testimonials" component={Testimonials} />
            <Route path="/submit-testimonial" component={SubmitTestimonial} />
            <Route path="/calendar" component={Calendar} />
            <Route path="/milestones" component={Milestones} />
            <Route path="/badges" component={Badges} />
            <Route path="/resources" component={Resources} />
            <Route path="/community" component={Community} />
            <Route path="/events" component={Events} />
            <Route path="/assessment" component={Assessment} />
            <Route path="/learning-path" component={LearningPath} />
            <Route path="/homework-helper" component={HomeworkHelper} />
            <Route path="/ai-caawiye" component={AiCaawiye} />
            <Route path="/tarbiya-helper" component={TarbiyaHelper} />
            <Route path="/register" component={Register} />
            <Route path="/login" component={Register} />
            <Route path="/forgot-password" component={ForgotPassword} />
            <Route path="/reset-password/:token" component={ResetPassword} />
            <Route path="/profile" component={Profile} />
            <Route path="/admin" component={Admin} />
            <Route path="/admin/quiz/:lessonId" component={QuizCreator} />
            <Route path="/appointments" component={Appointments} />
            <Route path="/subscription" component={Subscription} />
            <Route path="/bookmarks" component={Bookmarks} />
            <Route path="/notifications" component={Notifications} />
            <Route path="/downloads" component={Downloads} />
            <Route path="/golden-membership" component={GoldenMembership} />
            <Route path="/learning-hub" component={LearningHub} />
            <Route path="/parent-tips" component={ParentTips} />
            <Route path="/messenger" component={MessengerPage} />
            <Route path="/sheeko" component={Sheeko} />
            <Route path="/sheeko/:roomId" component={SheekoRoom} />
            <Route path="/maaweelo" component={Maaweelo} />
            <Route path="/dhambaal" component={Dhambaal} />
            <Route path="/parent/:id" component={ParentProfile} />
            <Route path="/messages" component={Messages} />
            <Route path="/messages/:partnerId" component={Messages} />
            <Route path="/waalid/feed" component={ParentFeed} />
            <Route path="/baraha" component={ParentFeed} />
            <Route path="/groups" component={LearningGroups} />
            <Route path="/meet-watch/:id" component={MeetWatch} />
            <Route path="/parent-community-terms" component={ParentCommunityTerms} />
            <Route path="/terms" component={TermsConditions} />
            <Route path="/privacy-policy" component={PrivacyPolicy} />
            <Route path="/community-guidelines" component={CommunityGuidelines} />
            <Route path="/legal" component={Legal} />
            <Route path="/share-info" component={ShareInfo} />
            <Route path="/install" component={Install} />
            <Route path="/child-login" component={ChildLogin} />
            <Route path="/child-dashboard" component={ChildDashboard} />
            <Route path="/quran-folders" component={QuranFolders} />
            <Route path="/quran-juz/:juzNum" component={JuzFolder} />
            <Route path="/quran-lesson/:surahNumber" component={QuranLesson} />
            <Route path="/alphabet-folders" component={AlphabetFolders} />
            <Route path="/alphabet-lesson/:letterId" component={AlphabetLesson} />
            <Route path="/alphabet-lesson" component={AlphabetLesson} />
            <Route path="/alphabet-games" component={AlphabetGames} />
            <Route path="/quran-game/word-puzzle/:surahNumber" component={QuranWordPuzzle} />
            <Route path="/quran-game/memory-match/:surahNumber" component={QuranMemoryMatch} />
            <Route path="/quran-game/surah-quiz/:surahNumber" component={QuranSurahQuiz} />
            <Route path="/quran-game/somali-flashcards/:surahNumber" component={SomaliFlashcardsGame} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </div>
      {showBottomNav && (
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <ChatSupport isOpen={isChatOpen} onOpenChange={setIsChatOpen} />
      </Suspense>
    </div>
  );
}

function ParentOnboardingGate({ children }: { children: ReactNode }) {
  const { parent, isLoading } = useParentAuth();
  const [isCheckingChildren, setIsCheckingChildren] = useState(false);
  const [childrenCount, setChildrenCount] = useState<number | null>(null);
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [childPassword, setChildPassword] = useState("");
  const [childPasswordConfirm, setChildPasswordConfirm] = useState("");
  const [isCreatingChild, setIsCreatingChild] = useState(false);
  const [createError, setCreateError] = useState("");

  const loadChildren = useCallback(async () => {
    if (!parent || parent.isAdmin) {
      setChildrenCount(1);
      return;
    }

    setIsCheckingChildren(true);
    try {
      const response = await fetch("/api/children", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load children");
      const data = await response.json();
      setChildrenCount(Array.isArray(data) ? data.length : 0);
    } catch {
      setChildrenCount(1);
    } finally {
      setIsCheckingChildren(false);
    }
  }, [parent]);

  useEffect(() => {
    if (isLoading) return;
    if (!parent) {
      setChildrenCount(null);
      return;
    }
    loadChildren();
  }, [parent, isLoading, loadChildren]);

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childName.trim() || !childAge.trim() || !childPassword.trim() || !childPasswordConfirm.trim()) {
      setCreateError("Buuxi dhammaan xogta ilmaha.");
      return;
    }
    const parsedAge = Number.parseInt(childAge, 10);
    if (!Number.isInteger(parsedAge) || parsedAge < 1) {
      setCreateError("Fadlan geli da' sax ah.");
      return;
    }
    if (childPassword !== childPasswordConfirm) {
      setCreateError("Labada password isma laha.");
      return;
    }

    setCreateError("");
    setIsCreatingChild(true);

    try {
      const response = await fetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: childName.trim(),
          age: parsedAge,
          password: childPassword,
          passwordConfirm: childPasswordConfirm,
          avatarColor: ONBOARDING_AVATAR_COLORS[Math.floor(Math.random() * ONBOARDING_AVATAR_COLORS.length)],
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Ilmaha lama samayn karin.");
      }

      setChildName("");
      setChildAge("");
      setChildPassword("");
      setChildPasswordConfirm("");
      setChildrenCount(1);
    } catch (error: any) {
      setCreateError(error?.message || "Ilmaha lama samayn karin.");
    } finally {
      setIsCreatingChild(false);
    }
  };

  if (!parent || parent.isAdmin) {
    return <>{children}</>;
  }

  if (isLoading || isCheckingChildren || childrenCount === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1a2e]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FFD93D]" />
      </div>
    );
  }

  if (childrenCount > 0) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a1a2e] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm">
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD93D] to-[#FFA502] text-[#1a1a2e]">
            <Users className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-white">Ku dar ilmahaaga</h2>
          <p className="mt-2 text-sm text-white/90">
            Kahor inta aadan app-ka sii galin, fadlan u samee ilmahaaga akoon si uu Aabka Quraanka iyo Af-Soomaaliga uga barto.
          </p>
        </div>

        <form onSubmit={handleCreateChild} className="space-y-3">
          <input
            type="text"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="Magaca ilmaha"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#FFD93D]"
          />
          <input
            type="text"
            inputMode="numeric"
            value={childAge}
            onChange={(e) => setChildAge(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="Da'da ilmaha ku qor halka"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#FFD93D]"
          />
          <input
            type="password"
            value={childPassword}
            onChange={(e) => setChildPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#FFD93D]"
          />
          <input
            type="Lambar Sir ah oo fudud u samee ilmaha"
            value={childPasswordConfirm}
            onChange={(e) => setChildPasswordConfirm(e.target.value)}
            placeholder="Ku celi mar kale isla lambarkii Sirta ahaa"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#FFD93D]"
          />

          {createError && <p className="text-sm font-medium text-red-300">{createError}</p>}

          <button
            type="submit"
            disabled={isCreatingChild}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFD93D] to-[#FFA502] px-4 py-3 font-bold text-[#1a1a2e] disabled:opacity-60"
          >
            {isCreatingChild ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Ilmaha ku dar oo Gal Aabka
          </button>
        </form>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ParentAuthProvider>
          <ChildAuthProvider>
            <OfflineProvider>
              <NotificationModalProvider>
                <TooltipProvider>
                  <WouterRouter hook={useBrowserLocation}>
                    <PullToRefresh />
                    <Analytics />
                    <Toaster />
                    <SonnerToaster position="top-center" richColors />
                    <ParentOnboardingGate>
                      <Router />
                    </ParentOnboardingGate>
                  </WouterRouter>
                </TooltipProvider>
              </NotificationModalProvider>
            </OfflineProvider>
          </ChildAuthProvider>
        </ParentAuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
