import { useState, useEffect, useRef } from "react";
import { Link, useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { ArrowLeft, CheckCircle, Upload, Loader2, Phone, CreditCard, Crown, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";
import { useUpload } from "@/hooks/use-upload";

export default function GoldenMembership() {
  const { t } = useTranslation();
  const { parent } = useParentAuth();
  const queryClient = useQueryClient();
  const searchString = useSearch();
  
  // Check for WordPress redirect parameters
  const urlParams = new URLSearchParams(searchString);
  const courseFromWordPress = urlParams.get('course');
  const fromWordPress = urlParams.get('from') === 'wordpress';
  
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  // Fetch actual sold count from approved golden membership submissions
  const { data: goldenSoldCount } = useQuery({
    queryKey: ["golden-membership-sold"],
    queryFn: async () => {
      const res = await fetch("/api/golden-membership-sold-count");
      if (!res.ok) return 3;
      const data = await res.json();
      return data.count || 3;
    }
  });
  
  const soldCount = goldenSoldCount || 3;
  const totalSpots = 114;
  const pricePerYear = 114;
  
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fixed target date: February 28, 2026 - offer expires
  const endDate = new Date("2026-02-28T23:59:59");
  
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = endDate.getTime();
      const difference = end - now;
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      }
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);
  
  const { data: paymentMethods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const res = await fetch("/api/payment-methods");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Fetch pricing plans from database
  const { data: pricingPlans = [] } = useQuery({
    queryKey: ["pricingPlans"],
    queryFn: async () => {
      const res = await fetch("/api/pricing-plans");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Get prices from database with fallbacks
  const yearlyPlan = pricingPlans.find((p: any) => p.planType === 'yearly');
  const monthlyPlan = pricingPlans.find((p: any) => p.planType === 'monthly');
  const dbPricePerYear = yearlyPlan ? yearlyPlan.priceUsd / 100 : pricePerYear;
  const dbPricePerMonth = monthlyPlan ? monthlyPlan.priceUsd / 100 : 30;

  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly'>('yearly');
  
  const { uploadFile, isUploading: uploadingFile } = useUpload();
  const [stripeLoading, setStripeLoading] = useState(false);
  
  const handleStripeCheckout = async () => {
    if (!parent) {
      toast.error("Fadlan soo gal si aad u sii wadato");
      return;
    }
    
    setStripeLoading(true);
    try {
      const res = await apiRequest("POST", "/api/stripe/create-checkout-session", {
        planType: selectedPlan,
        courseId: null,
      });
      const data = await res.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Checkout session failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Stripe checkout failed");
    } finally {
      setStripeLoading(false);
    }
  };
  
  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/payment-submissions", data);
    },
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["payment-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["golden-membership-sold"] });
      toast.success("Rasiidkaaga waa la diray! Waxaan ku soo wargelin doonaa marka la xaqiijiyo.");
    },
    onError: (error: any) => {
      toast.error(error.message || "Wax khalad ah ayaa dhacay");
    }
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptImage(file);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!parent) {
      toast.error("Fadlan soo gal si aad u sii wadato");
      return;
    }
    
    if (!receiptImage) {
      toast.error("Fadlan soo geli sawirka rasiidka");
      return;
    }
    
    setUploading(true);
    
    try {
      const uploadResult = await uploadFile(receiptImage);
      
      if (!uploadResult) {
        throw new Error("Sawirka lama soo gelin karin - fadlan isku day mar kale");
      }
      
      const goldenCourse = courses?.find((c: any) => 
        c.title?.toLowerCase().includes("golden") || 
        c.courseId?.toLowerCase().includes("golden")
      ) || courses?.[0];
      
      const defaultPaymentMethod = paymentMethods?.[0];
      
      if (!goldenCourse?.id) {
        throw new Error("Fadlan sug - koorsooyinka weli lama soo dejin");
      }
      
      if (!defaultPaymentMethod?.id) {
        throw new Error("Fadlan sug - habka lacag bixinta weli lama soo dejin");
      }
      
      await submitMutation.mutateAsync({
        customerName: parent.name,
        customerPhone: parent.phone || parent.email,
        customerEmail: parent.email,
        courseId: goldenCourse.id,
        paymentMethodId: defaultPaymentMethod.id,
        amount: pricePerYear,
        screenshotUrl: uploadResult.url,
        planType: "yearly",
        notes: "114 Xubin Dahabi - Sanadka"
      });
      
    } catch (error: any) {
      toast.error(error.message || "Wax khalad ah ayaa dhacay");
    } finally {
      setUploading(false);
    }
  };
  
  const spotsRemaining = totalSpots - soldCount;
  const progressPercent = (soldCount / totalSpots) * 100;
  
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-24">
        <header className="sticky top-0 z-40 bg-gradient-to-r from-amber-500 to-yellow-500 safe-top">
          <div className="px-4 py-3 flex items-center gap-3">
            <Link href="/">
              <button className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            </Link>
            <h1 className="text-white font-bold text-lg">{t("goldenMember.headerTitle")}</h1>
          </div>
        </header>
        
        <div className="p-6 text-center mt-12">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{t("goldenMember.thankYou")}</h2>
          <p className="text-gray-600 mb-6">
            {t("goldenMember.receiptReceived")}
          </p>
          <Link href="/">
            <Button className="bg-amber-600 hover:bg-amber-700">
              {t("goldenMember.backToHome")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-24">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-amber-500 to-yellow-500 safe-top">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/">
            <button className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-white" />
            <h1 className="text-white font-bold text-lg">{t("goldenMember.headerTitle")}</h1>
          </div>
        </div>
      </header>
      
      <div className="p-4">
        {fromWordPress && (
          <div className="bg-gradient-to-r from-blue-500 to-sky-500 rounded-xl p-4 mb-4 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <ExternalLink className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Ku soo dhawow barbaarintasan.com!</p>
                <p className="text-xs text-white/90">
                  {courseFromWordPress === 'all-access' 
                    ? 'Dhammaan koorsooyinka - lacag bixi hoos oo hel dhammaan' 
                    : `Waxaad doonaysay: ${courseFromWordPress || 'Koorso'} - lacag bixi si aad u hesho`
                  }
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 rounded-2xl p-5 shadow-xl border-2 border-amber-300 mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-3xl">🏆</span>
            <h2 className="text-lg font-black text-amber-900 text-center">{t("goldenMember.bannerTitle")}</h2>
            <span className="text-3xl">🏆</span>
          </div>
          
          <div className="bg-white/90 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-4 gap-2 text-center mb-3">
              <div className="bg-amber-100 rounded-lg p-2">
                <span className="text-2xl font-black text-amber-700">{timeLeft.days}</span>
                <p className="text-[10px] text-amber-600 font-medium">{t("goldenMember.days")}</p>
              </div>
              <div className="bg-amber-100 rounded-lg p-2">
                <span className="text-2xl font-black text-amber-700">{timeLeft.hours}</span>
                <p className="text-[10px] text-amber-600 font-medium">{t("goldenMember.hours")}</p>
              </div>
              <div className="bg-amber-100 rounded-lg p-2">
                <span className="text-2xl font-black text-amber-700">{timeLeft.minutes}</span>
                <p className="text-[10px] text-amber-600 font-medium">{t("goldenMember.minutes")}</p>
              </div>
              <div className="bg-amber-100 rounded-lg p-2">
                <span className="text-2xl font-black text-amber-700">{timeLeft.seconds}</span>
                <p className="text-[10px] text-amber-600 font-medium">{t("goldenMember.seconds")}</p>
              </div>
            </div>
            
            <p className="text-center text-red-600 font-bold text-sm mb-3 bg-red-50 rounded-lg py-2">
              ⏰ Fursadu waxay dhacaysaa: 28 Febraayo, 2026
            </p>
            
            {/* Course Start Announcement */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
              <p className="text-center text-blue-800 font-bold text-sm">
                📚 Koorsadayada waxay bilaabmayaan 7.02.2026
              </p>
              <p className="text-center text-blue-600 text-xs mt-1">
                • Koorsada Ilmo Is-Dabira<br />
                • Koorsada 0-6 Bilood
              </p>
            </div>
            
            <div className="mb-3">
              <div className="flex justify-between items-center mb-3">
                <div className="flex flex-col items-center bg-green-100 rounded-lg px-4 py-2">
                  <span className="text-3xl font-black text-green-600">{soldCount}</span>
                  <span className="text-green-700 font-bold text-xs">{t("goldenMember.sold")}</span>
                </div>
                <div className="flex-1 mx-3 relative">
                  <div className="h-6 bg-amber-200 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 via-green-400 to-green-500 rounded-full transition-all duration-500 flex items-center justify-center"
                      style={{ width: `${progressPercent}%` }}
                    >
                      <span className="text-white text-xs font-bold drop-shadow">{Math.round(progressPercent)}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center bg-amber-100 rounded-lg px-4 py-2">
                  <span className="text-3xl font-black text-amber-700">{spotsRemaining}</span>
                  <span className="text-amber-700 font-bold text-xs">{t("goldenMember.remaining")}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <span className="text-amber-900 text-lg">{t("goldenMember.only")}</span>
            <span className="text-4xl font-black text-amber-900 mx-2">${pricePerYear}</span>
            <span className="text-amber-900 text-lg">{t("goldenMember.perYear")}</span>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            {t("goldenMember.whatYouGet")}
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              {t("goldenMember.benefit1")}
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              {t("goldenMember.benefit2")}
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              {t("goldenMember.benefit3")}
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              {t("goldenMember.benefit4")}
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              {t("goldenMember.benefit5")}
            </li>
          </ul>
        </div>
        
        {/* Stripe Payment - Card/Online */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-4 shadow-lg mb-6">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5" />
            1. Lacag bixinta Kaarka (Card Payment) - Qurbaha ku nool ee Dayaasbarada ah
          </h3>
          <div className="bg-white rounded-xl p-4">
            <p className="text-gray-600 text-sm mb-4">
              Ku bixi kaarka debitka ama kiridhitka si degdeg ah oo ammaan ah.
            </p>
            
            {/* Yearly Plan - $114 */}
            <div className="mb-4" data-testid="stripe-yearly-button">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded">⭐ UGU FIICAN</span>
                <span className="font-bold text-gray-800">Sannadkii - ${dbPricePerYear}</span>
              </div>
              <button 
                onClick={() => { setSelectedPlan('yearly'); handleStripeCheckout(); }}
                disabled={stripeLoading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg disabled:opacity-50 text-lg"
                data-testid="button-yearly-checkout"
              >
                {stripeLoading && selectedPlan === 'yearly' ? "⏳ Waa la furanayaa..." : `💳 Ku bixi $${dbPricePerYear} (Sannadkii)`}
              </button>
            </div>

            {/* Monthly Plan - $30 */}
            <div className="border-t pt-4" data-testid="stripe-monthly-button">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-bold text-gray-800">Bishii - ${dbPricePerMonth}</span>
              </div>
              <button 
                onClick={() => { setSelectedPlan('monthly'); handleStripeCheckout(); }}
                disabled={stripeLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg disabled:opacity-50"
                data-testid="button-monthly-checkout"
              >
                {stripeLoading && selectedPlan === 'monthly' ? "⏳ Waa la furanayaa..." : `💳 Ku bixi $${dbPricePerMonth} (Bishii)`}
              </button>
            </div>

            <p className="text-center text-xs text-gray-500 mt-4">
              Waxaa lagu maamulaa Stripe - Ammaan oo caalami ah
            </p>
          </div>
        </div>
        
        <div className="text-center text-gray-500 font-medium text-sm mb-4">
          ——— ama ———
        </div>
        
        {/* Payment Methods - Where to send money */}
        {paymentMethods && paymentMethods.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              2. Mobile Money / Bank - Soomaaliya ku nool
            </h3>
            <p className="text-xs text-gray-600 mb-3">{t("goldenMember.whereToSend")}</p>
            <div className="space-y-4">
              {/* TAAJ Group - EVC Plus, SAAD, SAHAL */}
              {paymentMethods.filter((m: any) => m.category === 'taaj').length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-xs px-3 py-1 rounded-full shadow">TAAJ</div>
                    <span className="text-gray-600 text-sm">Xawilaadda</span>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                    {paymentMethods.filter((m: any) => m.category === 'taaj').map((method: any, idx: number) => (
                      <div key={method.id} className={idx > 0 ? "mt-2 pt-2 border-t border-orange-200" : ""}>
                        <p className="font-bold text-orange-800">{method.name}: <span className="font-mono">{method.accountNumber?.replace(/^\+252/, '0')}</span></p>
                      </div>
                    ))}
                    <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-orange-200">{t("goldenMember.nameAddress")}</p>
                  </div>
                </div>
              )}
              
              {/* DAHAB-SHIIL Group - E-Dahab */}
              {paymentMethods.filter((m: any) => m.category === 'dahab-shiil').length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-black text-xs px-3 py-1 rounded-full shadow">DAHAB-SHIIL</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                    {paymentMethods.filter((m: any) => m.category === 'dahab-shiil').map((method: any, idx: number) => (
                      <div key={method.id} className={idx > 0 ? "mt-2 pt-2 border-t border-yellow-200" : ""}>
                        <p className="font-bold text-yellow-800">{method.name}: <span className="font-mono">{method.accountNumber?.replace(/^\+252/, '0')}</span></p>
                        <p className="text-xs text-gray-600 mt-1">{t("goldenMember.nameAddress")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className="text-center text-amber-700 font-bold mt-3 bg-amber-50 rounded-lg p-2">
              💰 {t("goldenMember.paymentAmount")} <span className="text-xl">${pricePerYear}</span>
            </p>
          </div>
        )}
        
        <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl p-4 shadow-lg">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-lg">
            <Upload className="w-5 h-5 text-white" />
            {t("goldenMember.uploadReceipt")}
          </h3>
          
          <div className="bg-white rounded-xl p-4">
          {!parent ? (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-4">{t("goldenMember.loginFirst")}</p>
              <Link href="/login">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  {t("goldenMember.login")}
                </Button>
              </Link>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <Label className="text-gray-900 font-bold">{t("goldenMember.receiptImage")}</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-sky-300 bg-sky-50 rounded-xl p-6 text-center hover:bg-sky-100 transition-colors"
              >
                {receiptImage ? (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span>{receiptImage.name}</span>
                  </div>
                ) : (
                  <div className="text-blue-600">
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <p className="font-medium">{t("goldenMember.clickToUpload")}</p>
                    <p className="text-xs text-gray-500 mt-1">{t("goldenMember.fileFormats")}</p>
                  </div>
                )}
              </button>
            </div>
            
            <Button
              type="submit"
              disabled={uploading || submitMutation.isPending}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-amber-900 font-bold py-6 text-lg shadow-lg"
            >
              {uploading || submitMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t("goldenMember.uploading")}</span>
                </div>
              ) : (
                <span>🏆 {t("goldenMember.submitReceipt")}</span>
              )}
            </Button>
          </form>
          )}
          </div>
        </div>
        
        <p className="text-center text-xs text-gray-500 mt-4">
          ⚠️ {t("goldenMember.priceWarning")}
        </p>
      </div>
    </div>
  );
}
