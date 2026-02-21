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

  const [isLogin, setIsLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!isLogin) {
        if (!formData.name || !formData.phone || !formData.country) {
          toast.error("Fadlan buuxi dhammaan fields-ka khasabka ah");
          setIsLoading(false);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          toast.error("Password-yada ma isku mid ahiin");
          setIsLoading(false);
          return;
        }

        await registerWithEmail(
          formData.email,
          formData.password,
          formData.name,
          formData.phone,
          formData.country,
          "",
          false
        );
        toast.success(t("auth.registerSuccess"));
      }

      await loginWithEmail(formData.email, formData.password);
      toast.success(t("auth.loginSuccess"));
      setLocation("/");
    } catch (err) {
      console.error(err);
      toast.error("Waxaa dhacay qalad, fadlan isku day mar kale");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-white">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <img src={logoImage} alt="Barbaarintasan" className="w-16 h-16 mx-auto mb-4 rounded-2xl" />
          <h1 className="text-2xl font-bold text-gray-900">{isLogin ? "Soo Gal" : "Sameyso Akoon"}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Magacaaga oo dhamaystiran"
                required
              />
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email-kaaga"
                required
              />
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Taleefankaaga"
                required
              />
              <Select
                value={formData.country}
                onValueChange={(value) => setFormData({ ...formData, country: value })}
              >
                <SelectTrigger placeholder="Wadankaaga" />
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Password"
                required
              />
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Xaqiiji Password"
                required
              />
            </>
          )}

          {isLogin && (
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Email-kaaga"
              required
            />
          )}

          <Input
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Password"
            required
          />

          <Button type="submit" className="w-full h-12">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? "Soo Gal" : "Is Diiwaangeli"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          {isLogin ? (
            <p>
              Akoon ma haysatid?{" "}
              <button onClick={() => setIsLogin(false)} className="text-blue-600 hover:underline">
                Is Diiwaangeli
              </button>
            </p>
          ) : (
            <p>
              Hadaad Akoon horay u lahayd?{" "}
              <button onClick={() => setIsLogin(true)} className="text-blue-600 hover:underline">
                Soo Gal
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}