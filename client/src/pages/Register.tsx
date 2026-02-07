import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { GraduationCap, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
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
  { value: "libya", label: "🇱🇾 Libya" },
  { value: "tunisia", label: "🇹🇳 Tuniisiya" },
  { value: "algeria", label: "🇩🇿 Aljeeriya" },
  { value: "morocco", label: "🇲🇦 Morooko" },
  { value: "south_africa", label: "🇿🇦 Koonfur Afrika" },
  { value: "nigeria", label: "🇳🇬 Nayjeeriya" },
  { value: "ghana", label: "🇬🇭 Ghana" },
  { value: "cameroon", label: "🇨🇲 Kaameruun" },
  { value: "senegal", label: "🇸🇳 Senegaal" },
  { value: "mali", label: "🇲🇱 Maali" },
  { value: "rwanda", label: "🇷🇼 Rwanda" },
  { value: "burundi", label: "🇧🇮 Burundi" },
  { value: "congo_drc", label: "🇨🇩 Kongo (DRC)" },
  { value: "angola", label: "🇦🇴 Angola" },
  { value: "mozambique", label: "🇲🇿 Mozambique" },
  { value: "zambia", label: "🇿🇲 Zambia" },
  { value: "zimbabwe", label: "🇿🇼 Zimbabwe" },
  { value: "botswana", label: "🇧🇼 Botswana" },
  { value: "namibia", label: "🇳🇦 Namibia" },
  { value: "mauritius", label: "🇲🇺 Mauritius" },
  { value: "usa", label: "🇺🇸 Maraykanka (USA)" },
  { value: "canada", label: "🇨🇦 Kanada" },
  { value: "mexico", label: "🇲🇽 Meksiko" },
  { value: "brazil", label: "🇧🇷 Baraasiil" },
  { value: "argentina", label: "🇦🇷 Argentina" },
  { value: "chile", label: "🇨🇱 Chile" },
  { value: "colombia", label: "🇨🇴 Colombia" },
  { value: "peru", label: "🇵🇪 Peru" },
  { value: "venezuela", label: "🇻🇪 Venezuela" },
  { value: "ecuador", label: "🇪🇨 Ecuador" },
  { value: "uk", label: "🇬🇧 Ingiriiska (UK)" },
  { value: "germany", label: "🇩🇪 Jarmalka" },
  { value: "france", label: "🇫🇷 Faransiiska" },
  { value: "italy", label: "🇮🇹 Talyaaniga" },
  { value: "spain", label: "🇪🇸 Isbaaniya" },
  { value: "portugal", label: "🇵🇹 Bortuqaal" },
  { value: "netherlands", label: "🇳🇱 Holland" },
  { value: "belgium", label: "🇧🇪 Beljiyam" },
  { value: "switzerland", label: "🇨🇭 Swiiserlaand" },
  { value: "austria", label: "🇦🇹 Osteeriya" },
  { value: "sweden", label: "🇸🇪 Iswiidhan" },
  { value: "norway", label: "🇳🇴 Noorweey" },
  { value: "denmark", label: "🇩🇰 Denmark" },
  { value: "finland", label: "🇫🇮 Finland" },
  { value: "ireland", label: "🇮🇪 Irlandia" },
  { value: "poland", label: "🇵🇱 Boolaand" },
  { value: "czech", label: "🇨🇿 Jeek" },
  { value: "hungary", label: "🇭🇺 Hangari" },
  { value: "romania", label: "🇷🇴 Romania" },
  { value: "bulgaria", label: "🇧🇬 Bulgaria" },
  { value: "greece", label: "🇬🇷 Giriig" },
  { value: "turkey", label: "🇹🇷 Turkiga" },
  { value: "russia", label: "🇷🇺 Ruushka" },
  { value: "ukraine", label: "🇺🇦 Ukraine" },
  { value: "saudi", label: "🇸🇦 Sacuudi Carabiya" },
  { value: "uae", label: "🇦🇪 Imaaraadka (UAE)" },
  { value: "qatar", label: "🇶🇦 Qadar" },
  { value: "kuwait", label: "🇰🇼 Kuwait" },
  { value: "bahrain", label: "🇧🇭 Baxrayn" },
  { value: "oman", label: "🇴🇲 Cumaan" },
  { value: "yemen", label: "🇾🇪 Yaman" },
  { value: "jordan", label: "🇯🇴 Urdun" },
  { value: "lebanon", label: "🇱🇧 Lubnaan" },
  { value: "syria", label: "🇸🇾 Suuriya" },
  { value: "iraq", label: "🇮🇶 Ciraaq" },
  { value: "iran", label: "🇮🇷 Iiraan" },
  { value: "israel", label: "🇮🇱 Israa'iil" },
  { value: "palestine", label: "🇵🇸 Falastiin" },
  { value: "pakistan", label: "🇵🇰 Bakistaan" },
  { value: "india", label: "🇮🇳 Hindiya" },
  { value: "bangladesh", label: "🇧🇩 Bangaladesh" },
  { value: "sri_lanka", label: "🇱🇰 Sri Lanka" },
  { value: "nepal", label: "🇳🇵 Nepal" },
  { value: "afghanistan", label: "🇦🇫 Afgaanistaan" },
  { value: "china", label: "🇨🇳 Shiinaha" },
  { value: "japan", label: "🇯🇵 Jabaan" },
  { value: "south_korea", label: "🇰🇷 Kuuriya Koonfur" },
  { value: "north_korea", label: "🇰🇵 Kuuriya Waqooyi" },
  { value: "vietnam", label: "🇻🇳 Vietnam" },
  { value: "thailand", label: "🇹🇭 Tayland" },
  { value: "malaysia", label: "🇲🇾 Malaysia" },
  { value: "singapore", label: "🇸🇬 Singapore" },
  { value: "indonesia", label: "🇮🇩 Indonesia" },
  { value: "philippines", label: "🇵🇭 Filibiin" },
  { value: "australia", label: "🇦🇺 Awsteeraaliya" },
  { value: "new_zealand", label: "🇳🇿 Niyuu Siilaan" },
  { value: "other", label: "🌍 Wadan Kale" },
];

