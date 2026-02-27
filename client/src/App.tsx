import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { useBrowserLocation } from "@/hooks/useBrowserLocation";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ParentAuthProvider } from "@/contexts/ParentAuthContext";
import { NotificationModalProvider } from "@/contexts/NotificationModalContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { motion, AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RefreshCw, Loader2 } from "lucide-react";
import logoImage from "@assets/NEW_LOGO-BSU_1_1768990258338.png";
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
const BottomNav = lazy(() => import("@/components/BottomNav"));
const ChatSupport = lazy(() => import("@/components/ChatSupport"));
const NotFound = lazy(() => import("@/pages/not-found"));
const VoiceSpaces = lazy(() => import("@/components/VoiceSpaces").then(m => ({ default: m.VoiceSpaces })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center">
        <img src={logoImage} alt="Barbaarintasan Academy" className="w-20 h-20 mx-auto mb-4 animate-pulse" />
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Sug wax yar waa la dajinayaa...</p>
      </div>
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

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

const pageTransition = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.15
};

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
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            transition={pageTransition}
          >
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
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </motion.div>
        </AnimatePresence>
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

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ParentAuthProvider>
          <OfflineProvider>
            <NotificationModalProvider>
              <TooltipProvider>
                <WouterRouter hook={useBrowserLocation}>
                  <PullToRefresh />
                  <Analytics />
                  <Toaster />
                  <SonnerToaster position="top-center" richColors />
                  <Router />
                </WouterRouter>
              </TooltipProvider>
            </NotificationModalProvider>
          </OfflineProvider>
        </ParentAuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
