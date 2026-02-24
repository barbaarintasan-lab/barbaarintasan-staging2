import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import logoImage from "@assets/NEW_LOGO-BSU_1_1768990258338.png";

const COUNTRIES = [
  { value: "Somalia", label: "Soomaaliya" },
  { value: "Djibouti", label: "Jabuuti" },
  { value: "Ethiopia", label: "Itoobiya" },
  { value: "Kenya", label: "Kenya" },
  { value: "Uganda", label: "Uganda" },
  { value: "Tanzania", label: "Tanzania" },
  { value: "Eritrea", label: "Eritrea" },
  { value: "Sudan", label: "Suudaan" },
  { value: "Egypt", label: "Masar" },
  { value: "USA", label: "Maraykanka (USA)" },
  { value: "Canada", label: "Kanada" },
  { value: "UK", label: "Ingiriiska (UK)" },
  { value: "Germany", label: "Jarmalka" },
  { value: "France", label: "Faransiiska" },
  { value: "Italy", label: "Talyaaniga" },
  { value: "Spain", label: "Isbaaniya" },
  { value: "Netherlands", label: "Holland" },
  { value: "Belgium", label: "Beljiyam" },
  { value: "Switzerland", label: "Swiiserlaand" },
  { value: "Sweden", label: "Iswiidhan" },
  { value: "Norway", label: "Noorweey" },
  { value: "Denmark", label: "Denmark" },
  { value: "Finland", label: "Finland" },
  { value: "Austria", label: "Osteeriya" },
  { value: "Turkey", label: "Turkiga" },
  { value: "Saudi Arabia", label: "Sacuudi Carabiya" },
  { value: "UAE", label: "Imaaraadka (UAE)" },
  { value: "Qatar", label: "Qadar" },
  { value: "Kuwait", label: "Kuwait" },
  { value: "Bahrain", label: "Baxrayn" },
  { value: "Oman", label: "Cumaan" },
  { value: "Yemen", label: "Yaman" },
  { value: "Jordan", label: "Urdun" },
  { value: "Iraq", label: "Ciraaq" },
  { value: "Australia", label: "Awsteeraaliya" },
  { value: "New Zealand", label: "Niyuu Siilaan" },
  { value: "South Africa", label: "Koonfur Afrika" },
  { value: "India", label: "Hindiya" },
  { value: "Pakistan", label: "Bakistaan" },
  { value: "Malaysia", label: "Malaysia" },
  { value: "Other", label: "Wadan Kale" },
];

export default function Register() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const { loginWithEmail, registerWithEmail } = useParentAuth();
  
  const urlParams = new URLSearchParams(window.location.search);
  const redirectUrl = urlParams.get("redirect") || "/";
  const returnUrl = urlParams.get("returnUrl");
  
  const [isLogin, setIsLogin] = useState(location.includes("/login"));
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await loginWithEmail(loginData.email, loginData.password);
      toast.success(t("auth.loginSuccess"));
      
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (registerData.password !== registerData.confirmPassword) {
      toast.error("Password-yada ma iska mid ahiin. Fadlan hubi.");
      return;
    }

    if (registerData.password.length < 6) {
      toast.error("Password-ku waa in uu ka badan yahay 6 xaraf.");
      return;
    }

    if (!registerData.country) {
      toast.error("Fadlan dooro wadankaaga.");
      return;
    }

    setIsLoading(true);

    try {
      await registerWithEmail(
        registerData.email,
        registerData.password,
        registerData.name,
        registerData.phone,
        registerData.country
      );
      toast.success("Hambalyo! Akoonkaaga waa la sameeyey.");
      setLocation(redirectUrl);
    } catch (error: any) {
      toast.error(error.message || "Is-diiwaangelinta khalad ka dhacay.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLogin) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-[400px]">
            <div className="text-center mb-8">
              <img src={logoImage} alt="Barbaarintasan" className="w-16 h-16 rounded-2xl mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900" data-testid="text-register-title">
                Sameyso Akoon
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                Bilow safarka waxbarashada tarbiyadda
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Input
                  type="text"
                  value={registerData.name}
                  onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                  placeholder="Magacaaga oo dhamaystiran"
                  required
                  className="h-12 text-base border-2 border-gray-300 rounded-lg px-4 placeholder:text-gray-400"
                  data-testid="input-name"
                />
              </div>

              <div>
                <Input
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  placeholder="Email"
                  required
                  className="h-12 text-base border-2 border-gray-300 rounded-lg px-4 placeholder:text-gray-400"
                  data-testid="input-reg-email"
                />
              </div>

              <div>
                <Input
                  type="tel"
                  value={registerData.phone}
                  onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                  placeholder="Taleefankaaga (+252...)"
                  required
                  className="h-12 text-base border-2 border-gray-300 rounded-lg px-4 placeholder:text-gray-400"
                  data-testid="input-phone"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    placeholder="Password"
                    required
                    minLength={6}
                    className="h-12 text-base border-2 border-gray-300 rounded-lg px-4 pr-10 placeholder:text-gray-400"
                    data-testid="input-reg-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
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
              </div>

              <div>
                <select
                  value={registerData.country}
                  onChange={(e) => setRegisterData({ ...registerData, country: e.target.value })}
                  required
                  className="w-full h-12 text-base border-2 border-gray-300 rounded-lg px-4 bg-white text-gray-900 appearance-none cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  data-testid="select-country"
                >
                  <option value="" disabled>Wadanka</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 rounded-lg"
                data-testid="button-register-submit"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Is Diiwaan Geli"
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-[400px]">
          <div className="text-center mb-8">
            <img src={logoImage} alt="Barbaarintasan" className="w-16 h-16 rounded-2xl mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900" data-testid="text-login-title">
              Soo Gal
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
                Google-ga ku gal
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

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              value={loginData.email}
              onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
              placeholder="Email"
              required
              className="h-12 text-base border-2 border-gray-300 rounded-lg px-4 placeholder:text-gray-400"
              data-testid="input-email"
            />

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
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

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 rounded-lg"
              data-testid="button-submit"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Soo Gal"
              )}
            </Button>

            <Link href="/forgot-password">
              <button
                type="button"
                className="w-full text-center text-blue-600 hover:text-blue-700 text-sm font-medium mt-2"
                data-testid="button-forgot-password"
              >
                Password-ka ma ilowday?
              </button>
            </Link>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600 text-sm">
              Akoon ma haysatid?{" "}
              <button
                onClick={() => { setIsLogin(false); setLocation("/register"); }}
                className="text-blue-600 font-semibold hover:underline"
                data-testid="button-switch-register"
              >
                Iska Diiwaangeli
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