const CITIES: Record<string, { value: string; label: string }[]> = {
  somalia: [
    { value: "mogadishu", label: "Muqdisho" },
    { value: "hargeisa", label: "Hargeysa" },
    { value: "kismayo", label: "Kismaayo" },
    { value: "baidoa", label: "Baydhabo" },
    { value: "bosaso", label: "Boosaaso" },
    { value: "beledweyne", label: "Beledweyne" },
    { value: "gaalkacyo", label: "Gaalkacyo" },
    { value: "burao", label: "Burco" },
    { value: "berbera", label: "Berbera" },
    { value: "marka", label: "Marka" },
    { value: "jamaame", label: "Jamaame" },
    { value: "jilib", label: "Jilib" },
    { value: "baraawe", label: "Baraawe" },
    { value: "afgoye", label: "Afgooye" },
    { value: "jowhar", label: "Jowhar" },
    { value: "balcad", label: "Balcad" },
    { value: "wanlaweyn", label: "Wanlaweyn" },
    { value: "bulo_burte", label: "Bulo Burte" },
    { value: "jalalaqsi", label: "Jalalaqsi" },
    { value: "dhuusamareeb", label: "Dhuusamareeb" },
    { value: "cadaado", label: "Cadaado" },
    { value: "guriceel", label: "Guriceel" },
    { value: "hobyo", label: "Hobyo" },
    { value: "xarardheere", label: "Xarardheere" },
    { value: "eyl", label: "Eyl" },
    { value: "garowe", label: "Garoowe" },
    { value: "qardho", label: "Qardho" },
    { value: "galdogob", label: "Galdogob" },
    { value: "bandarbeyla", label: "Bandarbeyla" },
    { value: "laascaanood", label: "Laascaanood" },
    { value: "taleex", label: "Taleex" },
    { value: "buuhoodle", label: "Buuhoodle" },
    { value: "ceerigaabo", label: "Ceerigaabo" },
    { value: "ceel_afweyn", label: "Ceel Afweyn" },
    { value: "badhan", label: "Badhan" },
    { value: "borama", label: "Boorama" },
    { value: "gabiley", label: "Gabiley" },
    { value: "zeila", label: "Saylac" },
    { value: "lughaye", label: "Lughaye" },
    { value: "sheikh", label: "Sheikh" },
    { value: "oodweyne", label: "Oodweyne" },
    { value: "laas_geel", label: "Laas Geel" },
    { value: "wajaale", label: "Wajaale" },
    { value: "baki", label: "Baki" },
    { value: "dilla", label: "Dilla" },
    { value: "qoryoley", label: "Qoryoley" },
    { value: "sablale", label: "Sablaale" },
    { value: "wajid", label: "Waajid" },
    { value: "hudur", label: "Xudur" },
    { value: "dinsor", label: "Diinsoor" },
    { value: "buurhakaba", label: "Buurhakaba" },
    { value: "bardera", label: "Baardheere" },
    { value: "luuq", label: "Luuq" },
    { value: "dollow", label: "Doolow" },
    { value: "beled_xaawo", label: "Beled Xaawo" },
    { value: "garbahaarey", label: "Garbahaarey" },
    { value: "ceel_waaq", label: "Ceel Waaq" },
    { value: "bulo_xawo", label: "Bulo Xawo" },
    { value: "afmadow", label: "Afmadow" },
    { value: "badhaadhe", label: "Badhaadhe" },
    { value: "dhobley", label: "Dhoobleey" },
    { value: "other", label: "Magaalo Kale" },
  ],
  djibouti: [
    { value: "djibouti_city", label: "Jabuuti Magaalada" },
    { value: "ali_sabieh", label: "Cali Sabiix" },
    { value: "dikhil", label: "Dikhil" },
    { value: "tadjoura", label: "Tajura" },
    { value: "obock", label: "Obock" },
    { value: "other", label: "Magaalo Kale" },
  ],
  ethiopia: [
    { value: "addis", label: "Addis Ababa" },
    { value: "jigjiga", label: "Jigjiga" },
    { value: "dire_dawa", label: "Dire Dawa" },
    { value: "harar", label: "Harar" },
    { value: "gode", label: "Godey" },
    { value: "kebridehar", label: "Kebri Dehar" },
    { value: "warder", label: "Warder" },
    { value: "degehabur", label: "Degeh Buur" },
    { value: "other", label: "Magaalo Kale" },
  ],
  kenya: [
    { value: "nairobi", label: "Nairobi" },
    { value: "mombasa", label: "Mombasa" },
    { value: "garissa", label: "Garrisa" },
    { value: "wajir", label: "Wajiir" },
    { value: "mandera", label: "Mandhera" },
    { value: "isiolo", label: "Isiolo" },
    { value: "marsabit", label: "Marsabit" },
    { value: "eastleigh", label: "Eastleigh" },
    { value: "other", label: "Magaalo Kale" },
  ],
  uganda: [
    { value: "kampala", label: "Kampala" },
    { value: "other", label: "Magaalo Kale" },
  ],
  tanzania: [
    { value: "dar_es_salaam", label: "Dar es Salaam" },
    { value: "other", label: "Magaalo Kale" },
  ],
  eritrea: [
    { value: "asmara", label: "Asmara" },
    { value: "other", label: "Magaalo Kale" },
  ],
  sudan: [
    { value: "khartoum", label: "Khartuum" },
    { value: "other", label: "Magaalo Kale" },
  ],
  south_sudan: [
    { value: "juba", label: "Juba" },
    { value: "other", label: "Magaalo Kale" },
  ],
  egypt: [
    { value: "cairo", label: "Cairo" },
    { value: "alexandria", label: "Alexandria" },
    { value: "other", label: "Magaalo Kale" },
  ],
  usa: [
    { value: "minneapolis", label: "Minneapolis, MN" },
    { value: "columbus", label: "Columbus, OH" },
    { value: "seattle", label: "Seattle, WA" },
    { value: "san_diego", label: "San Diego, CA" },
    { value: "atlanta", label: "Atlanta, GA" },
    { value: "washington_dc", label: "Washington, DC" },
    { value: "phoenix", label: "Phoenix, AZ" },
    { value: "dallas", label: "Dallas, TX" },
    { value: "houston", label: "Houston, TX" },
    { value: "portland", label: "Portland, OR" },
    { value: "los_angeles", label: "Los Angeles, CA" },
    { value: "new_york", label: "New York, NY" },
    { value: "boston", label: "Boston, MA" },
    { value: "denver", label: "Denver, CO" },
    { value: "chicago", label: "Chicago, IL" },
    { value: "other", label: "Magaalo Kale" },
  ],
  canada: [
    { value: "toronto", label: "Toronto" },
    { value: "ottawa", label: "Ottawa" },
    { value: "edmonton", label: "Edmonton" },
    { value: "calgary", label: "Calgary" },
    { value: "vancouver", label: "Vancouver" },
    { value: "winnipeg", label: "Winnipeg" },
    { value: "montreal", label: "Montreal" },
    { value: "other", label: "Magaalo Kale" },
  ],
  uk: [
    { value: "london", label: "London" },
    { value: "manchester", label: "Manchester" },
    { value: "birmingham", label: "Birmingham" },
    { value: "bristol", label: "Bristol" },
    { value: "leicester", label: "Leicester" },
    { value: "cardiff", label: "Cardiff" },
    { value: "leeds", label: "Leeds" },
    { value: "other", label: "Magaalo Kale" },
  ],
  germany: [
    { value: "berlin", label: "Berlin" },
    { value: "munich", label: "Munich" },
    { value: "frankfurt", label: "Frankfurt" },
    { value: "hamburg", label: "Hamburg" },
    { value: "cologne", label: "Cologne" },
    { value: "dusseldorf", label: "Düsseldorf" },
    { value: "other", label: "Magaalo Kale" },
  ],
  france: [
    { value: "paris", label: "Paris" },
    { value: "marseille", label: "Marseille" },
    { value: "lyon", label: "Lyon" },
    { value: "other", label: "Magaalo Kale" },
  ],
  italy: [
    { value: "rome", label: "Rome" },
    { value: "milan", label: "Milan" },
    { value: "other", label: "Magaalo Kale" },
  ],
  spain: [
    { value: "madrid", label: "Madrid" },
    { value: "barcelona", label: "Barcelona" },
    { value: "other", label: "Magaalo Kale" },
  ],
  netherlands: [
    { value: "amsterdam", label: "Amsterdam" },
    { value: "rotterdam", label: "Rotterdam" },
    { value: "the_hague", label: "The Hague" },
    { value: "other", label: "Magaalo Kale" },
  ],
  belgium: [
    { value: "brussels", label: "Brussels" },
    { value: "antwerp", label: "Antwerp" },
    { value: "other", label: "Magaalo Kale" },
  ],
  sweden: [
    { value: "stockholm", label: "Stockholm" },
    { value: "malmo", label: "Malmö" },
    { value: "gothenburg", label: "Gothenburg" },
    { value: "other", label: "Magaalo Kale" },
  ],
  norway: [
    { value: "oslo", label: "Oslo" },
    { value: "bergen", label: "Bergen" },
    { value: "trondheim", label: "Trondheim" },
    { value: "other", label: "Magaalo Kale" },
  ],
  denmark: [
    { value: "copenhagen", label: "Copenhagen" },
    { value: "other", label: "Magaalo Kale" },
  ],
  finland: [
    { value: "helsinki", label: "Helsinki" },
    { value: "other", label: "Magaalo Kale" },
  ],
  switzerland: [
    { value: "zurich", label: "Zurich" },
    { value: "geneva", label: "Geneva" },
    { value: "other", label: "Magaalo Kale" },
  ],
  austria: [
    { value: "vienna", label: "Vienna" },
    { value: "other", label: "Magaalo Kale" },
  ],
  turkey: [
    { value: "istanbul", label: "Istanbul" },
    { value: "ankara", label: "Ankara" },
    { value: "other", label: "Magaalo Kale" },
  ],
  saudi: [
    { value: "riyadh", label: "Riyadh" },
    { value: "jeddah", label: "Jeddah" },
    { value: "mecca", label: "Makkah" },
    { value: "medina", label: "Madiina" },
    { value: "dammam", label: "Dammam" },
    { value: "other", label: "Magaalo Kale" },
  ],
  uae: [
    { value: "dubai", label: "Dubai" },
    { value: "abu_dhabi", label: "Abu Dhabi" },
    { value: "sharjah", label: "Sharjah" },
    { value: "other", label: "Magaalo Kale" },
  ],
  qatar: [
    { value: "doha", label: "Doha" },
    { value: "other", label: "Magaalo Kale" },
  ],
  kuwait: [
    { value: "kuwait_city", label: "Kuwait City" },
    { value: "other", label: "Magaalo Kale" },
  ],
  bahrain: [
    { value: "manama", label: "Manama" },
    { value: "other", label: "Magaalo Kale" },
  ],
  oman: [
    { value: "muscat", label: "Muscat" },
    { value: "other", label: "Magaalo Kale" },
  ],
  yemen: [
    { value: "sanaa", label: "Sancaa" },
    { value: "aden", label: "Cadan" },
    { value: "other", label: "Magaalo Kale" },
  ],
  australia: [
    { value: "melbourne", label: "Melbourne" },
    { value: "sydney", label: "Sydney" },
    { value: "brisbane", label: "Brisbane" },
    { value: "perth", label: "Perth" },
    { value: "other", label: "Magaalo Kale" },
  ],
  new_zealand: [
    { value: "auckland", label: "Auckland" },
    { value: "wellington", label: "Wellington" },
    { value: "other", label: "Magaalo Kale" },
  ],
  south_africa: [
    { value: "johannesburg", label: "Johannesburg" },
    { value: "cape_town", label: "Cape Town" },
    { value: "other", label: "Magaalo Kale" },
  ],
  india: [
    { value: "mumbai", label: "Mumbai" },
    { value: "delhi", label: "Delhi" },
    { value: "bangalore", label: "Bangalore" },
    { value: "other", label: "Magaalo Kale" },
  ],
  pakistan: [
    { value: "karachi", label: "Karachi" },
    { value: "lahore", label: "Lahore" },
    { value: "islamabad", label: "Islamabad" },
    { value: "other", label: "Magaalo Kale" },
  ],
  china: [
    { value: "beijing", label: "Beijing" },
    { value: "shanghai", label: "Shanghai" },
    { value: "guangzhou", label: "Guangzhou" },
    { value: "other", label: "Magaalo Kale" },
  ],
  japan: [
    { value: "tokyo", label: "Tokyo" },
    { value: "osaka", label: "Osaka" },
    { value: "other", label: "Magaalo Kale" },
  ],
  malaysia: [
    { value: "kuala_lumpur", label: "Kuala Lumpur" },
    { value: "other", label: "Magaalo Kale" },
  ],
  other: [
    { value: "other", label: "Magaalo Kale" },
  ],
};

