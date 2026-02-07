import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, CreditCard, Upload, X, Loader2, AlertTriangle, Crown, Calendar, CheckCircle, Star, Sparkles, ExternalLink } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { useUpload } from "@/hooks/use-upload";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { toast } from "sonner";
import confetti from "canvas-confetti";
// PayPal integration available but currently disabled - backend routes preserved for future use

type PlanType = "monthly" | "yearly";

const defaultPrices: Record<PlanType, number> = {
  monthly: 30,
  yearly: 114,
};

export default function Subscription() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const { parent, isLoading: parentLoading } = useParentAuth();
  const queryClient = useQueryClient();
  
  // Check for WordPress redirect parameters
  const urlParams = new URLSearchParams(searchString);
  const courseFromWordPress = urlParams.get('course');
  const fromWordPress = urlParams.get('from') === 'wordpress';
  
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("yearly");
  const [showMonthlyWarning, setShowMonthlyWarning] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<"paypal" | "manual" | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [receiptValidation, setReceiptValidation] = useState<{
    validating: boolean;
    valid: boolean | null;
    error: string | null;
    readyToPurchase?: boolean;
    submissionId?: string;
    message?: string;
  }>({ validating: false, valid: null, error: null });
  const [isConfirmingPurchase, setIsConfirmingPurchase] = useState(false);

  const { data: parentEnrollments = [], isLoading: enrollmentsLoading } = useQuery({
    queryKey: ["parentEnrollments"],
    queryFn: async () => {
      const res = await fetch("/api/parent/enrollments", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!parent,
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: async () => {
      const res = await fetch("/api/payment-methods");
      return res.json();
    },
  });

  const { data: planPrices } = useQuery({
    queryKey: ["coursePrices"],
    queryFn: async () => {
      const res = await fetch("/api/course-prices");
      if (!res.ok) return defaultPrices;
      return res.json();
    },
  });

  const prices = planPrices || defaultPrices;

  const hasPaidEnrollment = parentEnrollments.some((e: any) => 
    e.planType === "monthly" || e.planType === "yearly"
  );

  const currentEnrollment = parentEnrollments.find((e: any) => 
    (e.planType === "monthly" || e.planType === "yearly") && e.status === "active"
  );

  const { data: parentProgress = [] } = useQuery({
    queryKey: ["parentProgress"],
    queryFn: async () => {
      const res = await fetch("/api/parent/progress", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!parent,
  });

  const lastCourseId = parentProgress.length > 0 
    ? parentProgress.sort((a: any, b: any) => 
        new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime()
      )[0]?.courseId 
    : currentEnrollment?.courseId;

  const triggerConfetti = (isYearly: boolean) => {
    if (isYearly) {
      const duration = 3000;
      const end = Date.now() + duration;
      const colors = ['#FFD700', '#FFA500', '#FF6347', '#9400D3', '#00CED1'];
      
      (function frame() {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
      
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 100,
          origin: { y: 0.6 },
          colors: colors
        });
      }, 500);
    } else {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#22c55e', '#3b82f6', '#60a5fa']
      });
    }
  };

  const validateReceipt = async (objectPath: string) => {
    setReceiptValidation({ validating: true, valid: null, error: null });
    try {
      const res = await fetch("/api/validate-receipt-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          screenshotUrl: objectPath,
          paymentMethodId: selectedMethod,
          customerName: parent?.name,
          customerPhone: parent?.phone,
          customerEmail: parent?.email,
          planType: selectedPlan
        }),
      });
      const data = await res.json();
      if (data.valid) {
        setReceiptValidation({ 
          validating: false, 
          valid: true, 
          error: null, 
          readyToPurchase: data.readyToPurchase,
          submissionId: data.submissionId,
          message: data.message
        });
        if (data.readyToPurchase) {
          toast.success("Rasiidkaaga waa la hubiyey! Hadda riix 'Iibso Koorsada'");
        } else {
          toast.success(data.message || "Sawirka rasiidka waa la aqbalay!");
        }
      } else {
        setReceiptValidation({ validating: false, valid: false, error: data.error });
      }
    } catch (error) {
      console.error("Receipt validation error:", error);
      setReceiptValidation({ validating: false, valid: true, error: null });
    }
  };

  const confirmPurchase = async () => {
    if (!receiptValidation.submissionId) {
      toast.error("Khalad dhacay. Fadlan isku day mar kale.");
      return;
    }
    
    setIsConfirmingPurchase(true);
    try {
      const res = await fetch("/api/confirm-receipt-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ submissionId: receiptValidation.submissionId }),
      });
      const data = await res.json();
      
      if (data.success) {
        setSubmitted(true);
        queryClient.invalidateQueries({ queryKey: ["parentEnrollments"] });
        setTimeout(() => triggerConfetti(selectedPlan === "yearly"), 300);
        toast.success(data.message || "Hambalyo! Koorsadaada waa la furay!");
      } else {
        toast.error(data.error || "Wax khalad ah ayaa dhacay");
      }
    } catch (error) {
      console.error("Confirm purchase error:", error);
      toast.error("Wax khalad ah ayaa dhacay. Fadlan isku day mar kale.");
    } finally {
      setIsConfirmingPurchase(false);
    }
  };

  const { uploadFile, isUploading: isUploadingScreenshot, progress: uploadProgress } = useUpload({
    onSuccess: async (response) => {
      setScreenshotUrl(response.url);
      toast.success("Sawirka waa la soo geliyey! Waa la hubinayaa...");
      await validateReceipt(response.url);
    },
    onError: (error) => {
      console.error("Screenshot upload failed:", error);
      toast.error("Sawirka ma soo gelin. Fadlan isku day mar kale.", { duration: 5000 });
      setScreenshotPreview(null);
      setReceiptValidation({ validating: false, valid: null, error: null });
    },
  });

  const submitPayment = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/subscription-renewal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit payment");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["parentEnrollments"] });
      toast.success("Lacag bixintaada waa la diray! Admin-ka ayaa eegaya.", { duration: 5000 });
    },
    onError: (error: any) => {
      toast.error(error.message || "Wax khalad ah ayaa dhacay", { duration: 5000 });
    },
  });

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      try {
        await uploadFile(file);
      } catch (err) {
        console.error("Upload failed:", err);
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
    if (!selectedMethod || !parent?.name || !parent?.phone) {
      return;
    }
    
    if (!screenshotUrl) {
      toast.error("Fadlan soo geli sawirka rasiidka", { duration: 4000 });
      return;
    }

    submitPayment.mutate({
      customerName: parent.name,
      customerPhone: parent.phone,
      customerEmail: parent.email || null,
      paymentMethodId: selectedMethod,
      planType: selectedPlan,
      amount: prices[selectedPlan],
      screenshotUrl: screenshotUrl,
    });
  };

  const openPaymentModal = () => {
    setShowPaymentModal(true);
    setSubmitted(false);
    setPaymentType(null);
    setSelectedMethod(null);
    setScreenshotUrl(null);
    setScreenshotPreview(null);
    setReceiptValidation({ validating: false, valid: null, error: null });
  };

  const handlePayPalSuccess = async (orderData: any) => {
    try {
      const res = await fetch("/api/paypal/subscription-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orderId: orderData.id,
          planType: selectedPlan,
          amount: prices[selectedPlan],
        }),
      });
      
      if (res.ok) {
        setSubmitted(true);
        triggerConfetti(selectedPlan === "yearly");
        queryClient.invalidateQueries({ queryKey: ["parentEnrollments"] });
        toast.success(selectedPlan === "yearly" ? "🎉 Xubin Dahabi! Hambalyo!" : "✅ Waa la aqbalay!");
      } else {
        const error = await res.json();
        toast.error(error.error || "Wax qalad ah ayaa dhacay");
      }
    } catch (error) {
      console.error("PayPal completion error:", error);
      toast.error("Wax qalad ah ayaa dhacay");
    }
  };

  const selectedPaymentMethod = paymentMethods.find((m: any) => m.id === selectedMethod);

  if (parentLoading || enrollmentsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!parent) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold text-gray-900">Cusboonaynta Lacag Bixinta</h1>
          </div>
        </header>
        <div className="px-4 py-12 text-center">
          <p className="text-gray-600 mb-4">Fadlan gal akoonkaaga si aad u cusboonaynto</p>
          <Link href="/login">
            <Button className="bg-blue-600 hover:bg-blue-700">Gal Akoonkaaga</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!hasPaidEnrollment) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
            <Link href="/profile">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold text-gray-900">Cusboonaynta Lacag Bixinta</h1>
          </div>
        </header>
        <div className="px-4 py-12 text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-orange-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Wali Ma Lahayn Koorso</h2>
          <p className="text-gray-600 mb-6">
            Boggan waxaa kaliya isticmaali kara waalidka horey koorso u iibsaday. 
            Fadlan dooro koorso oo iibso.
          </p>
          <Link href="/courses">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <BookOpen className="w-4 h-4 mr-2" />
              Eeg Koorsooyin
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('so-SO', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getDaysRemaining = (accessEnd: string) => {
    const end = new Date(accessEnd);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Cusboonaynta Lacag Bixinta</h1>
        </div>
      </header>

      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {currentEnrollment && (
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Xaalada Hadda</h3>
                  <p className="text-sm text-gray-600">
                    {currentEnrollment.planType === "yearly" ? "Xubin Dahabi (Sanad)" : "Xubin Bille"}
                  </p>
                </div>
              </div>
              {currentEnrollment.accessEnd && (
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <p className="text-sm text-gray-600 mb-1">Wakhtiga ku haray:</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {getDaysRemaining(currentEnrollment.accessEnd)} maalmood
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Dhacdaa: <span className="font-medium text-red-600">{formatDate(currentEnrollment.accessEnd)}</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 text-center">Dooro Qorshahaaga</h2>
          
          <button
            onClick={() => setSelectedPlan("yearly")}
            className={`w-full p-4 rounded-xl text-left transition-all border-2 relative overflow-hidden ${
              selectedPlan === "yearly" 
                ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-400 ring-2 ring-yellow-400" 
                : "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300"
            }`}
            data-testid="plan-yearly"
          >
            <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
              ⭐ UGU FIICAN
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
                  <p className="text-xs text-yellow-700">Sanadka oo dhan + DHAMMAAN Koorsooyin!</p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-2xl text-yellow-800">${prices.yearly}</span>
                <p className="text-xs text-yellow-600">/sannadkii</p>
              </div>
            </div>
          </button>

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
                <div>
                  <span className="font-semibold text-gray-900">Xubin Bille</span>
                  <p className="text-xs text-gray-500">Koorsadaadii hore kaliya</p>
                </div>
              </div>
              <span className="font-bold text-lg text-gray-900">${prices.monthly}<span className="text-sm font-normal text-gray-500">/bishii</span></span>
            </div>
          </button>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <h3 className="font-bold text-green-800 mb-2 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Waxa aad helayso:
          </h3>
          <ul className="text-sm text-green-700 space-y-2">
            {selectedPlan === "yearly" ? (
              <>
                <li>✓ DHAMMAAN koorsooyinka app-ka</li>
                <li>✓ Casharada cusub ee soo baxa</li>
                <li>✓ Taageero 24/7</li>
                <li>✓ Shahaado marka la dhammeeyo</li>
                <li>✓ AI barashada cusub</li>
              </>
            ) : (
              <>
                <li>✓ Koorsadaadii hore oo kaliya</li>
                <li>✓ Casharada cusub ee koorsadaas</li>
                <li>✓ Taageero 24/7</li>
              </>
            )}
          </ul>
        </div>

        <Button 
          onClick={openPaymentModal}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-6 text-lg font-bold rounded-xl shadow-lg"
          data-testid="button-pay-now"
        >
          <CreditCard className="w-5 h-5 mr-2" />
          Bixi ${prices[selectedPlan]} - {selectedPlan === "yearly" ? "Sanadka" : "Bisha"}
        </Button>
      </div>

      <Dialog open={showMonthlyWarning} onOpenChange={setShowMonthlyWarning}>
        <DialogContent className="max-w-sm mx-auto">
          <div className="text-center p-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">⚠️ Digniin Muhiim ah</h3>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 text-left">
              <p className="text-orange-800 font-medium mb-2">Xubin Bille ah:</p>
              <ul className="text-orange-700 text-sm space-y-2">
                <li>• <span className="font-bold">Kaliya koorsadaadii hore</span> ayaad helaysaa</li>
                <li>• Haddii aadan wakhtigeeda ku bixin, <span className="font-bold text-red-600">koorsada way kaa xirmaysaa</span></li>
              </ul>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              💡 <span className="font-medium">Xubin Dahabi ah ($114/Sannadkii)</span> ayaa kuu roon - waxaad helaysaa DHAMMAAN koorsooyinka!
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setSelectedPlan("yearly");
                  setShowMonthlyWarning(false);
                }}
              >
                Dahabi Doorso
              </Button>
              <Button 
                className="flex-1 bg-blue-600"
                onClick={() => setShowMonthlyWarning(false)}
              >
                Bille Sii Wad
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              {submitted 
                ? (selectedPlan === "yearly" 
                    ? "🏆 XUBIN DAHABI 🏆" 
                    : "✅ Waa La Aqbalay!")
                : "Lacag Bixinta"}
            </DialogTitle>
          </DialogHeader>

          {submitted ? (
            selectedPlan === "yearly" ? (
              <div className="text-center py-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg shadow-orange-300">
                    <Crown className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 left-0 right-0 flex justify-center">
                    <Sparkles className="w-8 h-8 text-yellow-500 animate-bounce" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 via-orange-500 to-red-500 bg-clip-text text-transparent mb-2">
                  🎉 HAMBALYO! 🎉
                </h3>
                <p className="text-lg font-semibold text-gray-800 mb-1">
                  {parent?.name?.split(' ')[0] || "Waalid"}, waad ku guulaysatay!
                </p>
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 my-4">
                  <p className="text-orange-800 font-bold flex items-center justify-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    XUBIN DAHABI
                    <Star className="w-5 h-5 text-yellow-500" />
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    DHAMMAAN koorsooyinka ayaad hadda helaysaa!
                  </p>
                </div>
                <Button 
                  onClick={() => {
                    setShowPaymentModal(false);
                    navigate(lastCourseId ? `/course/${lastCourseId}` : "/courses");
                  }} 
                  className="w-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-600 hover:via-orange-600 hover:to-red-600 text-white py-6 text-lg font-bold shadow-lg"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Sii Wad Casharadaada
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-green-700 mb-2">🎉 Hambalyo!</h3>
                <p className="text-gray-600 mb-4">
                  Koorsadaada waa la furay! Hadda waad isticmaali kartaa.
                </p>
                <Button 
                  onClick={() => {
                    setShowPaymentModal(false);
                    navigate(lastCourseId ? `/course/${lastCourseId}` : "/courses");
                  }} 
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-5 font-bold"
                >
                  Sii Wad Casharadaada
                </Button>
              </div>
            )
          ) : !paymentType ? (
            <div className="space-y-6 py-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-700">Qorshaha la doortay:</p>
                <p className="text-2xl font-bold text-blue-900">
                  {selectedPlan === "yearly" ? "🏆 Xubin Dahabi" : "📅 Xubin Bille"} - ${prices[selectedPlan]}
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-3">Dooro Habka Lacag Bixinta:</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setPaymentType("manual")}
                    className="w-full p-4 rounded-xl border-2 border-green-500 bg-green-50 hover:bg-green-100 transition-all flex items-center justify-between"
                    data-testid="payment-manual"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                        <Upload className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <span className="font-bold text-green-800">2. Mobile Money / Bank</span>
                        <p className="text-xs text-green-600">Soomaaliya ku nool</p>
                        <p className="text-xs text-green-600">Zaad, eDahab, Sahal, Bank</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setPaymentType(null)}
                className="mb-2"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Dib u laabo
              </Button>
              
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-700">Qorshaha la doortay:</p>
                <p className="text-2xl font-bold text-blue-900">
                  {selectedPlan === "yearly" ? "🏆 Xubin Dahabi" : "📅 Xubin Bille"} - ${prices[selectedPlan]}
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-3">Dooro Habka Lacag Bixinta:</h3>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods.map((method: any) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedMethod === method.id 
                          ? "border-blue-500 bg-blue-50" 
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="font-medium text-sm">{method.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedPaymentMethod && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 mb-2">{selectedPaymentMethod.name}</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Lambar:</strong> {selectedPaymentMethod.accountNumber}</p>
                    {selectedPaymentMethod.accountName && (
                      <p><strong>Magaca:</strong> {selectedPaymentMethod.accountName}</p>
                    )}
                    {selectedPaymentMethod.instructions && (
                      <p className="mt-2 text-xs">{selectedPaymentMethod.instructions}</p>
                    )}
                  </div>
                </div>
              )}

              {selectedMethod && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">Soo Geli Sawirka Rasiidka:</h3>
                  
                  {screenshotPreview ? (
                    <div className="relative">
                      <img 
                        src={screenshotPreview} 
                        alt="Receipt" 
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      {receiptValidation.validating && (
                        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                          <div className="text-center text-white">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                            <p className="text-sm">Waa la hubinayaa...</p>
                          </div>
                        </div>
                      )}
                      {receiptValidation.valid === false && (
                        <div className="absolute inset-0 bg-red-500/90 rounded-lg flex items-center justify-center p-4">
                          <div className="text-center text-white">
                            <X className="w-10 h-10 mx-auto mb-2" />
                            <p className="text-sm font-medium">{receiptValidation.error}</p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={removeScreenshot}
                              className="mt-3 bg-white text-red-600"
                            >
                              Isku Day Mar Kale
                            </Button>
                          </div>
                        </div>
                      )}
                      {receiptValidation.valid === true && receiptValidation.readyToPurchase && (
                        <div className="absolute inset-0 bg-green-500/90 rounded-lg flex items-center justify-center p-4">
                          <div className="text-center text-white">
                            <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                            <p className="text-lg font-bold mb-1">Rasiidkaaga waa la hubiyey!</p>
                            <p className="text-sm opacity-90">Hadda riix 'Iibso Koorsada' si aad u furto</p>
                          </div>
                        </div>
                      )}
                      {receiptValidation.valid === true && !receiptValidation.readyToPurchase && (
                        <div className="absolute top-2 right-2">
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            className="rounded-full w-8 h-8"
                            onClick={removeScreenshot}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="block">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors">
                        {isUploadingScreenshot ? (
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                            <p className="text-sm text-gray-600">Waa la soo gelinayaa... {uploadProgress}%</p>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-600">Riix si aad u soo geliso sawirka rasiidka</p>
                          </>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleScreenshotUpload}
                        disabled={isUploadingScreenshot}
                      />
                    </label>
                  )}
                </div>
              )}

              {receiptValidation.valid === true && receiptValidation.readyToPurchase ? (
                <Button
                  onClick={confirmPurchase}
                  disabled={isConfirmingPurchase}
                  className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg font-bold animate-pulse"
                  data-testid="button-confirm-purchase"
                >
                  {isConfirmingPurchase ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Waa la furayaa koorsada...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Iibso Koorsada
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleSubmitPayment}
                  disabled={!selectedMethod || !screenshotUrl || receiptValidation.validating || receiptValidation.valid === false || submitPayment.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg font-bold"
                  data-testid="button-submit-payment"
                >
                  {submitPayment.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Waa la dirayaa...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Dir Lacag Bixinta
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BookOpen({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
