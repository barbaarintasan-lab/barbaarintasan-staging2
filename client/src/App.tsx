import { useState, useEffect, useCallback } from "react";
import { Switch, Route, Link, Router as WouterRouter } from "wouter";
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
import { RefreshCw } from "lucide-react";
import Home from "@/pages/Home";
import Courses from "@/pages/Courses";
import CourseDetail from "@/pages/CourseDetail";
import LessonView from "@/pages/LessonView";
import Quiz from "@/pages/Quiz";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";
import QuizCreator from "@/pages/QuizCreator";
import QuizPlayer from "@/pages/QuizPlayer";
import AssignmentView from "@/pages/AssignmentView";
import Testimonials from "@/pages/Testimonials";
import SubmitTestimonial from "@/pages/SubmitTestimonial";
import Calendar from "@/pages/Calendar";
import Milestones from "@/pages/Milestones";
import Badges from "@/pages/Badges";
import Resources from "@/pages/Resources";
import Community from "@/pages/Community";
import Events from "@/pages/Events";
import Assessment from "@/pages/Assessment";
import LearningPath from "@/pages/LearningPath";
import HomeworkHelper from "@/pages/HomeworkHelper";
import AiCaawiye from "@/pages/AiCaawiye";
import TarbiyaHelper from "@/pages/TarbiyaHelper";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Appointments from "@/pages/Appointments";
import Subscription from "@/pages/Subscription";
import Bookmarks from "@/pages/Bookmarks";
import Notifications from "@/pages/Notifications";
import GoldenMembership from "@/pages/GoldenMembership";
import Downloads from "@/pages/Downloads";
import MessengerPage from "@/pages/MessengerPage";
import TermsConditions from "@/pages/TermsConditions";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import CommunityGuidelines from "@/pages/CommunityGuidelines";
import Legal from "@/pages/Legal";
import Sheeko from "@/pages/Sheeko";
import ShareInfo from "@/pages/ShareInfo";
import Install from "@/pages/Install";
import Maaweelo from "@/pages/Maaweelo";
import Dhambaal from "@/pages/Dhambaal";
import ParentProfile from "@/pages/ParentProfile";
import Messages from "@/pages/Messages";
import ParentFeed from "@/pages/ParentFeed";
import ParentCommunityTerms from "@/pages/ParentCommunityTerms";
import LearningGroups from "@/pages/LearningGroups";
import MeetWatch from "@/pages/MeetWatch";
import BottomNav from "@/components/BottomNav";
import ChatSupport from "@/components/ChatSupport";
import NotFound from "@/pages/not-found";
import { Analytics } from "@/components/Analytics";
import { useLocation, useParams } from "wouter";
import { VoiceSpaces } from "@/components/VoiceSpaces";

function SheekoRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-background">
      <VoiceSpaces initialRoomId={roomId} />
    </div>
  );
}

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

const pageTransition = {
  type: "tween" as const,
  ease: "easeInOut" as const,
  duration: 0.2
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
  
  const showBottomNav = !location.includes("/lesson/") && !location.includes("/admin") && !location.includes("/assessment") && !location.includes("/share-info") && !location.includes("/maaweelo") && !location.includes("/dhambaal") && !location.includes("/waalid/feed") && !location.includes("/baraha") && location !== "/register" && location !== "/login" && location !== "/forgot-password" && !location.startsWith("/reset-password");

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
          </motion.div>
        </AnimatePresence>
      </div>
      {showBottomNav && <BottomNav />}
      <ChatSupport isOpen={isChatOpen} onOpenChange={setIsChatOpen} />
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