export default function Register() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const { registerWithEmail, loginWithEmail } = useParentAuth();
  
  // Parse URL parameters for redirect and message
  const urlParams = new URLSearchParams(window.location.search);
  const redirectUrl = urlParams.get("redirect") || "/";
  const returnUrl = urlParams.get("returnUrl"); // External redirect (e.g., WordPress)
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
    city: "",
    inParentingGroup: false,
    agreedToTerms: false,
  });

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      // Pass returnUrl to Google OAuth if present
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
        if (!formData.city) {
          toast.error("Magaalada waa khasab");
          setIsLoading(false);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          toast.error("Password-yada ma iska mid ahiin");
          setIsLoading(false);
          return;
        }
        if (!formData.agreedToTerms) {
          toast.error("Please agree to the Terms, Privacy Policy and Community Guidelines");
          setIsLoading(false);
          return;
        }
        await registerWithEmail(formData.email, formData.password, formData.name, formData.phone, formData.country, formData.city, formData.inParentingGroup);
        toast.success(t("auth.registerSuccess"));
      }
      
      // Handle external redirect (WordPress) vs internal redirect
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-24">
      {/* Message banner for golden membership redirect */}
      {messageType === "iibso" && (
        <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-900 p-3 text-center font-bold text-sm">
          🏆 Fadlan soo gal si aad u iibsato xubin dahabi ah! 🏆
        </div>
      )}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 safe-top shadow-lg">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center" data-testid="button-back">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            </Link>
            <img src={logoImage} alt="Logo" className="w-10 h-10 rounded-xl" />
            <div>
              <h1 className="font-bold text-white text-lg">{isLogin ? t("auth.login") : t("auth.register")}</h1>
              <p className="text-blue-100 text-sm">{t("home.academyName")}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-8">
        <Card className="max-w-md mx-auto border-none shadow-xl">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {isLogin ? t("auth.welcomeBack") : t("auth.createAccount")}
              </h2>
              <p className="text-gray-600">
                {isLogin ? t("auth.loginPrompt") : t("auth.registerPrompt")}
              </p>
            </div>

            {/* Show login options at top for returning users */}
            {!isLogin && (
              <div className="mb-6 pb-6 border-b space-y-3">
                <p className="text-center text-gray-600 font-medium">
                  Akoon horay ma u lahayd?
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsLogin(true)}
                  className="w-full h-12 text-base font-semibold border-2 border-orange-500 text-orange-500 hover:bg-orange-50"
                  data-testid="button-switch-login-top"
                >
                  Soo Gal
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  disabled={isGoogleLoading}
                  className="w-full h-12 text-base font-semibold border-2 flex items-center justify-center gap-3"
                  data-testid="button-google-login-top"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Google-ga ku gal
                    </>
                  )}
                </Button>
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">ama is-diiwaan geli</span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <Label htmlFor="name">{t("auth.fullName")}</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t("auth.namePlaceholder")}
                    required={!isLogin}
                    className="mt-1"
                    data-testid="input-name"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t("auth.emailPlaceholder")}
                  required
                  className="mt-1"
                  data-testid="input-email"
                />
              </div>

              <div>
                <Label htmlFor="password">{t("auth.password")}</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={t("auth.passwordPlaceholder")}
                    required
                    minLength={6}
                    className="pr-10"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div>
                  <Label htmlFor="confirmPassword">Xaqiiji Password-ka</Label>
                  <div className="relative mt-1">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Mar labaad qor password-kaaga"
                      required
                      minLength={6}
                      className="pr-10"
                      data-testid="input-confirm-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}

              {!isLogin && (
                <div>
                  <Label htmlFor="phone">Taleefanka</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+252 XX XXX XXXX"
                    required
                    className="mt-1"
                    data-testid="input-phone"
                  />
                </div>
              )}

              {!isLogin && (
                <div>
                  <Label htmlFor="country">Wadanka</Label>
                  <Select 
                    value={formData.country} 
                    onValueChange={(value) => setFormData({ ...formData, country: value, city: "" })}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-country">
                      <SelectValue placeholder="Dooro wadanka" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!isLogin && formData.country && (
                <div>
                  <Label htmlFor="city">Magaalada</Label>
                  <Select 
                    value={formData.city} 
                    onValueChange={(value) => setFormData({ ...formData, city: value })}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-city">
                      <SelectValue placeholder="Dooro magaalada" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {(CITIES[formData.country] || CITIES.other).map((city) => (
                        <SelectItem key={city.value} value={city.value}>
                          {city.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!isLogin && (
                <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Checkbox
                    id="inParentingGroup"
                    checked={formData.inParentingGroup}
                    onCheckedChange={(checked) => setFormData({ ...formData, inParentingGroup: checked as boolean })}
                    data-testid="checkbox-parenting-group"
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="inParentingGroup" className="text-sm font-medium cursor-pointer">
                      Ma ku jirtaa Guruubkeena Bahda Tarbiyadda Caruurta?
                    </Label>
                  </div>
                </div>
              )}

              {!isLogin && (
                <div className="flex items-start space-x-2 pt-2 px-1">
                  <Checkbox
                    id="agreedToTerms"
                    checked={formData.agreedToTerms}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, agreedToTerms: checked as boolean })
                    }
                    required
                    className="mt-1"
                    data-testid="checkbox-agree-terms"
                  />
                  <Label htmlFor="agreedToTerms" className="text-xs leading-tight font-normal text-gray-600 cursor-pointer">
                    <strong>English:</strong> I agree to the{" "}
                    <Link href="/terms" className="text-blue-600 font-semibold hover:underline">Terms & Conditions</Link>,{" "}
                    <Link href="/privacy-policy" className="text-blue-600 font-semibold hover:underline">Privacy Policy</Link>, and{" "}
                    <Link href="/community-guidelines" className="text-blue-600 font-semibold hover:underline">Community Guidelines</Link>. 
                    I confirm that I am an adult (18+) and a parent or legal guardian.
                    <br /><br />
                    <strong>Somali:</strong> Waxaan aqbalayaa{" "}
                    <Link href="/terms" className="text-blue-600 font-semibold hover:underline">Shuruudaha & Xaaladdaha</Link>,{" "}
                    <Link href="/privacy-policy" className="text-blue-600 font-semibold hover:underline">Siyaasadda Asturnaanta</Link>, iyo{" "}
                    <Link href="/community-guidelines" className="text-blue-600 font-semibold hover:underline">Hagaha Bulshada</Link>. 
                    Waxaan xaqiijinayaa inaan ahay qof weyn (18+) oo ah waalid ama masuul sharci ah.
                  </Label>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 h-12 text-base font-semibold"
                data-testid="button-submit"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isLogin ? (
                  t("auth.login")
                ) : (
                  t("auth.register")
                )}
              </Button>

              {/* Show Google login option for login mode only */}
              {isLogin && (
                <>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">ama</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleLogin}
                    disabled={isGoogleLoading}
                    className="w-full h-12 text-base font-semibold border-2 flex items-center justify-center gap-3"
                    data-testid="button-google-login"
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Google-ga ku gal
                      </>
                    )}
                  </Button>
                </>
              )}

              {isLogin && (
                <>
                  <Link href="/forgot-password">
                    <button 
                      type="button"
                      className="w-full text-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                      data-testid="button-forgot-password"
                    >
                      {t("auth.forgotPasswordLink")}
                    </button>
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsLogin(false)}
                    className="w-full h-12 text-base font-semibold border-2 border-green-600 text-green-600 hover:bg-green-50"
                    data-testid="button-switch-register"
                  >
                    {t("auth.register")}
                  </Button>
                </>
              )}
            </form>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
