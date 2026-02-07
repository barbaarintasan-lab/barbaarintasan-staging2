import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayCircle, FileText, HelpCircle, ChevronLeft, ChevronDown, ChevronUp, Lock, CheckCircle, Phone, CreditCard, Upload, X, Image, Video, ClipboardList, Calendar, Loader2, Star, Map, AlertTriangle, Download, Wifi, WifiOff, Users, ChevronRight } from "lucide-react";
import CourseMindMap from "@/components/CourseMindMap";
import { Textarea } from "@/components/ui/textarea";
import { Link, useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useMemo } from "react";
import { useUpload } from "@/hooks/use-upload";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useOfflineDownloads } from "@/hooks/useOfflineDownloads";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
// PayPal integration available but currently disabled - backend routes preserved for future use


type PlanType = "monthly" | "yearly" | "one-time";

// Default prices as fallback (in dollars)
const defaultPrices: Record<PlanType, number> = {
  monthly: 30,
  yearly: 114,
  "one-time": 99,
};


export default function CourseDetail() {
  const { t } = useTranslation();
  const [, params] = useRoute("/course/:id");
  const [, setLocation] = useLocation();
  const courseId = params?.id;
  const [expandedModules, setExpandedModules] = useState<number[]>([1]);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("yearly");
  const [showMonthlyWarning, setShowMonthlyWarning] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<"paypal" | "manual" | "stripe" | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
  });
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [receiptValidation, setReceiptValidation] = useState<{
    validating: boolean;
    valid: boolean | null;
    error: string | null;
    autoApproved?: boolean;
  }>({ validating: false, valid: null, error: null });
  const [serverAttemptCount, setServerAttemptCount] = useState(0);
  const maxReceiptAttempts = 3;

  // Fetch server-side attempt count on mount (persists across page refreshes)
  useEffect(() => {
    if (courseId) {
      fetch(`/api/receipt-attempts/${courseId}`, { credentials: "include" })
        .then(res => res.json())
        .then(data => setServerAttemptCount(data.attemptCount || 0))
        .catch(() => setServerAttemptCount(0));
    }
  }, [courseId]);

  // Function to validate receipt using AI (with payment details for auto-approval)
  const validateReceipt = async (objectPath: string) => {
    setReceiptValidation({ validating: true, valid: null, error: null });
    
    try {
      const res = await fetch("/api/validate-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          screenshotUrl: objectPath,
          // Pass payment details for potential auto-approval
          courseId: course?.id,
          paymentMethodId: selectedMethod,
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          customerEmail: formData.customerEmail,
          planType: selectedPlan
          // Server tracks attempts - no need to send from client
        }),
      });
      const data = await res.json();
      if (data.valid) {
        setReceiptValidation({ validating: false, valid: true, error: null, autoApproved: data.autoApproved });
        if (data.autoApproved) {
          // Auto-approved! Show success and close modal
          const firstName = formData.customerName.split(' ')[0];
          toast.success(data.message || `Hambalyo ${firstName}! Koorsada ayaa laguu furay!`, { duration: 8000 });
          setSubmitted(true);
          queryClient.invalidateQueries({ queryKey: ["enrollments"] });
          queryClient.invalidateQueries({ queryKey: ["parentEnrollments"] });
        } else if (data.manualReview) {
          // Manual review mode - receipt saved, waiting for admin approval
          toast.success(data.message || "Rasiidkaaga waa la keydiyey. Koorsada waa la furi doonaa kadib markii la xaqiijiyo.", { duration: 10000 });
          setSubmitted(true);
        } else {
          toast.success(data.message || "Sawirka rasiidka waa la aqbalay!");
        }
      } else {
        // Server already incremented attempts - fetch fresh count from server
        if (courseId) {
          fetch(`/api/receipt-attempts/${courseId}`, { credentials: "include" })
            .then(res => res.json())
            .then(data => setServerAttemptCount(data.attemptCount || 0))
            .catch(() => {});
        }
        setReceiptValidation({ validating: false, valid: false, error: data.error });
        // Keep the screenshot visible so user can see the error message
      }
    } catch (error) {
      console.error("Receipt validation error:", error);
      // On error, allow the submission (graceful degradation)
      setReceiptValidation({ validating: false, valid: true, error: null });
    }
  };

  const { uploadFile, isUploading: isUploadingScreenshot, progress: uploadProgress } = useUpload({
    onSuccess: async (response) => {
      setScreenshotUrl(response.url);
      toast.success(t("courseDetail.screenshotUploaded") || "Sawirka waa la soo geliyey! Waa la hubinayaa...");
      // Validate the receipt after upload
      await validateReceipt(response.url);
    },
    onError: (error) => {
      console.error("Screenshot upload failed:", error);
      toast.error(t("courseDetail.screenshotUploadError") || "Sawirka ma soo gelin. Fadlan isku day mar kale.", { duration: 5000 });
      setScreenshotPreview(null);
      setReceiptValidation({ validating: false, valid: null, error: null });
    },
  });

  const queryClient = useQueryClient();

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}`);
      if (!res.ok) throw new Error("Course not found");
      return res.json();
    },
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons", course?.id],
    queryFn: async () => {
      if (!course?.id) return [];
      const res = await fetch(`/api/lessons?courseId=${course.id}`);
      return res.json();
    },
    enabled: !!course?.id,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  // Fetch quizzes for this course
  const { data: courseQuizzes = [] } = useQuery({
    queryKey: ["courseQuizzes", course?.id],
    queryFn: async () => {
      if (!course?.id) return [];
      const res = await fetch(`/api/courses/${course.id}/quizzes`);
      return res.json();
    },
    enabled: !!course?.id,
  });

  // Fetch assignments for this course
  const { data: courseAssignments = [] } = useQuery({
    queryKey: ["courseAssignments", course?.id],
    queryFn: async () => {
      if (!course?.id) return [];
      const res = await fetch(`/api/courses/${course.id}/assignments`);
      return res.json();
    },
    enabled: !!course?.id,
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: async () => {
      const res = await fetch("/api/payment-methods");
      return res.json();
    },
  });

  // Fetch pricing plans from database
  const { data: pricingPlans = [] } = useQuery({
    queryKey: ["pricingPlans"],
    queryFn: async () => {
      const res = await fetch("/api/pricing-plans");
      return res.json();
    },
  });

  // Check if parent is logged in using context
  const { parent, isLoading: parentLoading } = useParentAuth();
  const isLoggedIn = !!parent;

  // Offline download functionality
  const { isOnline } = useOffline();
  const { 
    isCourseDownloaded, 
    getCourseDownloadProgress, 
    downloadCourse, 
    isDownloading,
    downloadQueue
  } = useOfflineDownloads();
  const [isDownloadingCourse, setIsDownloadingCourse] = useState(false);

  // Check if profile is complete (has name, phone, email) - must be before early returns
  const isProfileComplete = useMemo(() => {
    if (!parent) return false;
    return !!(parent.name && parent.phone && parent.email);
  }, [parent]);

  // Check if user has access to this course
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

  // Fetch subscription status with upgrade info
  const { data: subscriptionStatus } = useQuery({
    queryKey: ["subscriptionStatus", course?.id, parent?.id],
    queryFn: async () => {
      const res = await fetch(`/api/parent/subscription-status/${course.id}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!course?.id && isLoggedIn,
  });

  // Check if eligible for upgrade (monthly to yearly)
  const upgradeInfo = subscriptionStatus?.upgradeInfo;
  const isEligibleForUpgrade = upgradeInfo?.eligible === true;
  const shouldShowUpgradeBanner = isEligibleForUpgrade && upgradeInfo?.bannerVisible === true;
  
  // Track if we've marked the banner as shown to avoid duplicate calls
  const bannerMarkedRef = useRef(false);
  
  // Mark banner as shown when it's displayed (only once per window)
  useEffect(() => {
    if (shouldShowUpgradeBanner && course?.id && !bannerMarkedRef.current) {
      bannerMarkedRef.current = true;
      fetch(`/api/parent/upgrade-banner-shown/${course.id}`, {
        method: "POST",
        credentials: "include",
      }).catch(console.error);
    }
    
    // Reset the ref when banner is hidden so it can be marked again for the next window
    if (!shouldShowUpgradeBanner) {
      bannerMarkedRef.current = false;
    }
  }, [shouldShowUpgradeBanner, course?.id]);

  // Fetch lesson progress for this course
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

  // Fetch course reviews
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

  const submitPayment = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/payment-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || t("courseDetail.loginError"));
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success(t("courseDetail.paymentReceived"), {
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("courseDetail.paymentError"), {
        duration: 8000,
      });
    },
  });

  // Use pricing plans from database, with fallback to defaults
  // This must be defined before any conditional returns to follow React hooks rules
  const planPrices: Record<PlanType, number> = useMemo(() => {
    const monthlyPlan = pricingPlans.find((p: any) => p.planType === 'monthly');
    const yearlyPlan = pricingPlans.find((p: any) => p.planType === 'yearly');
    const oneTimePlan = pricingPlans.find((p: any) => p.planType === 'one-time');
    
    return {
      // Database prices are stored in cents, convert to dollars
      monthly: monthlyPlan ? monthlyPlan.priceUsd / 100 : (course?.priceMonthly ?? defaultPrices.monthly),
      yearly: yearlyPlan ? yearlyPlan.priceUsd / 100 : (course?.priceYearly ?? defaultPrices.yearly),
      "one-time": oneTimePlan ? oneTimePlan.priceUsd / 100 : defaultPrices["one-time"],
    };
  }, [pricingPlans, course]);

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

  // Show coming soon page if content is not ready
  if (!course.contentReady) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
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
                {/* Sparkle Icon */}
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

  // Use lessons directly - quizzes and assignments are now standalone lessons with lessonType field
  const lessonsWithExtras = [...lessons].map((lesson: any) => ({
    ...lesson,
    type: "lesson"
  }));
  
  // Sort by module and order
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
    // Check if this is a quiz item (merged from quizzes table)
    if (lesson.type === "quiz") {
      return <HelpCircle className="w-5 h-5 text-purple-600" />;
    }
    // Check if this is an assignment item (merged from assignments table)
    if (lesson.type === "assignment") {
      return <ClipboardList className="w-5 h-5 text-orange-600" />;
    }
    
    // Use lessonType from database for actual lessons
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
    // Default to video icon
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

  const handleBuyClick = () => {
    // Auto-fill form data from parent profile
    if (parent) {
      setFormData({
        customerName: parent.name || "",
        customerPhone: parent.phone || "",
        customerEmail: parent.email || "",
      });
    }
    setShowPaymentModal(true);
    setSubmitted(false);
    setSelectedMethod(null);
    setPaymentType(null);
  };

  const handleStripeCheckout = async () => {
    if (!parent) {
      toast.error("Fadlan soo gal si aad u sii wadato");
      return;
    }
    
    setStripeLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          planType: selectedPlan,
          courseId: courseId,
        }),
      });
      const data = await res.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Checkout session failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Stripe checkout failed");
    } finally {
      setStripeLoading(false);
    }
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("[Screenshot] File selected:", file?.name, file?.size, file?.type);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      console.log("[Screenshot] Starting upload...");
      try {
        await uploadFile(file);
        console.log("[Screenshot] Upload completed successfully");
      } catch (err) {
        console.error("[Screenshot] Upload failed:", err);
      }
    }
  };

  const removeScreenshot = () => {
    setScreenshotUrl(null);
    setScreenshotPreview(null);
    setReceiptValidation({ validating: false, valid: null, error: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmitPayment = () => {
    if (!selectedMethod || !formData.customerName || !formData.customerPhone) {
      return;
    }
    
    // Screenshot is required
    if (!screenshotUrl) {
      toast.error(t("courseDetail.screenshotError"), { duration: 4000 });
      return;
    }

    // Check if this is an upgrade from monthly to yearly
    const isUpgrade = isEligibleForUpgrade && selectedPlan === "yearly";
    const paymentAmount = isUpgrade ? upgradeInfo?.upgradePrice : planPrices[selectedPlan];

    submitPayment.mutate({
      courseId: course.id,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail || null,
      paymentMethodId: selectedMethod,
      planType: selectedPlan,
      amount: paymentAmount,
      screenshotUrl: screenshotUrl,
      isUpgrade: isUpgrade, // Flag to indicate this is an upgrade
    });
  };

  const selectedPaymentMethod = paymentMethods.find((m: any) => m.id === selectedMethod);

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

      {/* Upgrade Banner for monthly subscribers - shown 3 times per month, 10 days apart, 24h each */}
      {hasAccess && shouldShowUpgradeBanner && (
        <section className="px-4 py-6 bg-gradient-to-r from-yellow-400 to-amber-500">
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="text-center mb-4">
                <span className="text-4xl mb-2 block">🏆</span>
                <h3 className="text-xl font-bold text-gray-900">Xubin Dahabi Noqo!</h3>
                <p className="text-gray-600 text-sm mt-1">U beddel xubin sanadleyaal ah oo lacag badan badbadi</p>
              </div>
              
              {/* Explanation */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <p className="text-blue-800 text-sm leading-relaxed">
                  <span className="font-bold">✓</span> Waxaad hore u bixisay <span className="font-bold">${upgradeInfo?.monthlyPrice}</span> xubin bille ah.<br/>
                  <span className="font-bold">✓</span> Qiimaha sanadlaha waa <span className="font-bold">${upgradeInfo?.yearlyPrice}</span>.<br/>
                  <span className="font-bold">✓</span> Waxaad hadda bixinaysaa kaliya <span className="font-bold text-green-600">${upgradeInfo?.upgradePrice}</span>.<br/>
                  <span className="font-bold">✓</span> Waxaad helaysaa <span className="font-bold">11 bilood oo dheeraad ah</span>.
                </p>
              </div>
              
              {/* Comparison */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-red-700 text-sm font-medium mb-2">⚠️ Haddii aad sii ahaato bille:</p>
                <p className="text-red-800 font-bold text-lg">${upgradeInfo?.monthlyPrice} × 12 bilood = $360</p>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                <p className="text-green-700 text-sm font-medium mb-2">✅ Hadda haddaad u beddesho:</p>
                <p className="text-green-800 font-bold text-lg">Hal mar ${upgradeInfo?.upgradePrice} → 1 sano buuxa</p>
                <p className="text-green-600 text-sm mt-1">💰 Waxaad badbaadinaysaa <span className="font-bold">${upgradeInfo?.savings}</span>!</p>
              </div>
              
              <button 
                onClick={() => {
                  setSelectedPlan("yearly");
                  if (parent) {
                    setFormData({
                      customerName: parent.name || "",
                      customerPhone: parent.phone || "",
                      customerEmail: parent.email || "",
                    });
                  }
                  setShowPaymentModal(true);
                  setSubmitted(false);
                  setSelectedMethod(null);
                }}
                className="w-full py-4 text-lg font-bold bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-xl shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                data-testid="button-upgrade"
              >
                ⭐ U Beddel Xubin Dahabi - ${upgradeInfo?.upgradePrice}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Pricing Section - Only show if user doesn't have access */}
      {!hasAccess && (
        <section className="px-4 py-8 bg-white">
          <div className="max-w-md mx-auto">
            {isLoggedIn ? (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">{t("courseDetail.coursePrices")}</h2>
                
                <div className="space-y-3 mb-6">
                  {/* Xubin Dahabi - Premium/Yearly Option FIRST */}
                  <button
                    onClick={() => setSelectedPlan("yearly")}
                    className={`w-full p-4 rounded-xl text-left transition-all border-2 relative overflow-hidden ${
                      selectedPlan === "yearly" 
                        ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-400 ring-2 ring-yellow-400" 
                        : "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300"
                    }`}
                    data-testid="plan-yearly"
                  >
                    {/* Premium Badge */}
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      ⭐ DOORASHADA UGU FIICAN
                    </div>
                    <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          selectedPlan === "yearly" ? "bg-yellow-500" : "border-2 border-yellow-400"
                        }`}>
                          {selectedPlan === "yearly" && <div className="w-3 h-3 rounded-full bg-white"></div>}
                        </div>
                        <div>
                          <span className="font-bold text-yellow-800 text-lg">🏆 Xubin Dahabi</span>
                          <p className="text-xs text-yellow-700">Sanadka oo dhan wax baro!</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-2xl text-yellow-800">${planPrices.yearly}</span>
                        <p className="text-xs text-yellow-600">/sannadkii</p>
                      </div>
                    </div>
                  </button>

                  {/* Xubin Bille - Monthly Option */}
                  <button
                    onClick={() => {
                      setSelectedPlan("monthly");
                      setShowMonthlyWarning(true);
                    }}
                    className={`w-full p-4 rounded-xl text-left transition-all border ${
                      selectedPlan === "monthly" ? "bg-blue-50 border-blue-400" : "bg-gray-50 border-gray-200"
                    }`}
                    data-testid="plan-monthly"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          selectedPlan === "monthly" ? "bg-blue-600" : "border-2 border-gray-300"
                        }`}>
                          {selectedPlan === "monthly" && <div className="w-2 h-2 rounded-full bg-white"></div>}
                        </div>
                        <span className="font-semibold text-gray-900">{t("courseDetail.monthlyMember")}</span>
                      </div>
                      <span className="font-bold text-lg text-gray-900">${planPrices.monthly}<span className="text-sm font-normal text-gray-500">{t("courseDetail.perMonth")}</span></span>
                    </div>
                  </button>

                  {/* Hal Mar Iibso - One-Time Purchase Option */}
                  <button
                    onClick={() => setSelectedPlan("one-time")}
                    className={`w-full p-4 rounded-xl text-left transition-all border ${
                      selectedPlan === "one-time" ? "bg-green-50 border-green-400" : "bg-gray-50 border-gray-200"
                    }`}
                    data-testid="plan-one-time"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          selectedPlan === "one-time" ? "bg-green-600" : "border-2 border-gray-300"
                        }`}>
                          {selectedPlan === "one-time" && <div className="w-2 h-2 rounded-full bg-white"></div>}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900">Hal Mar Iibso</span>
                          <p className="text-xs text-gray-500">Koorsada oo keliya, adigoo iska leh</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-lg text-gray-900">${planPrices["one-time"]}</span>
                        <p className="text-xs text-green-600">Hal lacag oo keliya</p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Monthly Warning Dialog */}
                <Dialog open={showMonthlyWarning} onOpenChange={setShowMonthlyWarning}>
                  <DialogContent className="max-w-sm mx-auto">
                    <div className="text-center p-4">
                      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-orange-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">⚠️ Digniin Muhiim ah</h3>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 text-left">
                        <p className="text-orange-800 font-medium mb-2">Xubin Bille ah waxaad bixinaysaa:</p>
                        <ul className="text-orange-700 text-sm space-y-2">
                          <li>• <span className="font-bold">$30 bil kasta</span></li>
                          <li>• Haddii aadan wakhtigeeda ku bixin, <span className="font-bold text-red-600">koorsada way kaa xirmaysaa</span></li>
                        </ul>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        💡 <span className="font-medium">Xubin Dahabi ah ($114/Sandkii)</span> ayaa kuu roon - waxaad dhaqaalaysan lacag badan, sanadka dhan koorsooyinka halka la soo geliyo waad qaadan adiga oo aan bixin wax lacag ah oo dheeraad ah oo kale.
                      </p>
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowMonthlyWarning(false)}
                          className="flex-1"
                        >
                          OK, Waan fahmay
                        </Button>
                        <Button 
                          onClick={() => {
                            setSelectedPlan("yearly");
                            setShowMonthlyWarning(false);
                          }}
                          className="flex-1 bg-yellow-500 hover:bg-yellow-600"
                        >
                          ⭐ Dahabi Dooro
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <button 
                  onClick={handleBuyClick}
                  className="w-full py-4 text-lg font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2" 
                  data-testid="button-buy"
                >
                  <CreditCard className="w-5 h-5" />
                  {t("courseDetail.buyNow")} - ${planPrices[selectedPlan]}
                </button>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{t("courseDetail.loginWithGmail")}</h2>
                <p className="text-gray-600 mb-6">{t("courseDetail.loginToSeePrices")}</p>
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
                        
                        // Determine link based on item type
                        const linkPath = lesson.type === "quiz" 
                          ? `/quiz/${lesson.quizId}` 
                          : lesson.type === "assignment"
                          ? `/assignment/${lesson.assignmentId}`
                          : `/lesson/${lesson.id}`;
                        
                        const isQuizItem = lesson.type === "quiz";
                        const isAssignmentItem = lesson.type === "assignment";
                        
                        // Check if lesson is time-locked for live courses (0-6 Bilood & Ilmo Is-Dabira)
                        // First 20 lessons (order 0-19) are unlocked, rest locked until Feb 7, 2026
                        const LIVE_COURSE_IDS = [
                          '02eec0ad-c335-4756-9b94-861117bfb058', // 0-6 Bilood Jir
                          'fde44d06-e012-4eab-867f-59d52e312453'  // Koorsada Ilmo Is-Dabira
                        ];
                        const UNLOCK_DATE = new Date('2026-02-07T00:00:00');
                        const isLiveCourse = LIVE_COURSE_IDS.includes(course?.id || '');
                        const lessonOrder = typeof lesson.order === 'number' ? lesson.order : 999;
                        const isTimeLocked = isLiveCourse && lessonOrder >= 20 && new Date() < UNLOCK_DATE;
                        
                        // Check if lesson is free (first 3 lessons are free for guests)
                        const isFreeTrial = lesson.isFree === true;
                        
                        // Lesson is accessible if: (1) user has paid access and not time-locked, OR (2) lesson is free
                        const isLessonAccessible = (hasAccess && !isTimeLocked) || isFreeTrial;
                        
                        const handleLessonClick = (e: React.MouseEvent) => {
                          if (isTimeLocked && hasAccess) {
                            e.preventDefault();
                            toast.info("Casharkaan wuxuu furmi doonaa 7.2.2026", { duration: 3000 });
                          } else if (!hasAccess && !isFreeTrial) {
                            e.preventDefault();
                            // Let the normal flow handle non-access case for non-free lessons
                          }
                          // Free trial lessons: allow navigation even without login/access
                        };
                        
                        return (
                        <Link key={lesson.id} href={isLessonAccessible ? linkPath : '#'} onClick={handleLessonClick}>
                          <div 
                            className={`px-6 py-4 flex items-center gap-4 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer ${isQuizItem ? 'bg-purple-50' : isAssignmentItem ? 'bg-orange-50' : ''} ${isTimeLocked && hasAccess ? 'opacity-60' : ''}`}
                            data-testid={`lesson-${lesson.id}`}
                          >
                            <span className={`w-7 h-7 rounded-full ${isQuizItem ? 'bg-purple-100 text-purple-600' : isAssignmentItem ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'} text-sm font-bold flex items-center justify-center flex-shrink-0`}>
                              {lessonNumber}
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
                            {isLessonAccessible ? (
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

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-blue-600">
              {submitted ? t("courseDetail.thankYou") : t("courseDetail.payment")}
            </DialogTitle>
          </DialogHeader>

          {submitted ? (
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-green-600 mb-3">🎉 {t("courseDetail.congratulations")}</h3>
              <p className="text-lg font-semibold text-blue-700 mb-2">{formData.customerName}</p>
              <p className="text-lg font-semibold text-gray-900 mb-4">
                {t("courseDetail.purchaseSuccess")}
              </p>
              <div className="bg-blue-50 rounded-xl p-4 mb-4 text-left">
                <p className="text-gray-700 leading-relaxed text-sm">
                  {t("courseDetail.thankYouMessage")}
                </p>
                <p className="text-gray-700 leading-relaxed text-sm mt-2">
                  {t("courseDetail.thankYouAgain")} ❤️
                </p>
              </div>
              <p className="text-sm text-gray-500 italic">
                {t("courseDetail.questionWhatsApp")}
              </p>
              <p className="text-lg font-bold text-blue-600 mt-3">
                {t("courseDetail.thankYou1001")} 🙏
              </p>
              <Button 
                onClick={() => setShowPaymentModal(false)}
                className="mt-6 w-full bg-green-600 hover:bg-green-700"
              >
                {t("courseDetail.close")}
              </Button>
            </div>
          ) : !paymentType ? (
            <div className="space-y-5">
              {/* Course & Price Header */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 rounded-xl text-white">
                <p className="text-sm opacity-90">{course.title}</p>
                <p className="text-2xl font-bold mt-1">${planPrices[selectedPlan]} <span className="text-sm font-normal opacity-80">{selectedPlan === 'monthly' ? '/ bishii' : selectedPlan === 'yearly' ? '/ sannadkii' : '(hal mar)'}</span></p>
              </div>

              {/* Payment Type Selection */}
              <div className="space-y-3">
                <p className="font-bold text-gray-800 text-center">Dooro habka lacag bixinta</p>
                
                {/* Stripe Card Payment Option - Dynamic based on selected plan */}
                <div className="p-4 rounded-xl border-2 border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-indigo-800">1. Kaarka (Card Payment)</span>
                      <p className="text-xs text-indigo-600">Qurbaha ku nool ee Dayaasbarada ah</p>
                      <p className="text-xs text-indigo-600">
                        Visa, Mastercard, Amex - ${planPrices[selectedPlan]}
                        {selectedPlan === 'monthly' ? '/bishii' : selectedPlan === 'yearly' ? '/sannadkii' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="w-full" data-testid={`stripe-${selectedPlan}-button`}>
                    <button 
                      onClick={handleStripeCheckout}
                      disabled={stripeLoading}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg disabled:opacity-50 text-lg"
                      data-testid="button-stripe-checkout"
                    >
                      {stripeLoading ? "⏳ Waa la furanayaa..." : `💳 Iibso Hadda - $${planPrices[selectedPlan]}`}
                    </button>
                  </div>
                </div>
                
                <div className="text-center text-gray-400 text-sm">— ama —</div>
                
                {/* Manual Payment Option */}
                <button
                  onClick={() => setPaymentType("manual")}
                  className="w-full p-4 rounded-xl border-2 border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 hover:border-green-400 transition-all flex items-center gap-4"
                  data-testid="payment-manual"
                >
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-green-800">2. Mobile Money / Bank</span>
                    <p className="text-xs text-green-600">Soomaaliya ku nool</p>
                    <p className="text-xs text-green-600">Zaad, eDahab, Sahal, Taaj</p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setPaymentType(null)}
                className="mb-2"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Dib u laabo
              </Button>
              
              {/* Course & Price Header */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 rounded-xl text-white">
                <p className="text-sm opacity-90">{course.title}</p>
                <p className="text-2xl font-bold mt-1">${planPrices[selectedPlan]} <span className="text-sm font-normal opacity-80">{selectedPlan === 'monthly' ? '/ bishii' : selectedPlan === 'yearly' ? '/ sannadkii' : '(hal mar)'}</span></p>
              </div>

              {/* Simple 3-Step Instructions */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                  <p className="font-semibold text-gray-800">Dooro habka lacag bixinta</p>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                  <p className="font-semibold text-gray-800">U dir lacagta lambarkan</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                  <p className="font-semibold text-gray-800">Geli koodka rasiidka oo riix "Iibso"</p>
                </div>
              </div>

              {/* Talaabo 1: Payment Method Selection - Two Groups */}
              <div className="space-y-3">
                <p className="font-bold text-gray-800">Talaabo 1: Dooro habka</p>
                
                {/* XAWAALADDA TAAJ */}
                <div className="border-2 border-green-200 rounded-xl overflow-hidden">
                  <div className="bg-green-500 px-3 py-2">
                    <p className="text-white font-bold text-sm">💵 XAWAALADDA TAAJ</p>
                  </div>
                  <div className="p-2 bg-green-50 grid grid-cols-3 gap-2">
                    {paymentMethods.filter((m: any) => m.category === 'taaj' || !m.category).map((method: any) => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedMethod(method.id)}
                        className={`p-2 rounded-lg border-2 text-center transition-all ${
                          selectedMethod === method.id 
                            ? "border-green-600 bg-green-100 ring-2 ring-green-500" 
                            : "border-green-200 bg-white"
                        }`}
                        data-testid={`payment-method-${method.id}`}
                      >
                        <p className="font-bold text-green-800 text-xs">{method.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* XAWAALADDA DAHAB-SHIIL */}
                <div className="border-2 border-orange-200 rounded-xl overflow-hidden">
                  <div className="bg-orange-500 px-3 py-2">
                    <p className="text-white font-bold text-sm">🏦 XAWAALADDA DAHAB-SHIIL</p>
                  </div>
                  <div className="p-2 bg-orange-50 grid grid-cols-3 gap-2">
                    {paymentMethods.filter((m: any) => m.category === 'dahab-shiil').map((method: any) => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedMethod(method.id)}
                        className={`p-2 rounded-lg border-2 text-center transition-all ${
                          selectedMethod === method.id 
                            ? "border-orange-600 bg-orange-100 ring-2 ring-orange-500" 
                            : "border-orange-200 bg-white"
                        }`}
                        data-testid={`payment-method-${method.id}`}
                      >
                        <p className="font-bold text-orange-800 text-xs">{method.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Talaabo 2: Show clear instructions based on selected method */}
              {selectedPaymentMethod && (
                <div className="bg-yellow-50 border-2 border-yellow-400 p-4 rounded-xl space-y-3">
                  <p className="font-bold text-yellow-800 text-lg">Talaabo 2: U dir lacagta 💸</p>
                  
                  {/* Amount to send */}
                  <div className="bg-white rounded-lg p-3 border-2 border-green-300 text-center">
                    <p className="text-sm text-gray-600">Lacagta la dirayo:</p>
                    <p className="text-3xl font-bold text-green-600">${planPrices[selectedPlan]}</p>
                  </div>

                  {/* Instructions for Diaspora */}
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <p className="font-bold text-blue-800 mb-2">🌍 Haddaad Qurbaha joogto:</p>
                    <p className="text-blue-700 text-sm mb-2">
                      Tag xawaaladda {selectedPaymentMethod.category === 'dahab-shiil' ? 'DAHAB-SHIIL' : 'TAAJ'} oo u dir:
                    </p>
                    <div className="bg-white rounded p-2 text-sm space-y-1">
                      <p><span className="text-gray-500">Magaca:</span> <span className="font-bold">Musse Said Aw-Musse</span></p>
                      <p><span className="text-gray-500">Goobta:</span> <span className="font-bold">Soomaaliya, Qardho</span></p>
                      <p><span className="text-gray-500">Telefon:</span> <span className="font-bold">{selectedPaymentMethod.category === 'dahab-shiil' ? '0667790584' : '0907790584'}</span></p>
                    </div>
                  </div>

                  {/* Instructions for Somalia */}
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <p className="font-bold text-green-800 mb-2">🇸🇴 Haddaad Soomaaliya joogto:</p>
                    <p className="text-green-700 text-sm mb-2">Moobaylkaaga toos uga dir lambarka:</p>
                    <div className="bg-white rounded p-3 text-center">
                      <p className="text-2xl font-bold text-gray-900">{selectedPaymentMethod.category === 'dahab-shiil' ? '0667790584' : '0907790584'}</p>
                    </div>
                  </div>

                  {/* Next step instruction */}
                  <div className="bg-purple-100 rounded-lg p-3 border border-purple-300">
                    <p className="text-purple-800 text-sm font-medium">
                      📸 Marka lacagta aad soo dirto, <span className="font-bold">ka qaad sawir (screenshot) rasiidka</span>, ka dibna ku soo laabo boggaan oo soo dir sawirka iyo lambarka ku qoran rasiidka.
                    </p>
                  </div>
                </div>
              )}

              {/* Profile Check */}
              {!isProfileComplete ? (
                <div className="bg-red-50 border-2 border-red-200 p-4 rounded-xl text-center">
                  <p className="text-red-700 font-bold mb-3">⚠️ Marka hore buuxi profile-kaaga</p>
                  <Link href="/profile">
                    <Button className="bg-red-500 hover:bg-red-600 text-white">
                      Buuxi Profile
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Talaabo 3: Screenshot Upload */}
                  <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-xl">
                    <p className="font-bold text-blue-800 mb-3">Talaabo 3: Soo geli sawirka rasiidka</p>
                    
                    {/* Screenshot Upload */}
                    <div>
                      {screenshotPreview ? (
                        <div className="relative">
                          <img 
                            src={screenshotPreview} 
                            alt="Sawirka rasiidka" 
                            className="w-full max-h-32 object-contain rounded-lg border bg-white"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1"
                            onClick={removeScreenshot}
                            data-testid="button-remove-screenshot"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          {isUploadingScreenshot && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                              <div className="text-white text-sm">{uploadProgress}%</div>
                            </div>
                          )}
                          {receiptValidation.validating && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                              <div className="text-white text-sm flex items-center gap-2 text-center px-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                Waa la hubinayaa in RASIIDKA sax yahay ee sug in yar...
                              </div>
                            </div>
                          )}
                          {receiptValidation.valid === true && (
                            <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded-lg text-center">
                              <span className="text-green-700 text-sm font-medium">✓ Rasiidka waa la aqbalay</span>
                            </div>
                          )}
                          {receiptValidation.valid === false && (
                            <div 
                              className="mt-2 p-3 bg-red-100 border border-red-300 rounded-lg text-center cursor-pointer hover:bg-red-200 transition-colors"
                              onClick={() => {
                                setScreenshotUrl(null);
                                setScreenshotPreview(null);
                                setReceiptValidation({ validating: false, valid: null, error: null });
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = "";
                                }
                              }}
                              data-testid="button-dismiss-error"
                            >
                              <span className="text-red-700 text-sm font-medium block">✗ {receiptValidation.error}</span>
                              {serverAttemptCount < maxReceiptAttempts ? (
                                <span className="text-red-600 text-xs mt-1 block">👆 Taabo si aad sawir cusub u soo geliso ({maxReceiptAttempts - serverAttemptCount} isku day oo hadhay)</span>
                              ) : (
                                <div className="mt-2 p-2 bg-blue-100 border border-blue-300 rounded-lg">
                                  <span className="text-blue-800 text-xs font-medium block">ℹ️ Isku dayga koowaad wuu ku guuldareystay</span>
                                  <span className="text-blue-700 text-xs block mt-1">👆 Taabo si aad sawir cusub u soo geliso. Rasiidkaaga waxaa eegi doona Admin-ka.</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div 
                          className="flex items-center justify-center gap-3 w-full h-14 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors bg-white"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Image className="w-5 h-5 text-blue-500" />
                          <p className="text-sm font-medium text-blue-600">📸 Soo geli sawirka rasiidka</p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleScreenshotUpload}
                            data-testid="input-screenshot"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button 
                    onClick={handleSubmitPayment}
                    disabled={!selectedMethod || !isProfileComplete || !screenshotUrl || receiptValidation.validating || receiptValidation.valid === false || submitPayment.isPending}
                    className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700"
                    data-testid="button-submit-payment"
                  >
                    {submitPayment.isPending ? "Waa la dirayaa..." : receiptValidation.validating ? "Waa la hubinayaa sawirka..." : "✅ Iibso Koorsada"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
