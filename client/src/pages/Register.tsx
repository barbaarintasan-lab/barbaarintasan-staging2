import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import logoImage from "@assets/NEW_LOGO-BSU_1_1768990258338.png";

const COUNTRIES = [
  { value: "somalia", label: "🇸🇴 Soomaaliya" },
  { value: "djibouti", label: "🇩🇯 Jabuuti" },
  { value: "ethiopia", label: "🇪🇹 Itoobiya" },
  { value: "kenya", label: "🇰🇪 Kenya" },
  { value: "uganda", label: "🇺🇬 Uganda" },
  { value: "tanzania", label: "🇹🇿 Tanzania" },
  { value: "eritrea", label: "🇪🇷 Eritrea" },
  { value: "sudan", label: "🇸🇩 Suudaan" },
  { value: "south_sudan", label: "🇸🇸 Suudaan Koonfur" },
  { value: "egypt", label: "🇪🇬 Masar" },
  { value: "usa", label: "🇺🇸 Maraykanka (USA)" },
  { value: "canada", label: "🇨🇦 Kanada" },
  { value: "uk", label: "🇬🇧 Ingiriiska (UK)" },
  { value: "germany", label: "🇩🇪 Jarmalka" },
  { value: "france", label: "🇫🇷 Faransiiska" },
  { value: "italy", label: "🇮🇹 Talyaaniga" },
  { value: "spain", label: "🇪🇸 Isbaaniya" },
  { value: "netherlands", label: "🇳🇱 Holland" },
  { value: "belgium", label: "🇧🇪 Beljiyam" },
  { value: "switzerland", label: "🇨🇭 Swiiserlaand" },
  { value: "sweden", label: "🇸🇪 Iswiidhan" },
  { value: "norway", label: "🇳🇴 Noorweey" },
  { value: "denmark", label: "🇩🇰 Denmark" },
  { value: "finland", label: "🇫🇮 Finland" },
  { value: "austria", label: "🇦🇹 Osteeriya" },
  { value: "turkey", label: "🇹🇷 Turkiga" },
  { value: "saudi", label: "🇸🇦 Sacuudi Carabiya" },
  { value: "uae", label: "🇦🇪 Imaaraadka (UAE)" },
  { value: "qatar", label: "🇶🇦 Qadar" },
  { value: "kuwait", label: "🇰🇼 Kuwait" },
  { value: "bahrain", label: "🇧🇭 Baxrayn" },
  { value: "oman", label: "🇴🇲 Cumaan" },
  { value: "yemen", label: "🇾🇪 Yaman" },
  { value: "jordan", label: "🇯🇴 Urdun" },
  { value: "iraq", label: "🇮🇶 Ciraaq" },
  { value: "australia", label: "🇦🇺 Awsteeraaliya" },
  { value: "new_zealand", label: "🇳🇿 Niyuu Siilaan" },
  { value: "south_africa", label: "🇿🇦 Koonfur Afrika" },
  { value: "india", label: "🇮🇳 Hindiya" },
  { value: "pakistan", label: "🇵🇰 Bakistaan" },
  { value: "malaysia", label: "🇲🇾 Malaysia" },
  { value: "other", label: "🌍 Wadan Kale" },
];

export default function Register() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const { registerWithEmail, loginWithEmail } = useParentAuth();
  
  const urlParams = new URLSearchParams(window.location.search);
  const redirectUrl = urlParams.get("redirect") || "/";
  const returnUrl = urlParams.get("returnUrl");
  const messageType = urlParams.get("message");
  
  const [isLogin, setIsLogin] = useState(location.includes("/login"));
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    country: "",
  });

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const googleUrl = returnUrl ? `/api/auth/google?returnUrl=${encodeURIComponent(returnUrl)}` : "/api/auth/google";
      const response = await fetch(googleUrl);
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Google login khalad ka dhacay");
        setIsGoogleLoading(false);
      }
    } catch (error) {
      console.error("Google login error:", error);
      toast.error("Google login khalad ka dhacay");
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await loginWithEmail(formData.email, formData.password);
        toast.success(t("auth.loginSuccess"));
      } else {
        if (!formData.name) {
          toast.error("Magacaaga waa khasab");
          setIsLoading(false);
          return;
        }
        if (!formData.phone) {
          toast.error("Taleefankaaga waa khasab");
          setIsLoading(false);
          return;
        }
        if (!formData.country) {
          toast.error("Wadanka waa khasab");
          setIsLoading(false);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          toast.error("Password-yada ma iska mid ahiin");
          setIsLoading(false);
          return;
        }
        await registerWithEmail(formData.email, formData.password, formData.name, formData.phone, formData.country, "", false);
        toast.success(t("auth.registerSuccess"));
      }
      
      if (returnUrl && (returnUrl.startsWith("https://barbaarintasan.com") || returnUrl.startsWith("https://www.barbaarintasan.com"))) {
        window.location.href = returnUrl;
      } else {
        setLocation(redirectUrl);
      }
    } catch (error: any) {
      toast.error(error.message || t("auth.error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {messageType === "iibso" && (
        <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-900 p-3 text-center font-bold text-sm">
          Fadlan soo gal si aad u iibsato xubin dahabi ah!
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-[400px]">
          <div className="text-center mb-8">
            <img src={logoImage} alt="Barbaarintasan" className="w-16 h-16 rounded-2xl mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">
              {isLogin ? "Soo Gal" : "Sameyso Akoon"}
            </h1>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full h-12 text-base font-medium border-2 border-gray-300 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-50"
            data-testid="button-google-login"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {isLogin ? "Google-ga ku gal" : "Google isku Diiwaangeli"}
              </>
            )}
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-500">ama</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Magacaaga oo dhamaystiran"
                required={!isLogin}
                className="h-12 text-base border-2 border-gray-300 rounded-lg px-4 placeholder:text-gray-400"
                data-testid="input-name"
              />
            )}

            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Email"
              required
              className="h-12 text-base border-2 border-gray-300 rounded-lg px-4 placeholder:text-gray-400"
              data-testid="input-email"
            />

            {!isLogin && (
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Taleefankaaga (+252...)"
                required={!isLogin}
                className="h-12 text-base border-2 border-gray-300 rounded-lg px-4 placeholder:text-gray-400"
                data-testid="input-phone"
              />
            )}

            <div className={!isLogin ? "grid grid-cols-2 gap-3" : ""}>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Password"
                  required
                  minLength={6}
                  className="h-12 text-base border-2 border-gray-300 rounded-lg px-4 pr-10 placeholder:text-gray-400"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {!isLogin && (
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Xaqiiji Password"
                    required
                    minLength={6}
                    className="h-12 text-base border-2 border-gray-300 rounded-lg px-4 pr-10 placeholder:text-gray-400"
                    data-testid="input-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>

            {!isLogin && (
              <Select
                value={formData.country}
                onValueChange={(value) => setFormData({ ...formData, country: value })}
              >
                <SelectTrigger className="h-12 text-base border-2 border-gray-300 rounded-lg px-4" data-testid="select-country">
                  <SelectValue placeholder="Wadanka" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.value} value={country.value}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 rounded-lg"
              data-testid="button-submit"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                "Soo Gal"
              ) : (
                "Is Diiwaan Geli"
              )}
            </Button>

            {isLogin && (
              <Link href="/forgot-password">
                <button
                  type="button"
                  className="w-full text-center text-blue-600 hover:text-blue-700 text-sm font-medium mt-2"
                  data-testid="button-forgot-password"
                >
                  Password-ka ma ilowday?
                </button>
              </Link>
            )}
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            {isLogin ? (
              <p className="text-gray-600 text-sm">
                Akoon ma haysatid?{" "}
                <button
                  onClick={() => { setIsLogin(false); setLocation("/register"); }}
                  className="text-blue-600 font-semibold hover:underline"
                  data-testid="button-switch-register"
                >
                  Is Diiwaan Geli
                </button>
              </p>
            ) : (
              <p className="text-gray-600 text-sm">
                Hadaad Akoon horay u lahayd?{" "}
                <button
                  onClick={() => { setIsLogin(true); setLocation("/login"); }}
                  className="text-blue-600 font-semibold hover:underline"
                  data-testid="button-switch-login"
                >
                  Soo Gal
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
