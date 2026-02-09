import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { PointsCard, LeaderboardCard } from "@/components/StreakCounter";
import { StreakCalendar } from "@/components/StreakCalendar";
import { WeeklyProgressChart } from "@/components/WeeklyProgressChart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Award,
  LogOut,
  Crown,
  BookOpen,
  GraduationCap,
  Edit2,
  Check,
  X,
  ChevronRight,
  Trophy,
  Target,
  Clock,
  Download,
  Camera,
  Share2,
  Bell,
  BellOff,
  Play,
  Calendar,
  Users,
  MessagesSquare,
  ArrowLeft,
  Plus,
  Search,
  User,
  Shield,
  FileText,
} from "lucide-react";
import { ChatList } from "@/components/ChatList";
import { ChatRoom } from "@/components/ChatRoom";
import { Switch } from "@/components/ui/switch";
import { SocialNotifications } from "@/components/SocialNotifications";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  generateCertificate,
  generateCertificateBlob,
  loadLogoAsBase64,
  loadSignatureAsBase64,
} from "@/lib/certificate";
import { useTranslation } from "react-i18next";

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
  other: [{ value: "other", label: "Magaalo Kale" }],
};
function DatabaseFlashcardModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { parent } = useParentAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const {
    data: categories = [],
    isLoading: loadingCategories,
    isError: categoriesError,
  } = useQuery({
    queryKey: ["/api/flashcard-categories"],
    queryFn: async () => {
      const res = await fetch("/api/flashcard-categories", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
    enabled: isOpen,
  });

  const {
    data: flashcards = [],
    isLoading: loadingFlashcards,
    isError: flashcardsError,
  } = useQuery({
    queryKey: ["/api/flashcard-categories", selectedCategory, "flashcards"],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const res = await fetch(
        `/api/flashcard-categories/${selectedCategory}/flashcards`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to fetch flashcards");
      return res.json();
    },
    enabled: !!selectedCategory,
  });

  const updateProgress = async (
    flashcardId: string,
    viewed: boolean,
    correct: boolean,
  ) => {
    if (!parent) return;
    try {
      const res = await fetch(`/api/parent/flashcard-progress/${flashcardId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ viewed, correct }),
      });
      if (!res.ok) {
        console.error("Failed to save progress:", res.status);
      }
    } catch (e) {
      console.error("Failed to update progress", e);
    }
  };

  const goNext = () => {
    const card = flashcards[currentIndex];
    if (card) {
      updateProgress(card.id, true, false);
    }
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };
  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };
  const resetAndClose = () => {
    setCurrentIndex(0);
    setSelectedCategory(null);
    onClose();
  };
  const selectCategory = (catId: string) => {
    setSelectedCategory(catId);
    setCurrentIndex(0);
  };

  if (!isOpen) return null;

  const selectedCat = categories.find((c: any) => c.id === selectedCategory);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={resetAndClose}
    >
      <div
        className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg">
              {selectedCategory
                ? selectedCat?.name || "Kaararka"
                : "Dooro Qayb"}
            </h3>
            <p className="text-white/80 text-xs">
              {selectedCategory
                ? selectedCat?.nameEnglish
                : "Choose a Category"}
            </p>
          </div>
          <button
            onClick={resetAndClose}
            className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white"
            data-testid="button-close-db-flashcards"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {!selectedCategory ? (
            <div className="space-y-3">
              {loadingCategories ? (
                <p className="text-center text-gray-500 py-8">
                  Soo dejinaya...
                </p>
              ) : categoriesError ? (
                <p className="text-center text-red-500 py-8">
                  Khalad ayaa dhacay. Isku day mar kale.
                </p>
              ) : categories.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Weli kaaro kuma jiraan
                </p>
              ) : (
                categories.map((cat: any) => (
                  <button
                    key={cat.id}
                    onClick={() => selectCategory(cat.id)}
                    className="w-full p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border hover:border-indigo-300 transition-all flex items-center gap-3"
                    data-testid={`button-category-${cat.id}`}
                  >
                    <span className="text-3xl">{cat.iconEmoji || "📚"}</span>
                    <div className="text-left">
                      <div className="font-semibold">{cat.name}</div>
                      {cat.nameEnglish && (
                        <div className="text-sm text-gray-500">
                          {cat.nameEnglish}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="ml-auto w-5 h-5 text-gray-400" />
                  </button>
                ))
              )}
            </div>
          ) : loadingFlashcards ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Soo dejinaya kaararka...</p>
            </div>
          ) : flashcardsError ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">Khalad ayaa dhacay</p>
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-indigo-600 font-semibold"
              >
                ← Dib u noqo
              </button>
            </div>
          ) : flashcards.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Qaybtan kaaro kuma jiraan</p>
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-indigo-600 font-semibold"
              >
                ← Dib u noqo
              </button>
            </div>
          ) : (
            <>
              <div className="text-center text-sm text-gray-500 mb-4">
                Kaadhka {currentIndex + 1} / {flashcards.length}
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6 border-2 border-indigo-200">
                <img
                  src={flashcards[currentIndex]?.imageUrl}
                  alt={flashcards[currentIndex]?.nameSomali}
                  className="w-full h-48 object-contain rounded-xl mb-4"
                />
                <h2 className="text-4xl font-black text-center text-gray-800 tracking-wide">
                  {flashcards[currentIndex]?.nameSomali.toUpperCase()}
                </h2>
                {flashcards[currentIndex]?.nameEnglish && (
                  <p className="text-center text-gray-500 mt-2">
                    {flashcards[currentIndex]?.nameEnglish}
                  </p>
                )}
              </div>
              <p className="text-center text-gray-600 text-sm mb-4">
                Ilmaha tus sawirka, magaca u akhri cod fasiix ah
              </p>
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className={`flex-1 py-3 rounded-xl font-semibold ${currentIndex === 0 ? "bg-gray-100 text-gray-400" : "bg-gray-200 text-gray-700"}`}
                  data-testid="button-db-flashcard-prev"
                >
                  Ka Hor
                </button>
                <button
                  onClick={goNext}
                  disabled={currentIndex === flashcards.length - 1}
                  className={`flex-1 py-3 rounded-xl font-semibold ${currentIndex === flashcards.length - 1 ? "bg-gray-100 text-gray-400" : "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"}`}
                  data-testid="button-db-flashcard-next"
                >
                  Xiga
                </button>
              </div>
              <button
                onClick={() => setSelectedCategory(null)}
                className="w-full mt-4 text-indigo-600 font-semibold text-sm"
              >
                ← Dooro qayb kale
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TelegramOptIn() {
  const { t } = useTranslation();
  const { parent, refreshParent } = useParentAuth();
  const parentData = parent as any;
  const isLinked = parentData?.telegramOptin && parentData?.telegramChatId;
  const [isLinking, setIsLinking] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isPollng, setIsPolling] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPollng && !isLinked) {
      interval = setInterval(async () => {
        await refreshParent();
      }, 3000);
      const timeout = setTimeout(() => {
        setIsPolling(false);
      }, 60000);
      return () => {
        if (interval) clearInterval(interval);
        clearTimeout(timeout);
      };
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPollng, isLinked, refreshParent]);

  useEffect(() => {
    if (isLinked && isPollng) {
      setIsPolling(false);
      toast.success(t("telegram.linked"));
    }
  }, [isLinked, isPollng, t]);

  const handleLinkTelegram = async () => {
    setIsLinking(true);
    try {
      const res = await fetch("/api/telegram/link", { credentials: "include" });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
        toast.success(t("telegram.openBot"));
        setIsPolling(true);
      }
    } catch (error) {
      toast.error(t("common.error"));
    }
    setIsLinking(false);
  };

  const handleSendTest = async () => {
    setIsSendingTest(true);
    try {
      const res = await fetch("/api/telegram/test", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t("telegram.testSent"));
      } else {
        toast.error(data.error || t("telegram.testFailed"));
      }
    } catch (error) {
      toast.error(t("common.error"));
    }
    setIsSendingTest(false);
  };

  if (isLinked) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-green-700 bg-green-100 px-3 py-2 rounded-lg">
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">{t("telegram.linked")}</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSendTest}
          disabled={isSendingTest}
          className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
          data-testid="button-telegram-test"
        >
          {isSendingTest ? t("telegram.sending") : t("telegram.sendTest")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        onClick={handleLinkTelegram}
        disabled={isLinking || isPollng}
        className="bg-[#0088cc] hover:bg-[#006699] h-9"
        data-testid="button-link-telegram"
      >
        {isPollng
          ? t("telegram.waiting")
          : isLinking
            ? t("telegram.opening")
            : t("telegram.connect")}
      </Button>
      {isPollng && (
        <p className="text-xs text-gray-500">{t("telegram.startBot")}</p>
      )}
    </div>
  );
}

function PushNotificationToggle() {
  const { t } = useTranslation();
  const {
    isSupported,
    isServerEnabled,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  } = usePushNotifications();
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  const handleToggle = async () => {
    if (isSubscribed) {
      setShowDisableConfirm(true);
    } else {
      const success = await subscribe();
      if (success) {
        toast.success(t("notifications.pushEnabled"));
      } else if (permission === "denied") {
        toast.error(t("notifications.allowBrowser"));
      } else if (!isServerEnabled) {
        toast.error(t("notifications.notWorking"));
      }
    }
  };

  const confirmDisable = async () => {
    await unsubscribe();
    toast.success(t("notifications.pushDisabled"));
    setShowDisableConfirm(false);
  };

  // Hide if browser doesn't support or server doesn't have push enabled
  if (!isSupported || (!isLoading && !isServerEnabled)) {
    return null;
  }

  // If already subscribed, show smaller toggle
  if (isSubscribed) {
    return (
      <>
        <div className="px-4 -mt-8 relative z-10 mb-4">
          <div 
            className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between shadow-sm cursor-help"
            title="Waxaad heli doontaa fariimo xasuusin ah marka la soo daro wax cusub sida casharada, maqaalada, iyo sheekooyin carruurta. Ka xir haddii aadan rabin inaad hesho."
          >
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-green-600" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-green-800">
                  Xasuusinta waa kuu Shaqaynaysaa ✓
                </span>
                <span className="text-xs text-green-600">
                  Waxaa laguu soo dirayaa fariimo marka wax cusub la soo daro
                </span>
              </div>
            </div>
            <Switch
              checked={true}
              onCheckedChange={handleToggle}
              disabled={isLoading}
              data-testid="switch-push-notifications"
              title="Ka fur ama ka xir xasuusinta"
            />
          </div>
        </div>

        <AlertDialog
          open={showDisableConfirm}
          onOpenChange={setShowDisableConfirm}
        >
          <AlertDialogContent className="max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
                <BellOff className="w-5 h-5" />
                Xasuusinta Xir?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Ma hubtaa inaad doonayso inaad iska xirto fariimaha cusub ee
                BSA.v1?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDisableConfirm(false)}>
                Maya, Sii Shaqee
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-orange-600 hover:bg-orange-700"
                onClick={confirmDisable}
              >
                Haa, Xir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Show prominent button if not subscribed
  return (
    <div className="px-4 -mt-8 relative z-10 mb-4">
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:via-amber-600 hover:to-orange-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] animate-pulse"
        data-testid="btn-enable-push"
        title="Fur xasuusinta si aad u hesho fariimo marka wax cusub la soo daro sida casharada, maqaalada, iyo sheekooyin carruurta"
      >
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <Bell className="w-6 h-6" />
        </div>
        <div className="text-left">
          <div className="text-base">🔔 Xasuusin Fur - Hel Wixii Cusub</div>
          <div className="text-xs font-normal opacity-90">
            Waxaa laguu soo dirayaa fariimo marka cashar, maqaal, ama sheeko cusub la soo daro
          </div>
        </div>
      </button>
      {permission === "denied" && (
        <p className="text-xs text-red-500 mt-2 text-center bg-red-50 p-2 rounded-lg">
          {t("notifications.denied")}
        </p>
      )}
    </div>
  );
}

function DailyReminderSettings() {
  const { parent, refreshParent } = useParentAuth();
  const [enabled, setEnabled] = useState(parent?.dailyReminderEnabled || false);
  const [time, setTime] = useState(parent?.dailyReminderTime || "08:00");
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    if (parent) {
      setEnabled(parent.dailyReminderEnabled || false);
      setTime(parent.dailyReminderTime || "08:00");
    }
  }, [parent]);
  
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/parent/reminder-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled, time }),
      });
      if (res.ok) {
        toast.success(enabled 
          ? `Xusuusinta waxay kuu iman doontaa ${time} maalin kasta` 
          : "Xusuusinta waa la damiyay"
        );
        refreshParent?.();
      } else {
        toast.error("Khalad ayaa dhacay");
      }
    } catch (error) {
      toast.error("Khalad ayaa dhacay");
    }
    setSaving(false);
  };
  
  const timeOptions = [
    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
    "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
    "18:00", "19:00", "20:00", "21:00"
  ];
  
  return (
    <div className="px-4 mt-4">
      <Card className="border-none shadow-md bg-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">
                  Xusuusin Maalin Kasta
                </h3>
                <p className="text-xs text-gray-500">
                  Wakhti doorato waxbarashada
                </p>
              </div>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(checked) => {
                setEnabled(checked);
              }}
              data-testid="switch-daily-reminder"
            />
          </div>
          
          {enabled && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <Label className="text-sm text-gray-600 min-w-[80px]">
                  Wakhti:
                </Label>
                <Select value={time} onValueChange={setTime}>
                  <SelectTrigger className="flex-1" data-testid="select-reminder-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t} {parseInt(t) < 12 ? "(Subax)" : parseInt(t) < 17 ? "(Galab)" : "(Fiid)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full bg-amber-500 hover:bg-amber-600"
                onClick={handleSave}
                disabled={saving}
                data-testid="button-save-reminder"
              >
                {saving ? "Keydinayaa..." : "Keydi Xusuusinta"}
              </Button>
            </div>
          )}
          
          {!enabled && (
            <p className="text-xs text-gray-400 mt-2">
              Fur si aad u hesho xusuusin maalin kasta waxbarashada
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Profile() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { parent, logout, refreshParent } = useParentAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(parent?.name || "");
  const [editPicture, setEditPicture] = useState(parent?.picture || "");
  const [editPhone, setEditPhone] = useState(parent?.phone || "");
  const [editCountry, setEditCountry] = useState(parent?.country || "");
  const [editCity, setEditCity] = useState(parent?.city || "");
  const [showDatabaseFlashcards, setShowDatabaseFlashcards] = useState(false);
  const [showMessenger, setShowMessenger] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<{
    id: string;
    participantName: string;
    participantPicture: string | null;
  } | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: enrollments = [] } = useQuery({
    queryKey: ["parentEnrollments", parent?.id],
    queryFn: async () => {
      const res = await fetch("/api/parent/enrollments", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!parent,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses");
      return res.json();
    },
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["allLessons"],
    queryFn: async () => {
      const res = await fetch("/api/lessons");
      return res.json();
    },
  });

  const { data: progressData = [] } = useQuery({
    queryKey: ["lessonProgress", parent?.id],
    queryFn: async () => {
      const res = await fetch("/api/parent/progress", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!parent,
  });

  // Fetch streak data (scoped by parent ID for security)
  const { data: streakData } = useQuery({
    queryKey: ["parentStreak", parent?.id],
    queryFn: async () => {
      const res = await fetch("/api/parent/streak", { credentials: "include" });
      if (!res.ok) return { currentStreak: 0, longestStreak: 0 };
      return res.json();
    },
    enabled: !!parent,
  });

  const { data: earnedBadges = [] } = useQuery<{ id: string; parentId: string; badgeId: string; awardedAt: string }[]>({
    queryKey: ["earnedBadges"],
    queryFn: async () => {
      const res = await fetch("/api/badges/earned", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!parent,
  });

  const { data: contentProgressSummary } = useQuery<{ dhambaalCount: number; sheekoCount: number }>({
    queryKey: ["contentProgressSummary"],
    queryFn: async () => {
      const res = await fetch("/api/content-progress/summary", { credentials: "include" });
      if (!res.ok) return { dhambaalCount: 0, sheekoCount: 0 };
      return res.json();
    },
    enabled: !!parent,
  });

  // Fetch own profile for followers/following counts
  const { data: ownProfile } = useQuery<{
    followersCount: number;
    followingCount: number;
  }>({
    queryKey: [`/api/parents/${parent?.id}/profile`],
    queryFn: async () => {
      const res = await fetch(`/api/parents/${parent?.id}/profile`, { credentials: "include" });
      if (!res.ok) return { followersCount: 0, followingCount: 0 };
      return res.json();
    },
    enabled: !!parent?.id,
  });

  // Fetch assessment history (scoped by parent ID for security)
  const { data: assessmentHistoryData = [] } = useQuery<any[]>({
    queryKey: ["assessmentHistory", parent?.id],
    queryFn: async () => {
      const res = await fetch("/api/parent/assessment-history", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!parent,
  });

  // Derive latest assessment from shared data
  const latestAssessment =
    assessmentHistoryData.filter(
      (a: any) => a.status === "analyzed" || a.status === "completed",
    )[0] || null;

  // Fetch parent's appointments
  const { data: appointments = [] } = useQuery({
    queryKey: ["parentAppointments"],
    queryFn: async () => {
      const res = await fetch("/api/parent/appointments", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!parent,
  });

  // Filter to only show approved upcoming appointments
  const upcomingAppointments = appointments
    .filter((apt: any) => {
      if (apt.status !== "approved") return false;
      const aptDateTime = new Date(
        `${apt.appointmentDate}T${apt.appointmentTime}`,
      );
      return aptDateTime > new Date();
    })
    .sort((a: any, b: any) => {
      const dateA = new Date(`${a.appointmentDate}T${a.appointmentTime}`);
      const dateB = new Date(`${b.appointmentDate}T${b.appointmentTime}`);
      return dateA.getTime() - dateB.getTime();
    });

  // Fetch parents list for new conversation modal
  const { data: parentsList = [] } = useQuery<
    { id: string; name: string; picture: string | null }[]
  >({
    queryKey: ["parentsList"],
    queryFn: async () => {
      const res = await fetch("/api/parents", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!parent && showNewConversation,
  });

  // Fetch unread message count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["unreadCount"],
    queryFn: async () => {
      const res = await fetch("/api/conversations/unread-count", {
        credentials: "include",
      });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    enabled: !!parent,
  });

  // Fetch upgrade-eligible enrollments (monthly subscriptions - active or expired)
  const { data: upgradeEligibilityData } = useQuery<{
    eligibleEnrollments: any[];
  }>({
    queryKey: ["upgradeEligibility", parent?.id],
    queryFn: async () => {
      const res = await fetch("/api/parent/upgrade-eligibility", {
        credentials: "include",
      });
      if (!res.ok) return { eligibleEnrollments: [] };
      return res.json();
    },
    enabled: !!parent,
  });

  const upgradeEligibleEnrollments =
    upgradeEligibilityData?.eligibleEnrollments || [];

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (participantId: string) => {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ participantId }),
      });
      if (!res.ok) throw new Error("Failed to create conversation");
      return res.json();
    },
    onSuccess: (conversation, participantId) => {
      const selectedParent = parentsList.find((p) => p.id === participantId);
      setShowNewConversation(false);
      setSearchQuery("");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setSelectedConversation({
        id: conversation.id,
        participantName: selectedParent?.name || "Unknown",
        participantPicture: selectedParent?.picture || null,
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      picture: string;
      phone: string;
      country: string;
      city: string;
    }) => {
      const res = await fetch("/api/parent/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: async () => {
      toast.success(t("profilePage.profileUpdated"));
      setIsEditing(false);
      await refreshParent();
    },
    onError: () => {
      toast.error(t("common.error"));
    },
  });

  const activeEnrollments = enrollments.filter(
    (e: any) => e.status === "active",
  );

  const enrolledCourses = activeEnrollments
    .map((enrollment: any) => {
      const course = courses.find((c: any) => c.id === enrollment.courseId);
      const courseLessons = lessons
        .filter((l: any) => l.courseId === enrollment.courseId)
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      const courseProgress = progressData.filter(
        (p: any) => p.courseId === enrollment.courseId,
      );
      const completedLessonIds = courseProgress
        .filter((p: any) => p.completed)
        .map((p: any) => p.lessonId);
      const completedLessonsCount = completedLessonIds.length;
      const totalLessons = courseLessons.length;
      const progressPercent =
        totalLessons > 0
          ? Math.round((completedLessonsCount / totalLessons) * 100)
          : 0;
      const isCompleted = progressPercent === 100;

      // Find the current lesson (first uncompleted lesson in order, or first lesson if none completed)
      const currentLesson =
        courseLessons.find((l: any) => !completedLessonIds.includes(l.id)) ||
        courseLessons[0];

      // Find the last accessed time (most recent lastViewedAt, completedAt, or videoWatchedAt from progress)
      const lastAccessedProgress = courseProgress
        .filter((p: any) => p.lastViewedAt || p.completedAt || p.videoWatchedAt)
        .sort((a: any, b: any) => {
          const dateA = new Date(
            a.lastViewedAt || a.completedAt || a.videoWatchedAt || 0,
          ).getTime();
          const dateB = new Date(
            b.lastViewedAt || b.completedAt || b.videoWatchedAt || 0,
          ).getTime();
          return dateB - dateA;
        })[0];
      const lastAccessedTime =
        lastAccessedProgress?.lastViewedAt ||
        lastAccessedProgress?.completedAt ||
        lastAccessedProgress?.videoWatchedAt;

      const courseCompletedAt = isCompleted
        ? courseProgress
            .filter((p: any) => p.completedAt)
            .map((p: any) => new Date(p.completedAt).getTime())
            .sort((a: number, b: number) => b - a)[0] || null
        : null;

      return course
        ? {
            ...course,
            enrollment,
            completedLessons: completedLessonsCount,
            totalLessons,
            progressPercent,
            isCompleted,
            currentLesson,
            lastAccessedTime,
            courseCompletedAt,
          }
        : null;
    })
    .filter(Boolean);

  // Sort enrolled courses: by category (general first), then by lesson count (courses with lessons first), then by order
  const sortedEnrolledCourses = [...enrolledCourses].sort((a: any, b: any) => {
    // First by category: general before special
    if (a.category !== b.category) {
      return a.category === "general" ? -1 : 1;
    }
    // Then by lesson count (courses with lessons first)
    if (a.totalLessons !== b.totalLessons) {
      return b.totalLessons - a.totalLessons;
    }
    // Then by order
    return (a.order || 0) - (b.order || 0);
  });

  // Group by category
  const generalCourses = sortedEnrolledCourses.filter(
    (c: any) => c.category === "general",
  );
  const specialCourses = sortedEnrolledCourses.filter(
    (c: any) => c.category === "special",
  );

  const completedCourses = enrolledCourses.filter((c: any) => c.isCompleted);
  const inProgressCourses = enrolledCourses.filter((c: any) => !c.isCompleted);

  // Check if user has All-Access subscription (need to check before using in filter)
  const allAccessCourseCheck = courses.find((c: any) => c.courseId === "all-access");
  const hasAllAccessCheck = activeEnrollments.some(
    (e: any) => allAccessCourseCheck && e.courseId === allAccessCourseCheck.id && e.status === "active"
  );
  const enrolledCourseIdsCheck = activeEnrollments.map((e: any) => e.courseId);

  // All courses the parent has access to: enrolled courses OR all contentReady courses if All-Access
  const allOpenCourses = courses
    .filter((c: any) => {
      if (c.courseId === "all-access") return false;
      if (!c.contentReady) return false;
      // Parent has access if: enrolled in this course OR has All-Access subscription
      return enrolledCourseIdsCheck.includes(c.id) || hasAllAccessCheck;
    })
    .map((course: any) => {
      const courseLessons = lessons
        .filter((l: any) => l.courseId === course.id)
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      const courseProgress = progressData.filter(
        (p: any) => p.courseId === course.id,
      );
      const completedLessonIds = courseProgress
        .filter((p: any) => p.completed)
        .map((p: any) => p.lessonId);
      const completedLessonsCount = completedLessonIds.length;
      const totalLessons = courseLessons.length;
      const progressPercent =
        totalLessons > 0
          ? Math.round((completedLessonsCount / totalLessons) * 100)
          : 0;
      const isCompleted = progressPercent === 100;
      const hasStarted = courseProgress.length > 0;

      // Find the current lesson (first uncompleted lesson in order, or first lesson if none)
      const currentLesson =
        courseLessons.find((l: any) => !completedLessonIds.includes(l.id)) ||
        courseLessons[0];

      // Find the last accessed time
      const lastAccessedProgress = courseProgress
        .filter((p: any) => p.lastViewedAt || p.completedAt || p.videoWatchedAt)
        .sort((a: any, b: any) => {
          const dateA = new Date(
            a.lastViewedAt || a.completedAt || a.videoWatchedAt || 0,
          ).getTime();
          const dateB = new Date(
            b.lastViewedAt || b.completedAt || b.videoWatchedAt || 0,
          ).getTime();
          return dateB - dateA;
        })[0];
      const lastAccessedTime =
        lastAccessedProgress?.lastViewedAt ||
        lastAccessedProgress?.completedAt ||
        lastAccessedProgress?.videoWatchedAt;

      return {
        ...course,
        completedLessons: completedLessonsCount,
        totalLessons,
        progressPercent,
        isCompleted,
        hasStarted,
        currentLesson,
        lastAccessedTime,
      };
    })
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

  // Check if user has All-Access subscription
  const allAccessCourse = courses.find((c: any) => c.courseId === "all-access");
  const hasAllAccessSubscription = activeEnrollments.some(
    (e: any) => allAccessCourse && e.courseId === allAccessCourse.id && e.status === "active"
  );

  // Get enrolled course IDs
  const enrolledCourseIds = activeEnrollments.map((e: any) => e.courseId);

  // Available courses for All-Access subscribers (contentReady=true and not enrolled yet, excluding all-access course itself)
  const availableCourses = hasAllAccessSubscription
    ? courses.filter(
        (c: any) =>
          c.contentReady &&
          c.courseId !== "all-access" &&
          !enrolledCourseIds.includes(c.id)
      )
    : [];

  // Mutation to enroll in a course (for All-Access subscribers)
  const enrollInCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const res = await fetch("/api/parent/enroll-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ courseId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to enroll");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Waad ku guulaysatay! Koorsada ayaad bilaabi kartaa.");
      queryClient.invalidateQueries({ queryKey: ["parentEnrollments"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Khalad ayaa dhacay");
    },
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      queryClient.invalidateQueries({ queryKey: ["parentEnrollments"] });
      setLocation("/");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    if (!editName.trim() || !editPhone.trim() || !editCountry || !editCity) {
      toast.error(
        "Fadlan buuxi dhammaan meelaha: magaca, telefoonka, wadanka, iyo magaalada",
      );
      return;
    }
    updateProfileMutation.mutate({
      name: editName,
      picture: editPicture,
      phone: editPhone,
      country: editCountry,
      city: editCity,
    });
  };

  const handleCancelEdit = () => {
    setEditName(parent?.name || "");
    setEditPicture(parent?.picture || "");
    setEditPhone(parent?.phone || "");
    setEditCountry(parent?.country || "");
    setEditCity(parent?.city || "");
    setIsEditing(false);
  };

  if (!parent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-50 to-blue-100 pb-24 flex items-center justify-center">
        <Card className="max-w-sm mx-4 border-none shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {t("profilePage.welcomeParent")}
            </h2>
            <p className="text-gray-600 mb-6">{t("profilePage.loginPrompt")}</p>
            <Link href="/register">
              <button
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-3 rounded-xl flex items-center gap-2 shadow-lg active:scale-[0.98] transition-all mx-auto"
                data-testid="button-register"
              >
                {t("auth.register")}
              </button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-50 to-blue-100 pb-28 lg:pb-8 font-body">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600 text-white p-6 pt-4 pb-20 relative overflow-hidden">
        {/* Admin Button - Only for admins */}
        {(parent.email === "barbaarintasan@gmail.com" || parent.isAdmin) && (
          <div className="mb-4">
            <Link href="/admin">
              <button
                className="px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-all"
                data-testid="button-admin-header"
              >
                Admin
              </button>
            </Link>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white/30 shadow-lg">
                  <div
                    className="w-full h-full bg-white/20 flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {editPicture ? (
                      <img
                        src={editPicture}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="w-8 h-8 text-white" />
                    )}
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-lg">
                  Wax ka Bedel Profile-kaaga
                </p>
                <p className="text-white/70 text-sm">{parent.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-white text-sm font-medium mb-1.5 block">
                  Magaca Oo Buuxa
                </Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-white border-0 text-gray-900 placeholder:text-gray-400 h-12 text-base rounded-xl"
                  placeholder={t("profilePage.fullNamePlaceholder")}
                  data-testid="input-edit-name"
                />
              </div>
              <div>
                <Label className="text-white text-sm font-medium mb-1.5 block">
                  Telefoon
                </Label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="bg-white border-0 text-gray-900 placeholder:text-gray-400 h-12 text-base rounded-xl"
                  placeholder="+252 xx xxx xxxx"
                  data-testid="input-edit-phone"
                />
              </div>
              <div>
                <Label className="text-white text-sm font-medium mb-1.5 block">
                  Wadanka
                </Label>
                <Select
                  value={editCountry}
                  onValueChange={(val) => {
                    setEditCountry(val);
                    setEditCity("");
                  }}
                >
                  <SelectTrigger
                    className="bg-white border-0 text-gray-900 h-12 text-base rounded-xl"
                    data-testid="select-edit-country"
                  >
                    <SelectValue placeholder="Dooro wadanka" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px] overflow-y-auto">
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.value} value={country.value}>
                        {country.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white text-sm font-medium mb-1.5 block">
                  Magaalada
                </Label>
                <Select value={editCity} onValueChange={setEditCity}>
                  <SelectTrigger
                    className="bg-white border-0 text-gray-900 h-12 text-base rounded-xl"
                    data-testid="select-edit-city"
                  >
                    <SelectValue placeholder="Dooro magaalada" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px] overflow-y-auto">
                    {(CITIES[editCountry] || CITIES["other"] || []).map(
                      (city) => (
                        <SelectItem key={city.value} value={city.value}>
                          {city.label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold h-12 text-base rounded-xl shadow-lg"
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
                data-testid="button-save-profile"
              >
                <Check className="w-5 h-5 mr-2" />
                Kaydi
              </Button>
              <Button
                variant="outline"
                className="flex-1 bg-white hover:bg-gray-100 text-gray-700 font-bold h-12 text-base rounded-xl border-0"
                onClick={handleCancelEdit}
                data-testid="button-cancel-edit"
              >
                <X className="w-5 h-5 mr-2" />
                Jooji
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative flex items-start gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white/30 shadow-lg">
                <Avatar className="w-full h-full rounded-none">
                  <AvatarImage
                    src={parent.picture || ""}
                    className="object-cover"
                  />
                  <AvatarFallback className="rounded-none text-2xl bg-blue-500">
                    {parent.name?.charAt(0) || "W"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              {enrolledCourses.length > 0 && (
                <div className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-900 p-1.5 rounded-lg border-2 border-white shadow">
                  <Crown className="w-4 h-4" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate flex items-center gap-1">
                {parent.isYearlySubscriber && <span title="Xubin Dahabi - Sanad">👑</span>}
                {parent.name || t("profilePage.parent")}
              </h1>
              <p className="text-sm text-white/70 truncate">{parent.email}</p>
              {parent.phone && (
                <p className="text-xs text-white/60">{parent.phone}</p>
              )}
              {(parent.country || parent.city) && (
                <p className="text-xs text-white/60">
                  {[parent.city, parent.country].filter(Boolean).join(", ")}
                </p>
              )}
              {/* Followers/Following counts below profile info */}
              <Link href={`/parent/${parent.id}`} data-testid="link-profile-followers">
                <div className="flex gap-4 mt-2 text-white/90 cursor-pointer hover:text-white transition-colors">
                  <span className="text-sm">
                    <span className="font-bold" data-testid="text-followers-count">{ownProfile?.followersCount || 0}</span> Followers
                  </span>
                  <span className="text-sm">
                    <span className="font-bold" data-testid="text-following-count">{ownProfile?.followingCount || 0}</span> Following
                  </span>
                </div>
              </Link>
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20 h-9 w-9 flex-shrink-0"
              onClick={() => {
                setEditName(parent.name || "");
                setEditPicture(parent.picture || "");
                setEditPhone(parent.phone || "");
                setEditCountry(parent.country || "");
                setEditCity(parent.city || "");
                setIsEditing(true);
              }}
              data-testid="button-edit-profile"
            >
              <Edit2 className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards - Overlapping Header */}
      <div className="px-4 -mt-12 relative z-10">
        <div className="grid grid-cols-4 gap-2">
          <Card
            className="border-none shadow-lg bg-white cursor-pointer hover:shadow-xl transition-shadow active:scale-95"
            onClick={() => document.getElementById("enrolled-courses-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            <CardContent className="p-3 text-center">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-1.5">
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-xl font-bold text-gray-900">
                {enrolledCourses.length}
              </p>
              <p className="text-[10px] text-gray-500">
                {t("profilePage.course")}
              </p>
            </CardContent>
          </Card>
          <Card
            className="border-none shadow-lg bg-white cursor-pointer hover:shadow-xl transition-shadow active:scale-95"
            onClick={() => document.getElementById("in-progress-courses-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            <CardContent className="p-3 text-center">
              <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-1.5">
                <Target className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-xl font-bold text-gray-900">
                {inProgressCourses.length}
              </p>
              <p className="text-[10px] text-gray-500 leading-tight">
                Koorsooyinka kuu Socda
              </p>
            </CardContent>
          </Card>
          <Card
            className="border-none shadow-lg bg-white cursor-pointer hover:shadow-xl transition-shadow active:scale-95"
            onClick={() => document.getElementById("certificates-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            <CardContent className="p-3 text-center">
              <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-1.5">
                <Trophy className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-xl font-bold text-gray-900">
                {completedCourses.length}
              </p>
              <p className="text-[10px] text-gray-500">
                {t("profilePage.completed")}
              </p>
            </CardContent>
          </Card>
          <Link href="/badges">
            <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-yellow-50 cursor-pointer hover:shadow-xl transition-shadow active:scale-95">
              <CardContent className="p-3 text-center">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center mx-auto mb-1.5">
                  <Award className="w-4 h-4 text-white" />
                </div>
                <p className="text-xl font-bold text-amber-600">
                  {earnedBadges.length}
                </p>
                <p className="text-[10px] text-gray-500">Abaalmarinta</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Guruubyadayda - My Groups Card */}
      <div className="px-4 mt-4">
        <Link href="/groups">
          <Card className="border-none shadow-lg bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 cursor-pointer hover:shadow-xl transition-all active:scale-[0.98] overflow-hidden relative">
            <CardContent className="p-4 flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-base">Guruubyadayda</h3>
                <p className="text-white/70 text-xs">Baraha Waalidka - Ku biir wadahadallada</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/60 shrink-0" />
            </CardContent>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          </Card>
        </Link>
      </div>

      {/* Dhambaal & Sheeko Progress */}
      {contentProgressSummary && (
        <div className="px-4 mt-4">
          <Card className="border-none shadow-lg overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900 text-sm">Akhriskaaga & Dhagaysigaaga</h3>
              </div>
              <Link href="/dhambaal">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl cursor-pointer hover:shadow-sm transition-all">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-semibold text-sm">Dhambaalka Waalidka</p>
                    <p className="text-gray-500 text-xs">{contentProgressSummary.dhambaalCount} maqaal ayaad akhriyay</p>
                  </div>
                  <div className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {contentProgressSummary.dhambaalCount}
                  </div>
                </div>
              </Link>
              <Link href="/maaweelo">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl cursor-pointer hover:shadow-sm transition-all">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-semibold text-sm">Sheekada Caruurta</p>
                    <p className="text-gray-500 text-xs">{contentProgressSummary.sheekoCount} sheeko ayaad dhageysatay</p>
                  </div>
                  <div className="bg-indigo-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {contentProgressSummary.sheekoCount}
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gamification & Progress Tracking */}
      <div className="px-4 mt-6 space-y-4">
        <StreakCalendar />
        <WeeklyProgressChart />
        <PointsCard />
        <LeaderboardCard limit={5} />
      </div>

      {/* Push Notifications - Prominent Banner */}
      <PushNotificationToggle />
      
      {/* Daily Reminder Settings */}
      <DailyReminderSettings />

      {/* Messenger Button Card */}
      <div className="px-4 mt-4">
        <Card
          className="border-none shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => setShowMessenger(true)}
          data-testid="button-messenger"
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="relative w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <MessagesSquare className="w-6 h-6 text-white" />
              {(unreadData?.count ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-lg animate-pulse">
                  {(unreadData?.count ?? 0) > 9 ? "9+" : unreadData?.count}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white text-lg">BSA Messenger v1</h3>
              <p className="text-white/80 text-sm">M.S.Aw-Musse</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/70" />
          </CardContent>
        </Card>
      </div>

      {/* Golden Membership Upgrade Section */}
      {upgradeEligibleEnrollments.length > 0 && (
        <div className="px-4 mt-4">
          <Card className="border-none shadow-xl bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 overflow-hidden">
            <CardContent className="p-0">
              {/* Header */}
              <div className="p-4 pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-white/30 rounded-xl flex items-center justify-center">
                    <Crown className="w-7 h-7 text-amber-900" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-900 text-lg">
                      Xubin Dahabi Noqo
                    </h3>
                    <p className="text-amber-800 text-xs">Golden Membership</p>
                  </div>
                </div>

                {/* Value explanation */}
                <div className="bg-white/30 rounded-xl p-3 mt-3">
                  <p className="text-amber-900 text-sm leading-relaxed">
                    Waxaad horay u bixisay{" "}
                    <span className="font-bold">$30</span> oo xubin bille ah.
                    Hadda haddii aad u badalato{" "}
                    <span className="font-bold text-amber-950">
                      Xubin Dahabi
                    </span>{" "}
                    ah waxaad bixinaysaa oo kaliya{" "}
                    <span className="font-bold text-green-800">$85</span>,
                    waxaadna helaysaa in laguugu siyaadiyo wakhtigaaga{" "}
                    <span className="font-bold">11 bilood oo dheeraad ah</span>,
                    dhammaan koorsooyinka halka ku jiraa ay kuu wada furmaan
                    mudadaas.
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-amber-800">
                    <span className="line-through opacity-75">
                      $360/sannadkii
                    </span>
                    <span className="bg-green-600 text-white px-2 py-0.5 rounded-full font-bold">
                      $275 keydsatay!
                    </span>
                  </div>
                </div>
              </div>

              {/* Eligible courses */}
              <div className="px-4 pb-4 space-y-2">
                {upgradeEligibleEnrollments.map((item: any) => (
                  <Link
                    key={item.courseId}
                    href={`/course/${item.courseId}?upgrade=true&planType=yearly&amount=85`}
                  >
                    <div className="bg-white/90 rounded-xl p-3 flex items-center gap-3 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-amber-500 to-orange-600">
                        {item.courseImageUrl ? (
                          <img
                            src={item.courseImageUrl}
                            alt={item.courseTitle}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                            {item.courseTitle?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">
                          {item.courseTitle}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {item.isActive ? (
                            <span className="text-green-600">
                              {item.daysRemaining} maalmood oo hadhay + 11
                              bilood
                            </span>
                          ) : (
                            <span className="text-orange-600">
                              Waqtigiisa dhacay - 11 bilood cusub!
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-green-700">
                          $85
                        </span>
                        <ChevronRight className="w-5 h-5 text-amber-600" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subscription Countdown Section */}
      {(() => {
        // Helper to detect lifetime subscriptions
        const isLifetimeEnrollment = (enrollment: any) => {
          if (!enrollment) return false;
          if (
            enrollment.planType === "lifetime" ||
            enrollment.planType === "onetime"
          )
            return true;
          if (!enrollment.accessEnd) return true;
          const accessEnd = new Date(enrollment.accessEnd);
          const now = new Date();
          const daysRemaining = Math.ceil(
            (accessEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          return daysRemaining > 1825; // More than 5 years = lifetime
        };

        // Find the earliest expiring subscription (exclude lifetime)
        const coursesWithExpiry = sortedEnrolledCourses
          .filter(
            (c: any) =>
              c.enrollment?.accessEnd && !isLifetimeEnrollment(c.enrollment),
          )
          .map((c: any) => {
            const accessEnd = new Date(c.enrollment.accessEnd);
            const now = new Date();
            const daysRemaining = Math.ceil(
              (accessEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            return { ...c, accessEnd, daysRemaining };
          })
          .filter((c: any) => c.daysRemaining > 0)
          .sort((a: any, b: any) => a.daysRemaining - b.daysRemaining);

        const earliestExpiring = coursesWithExpiry[0];
        const hasLifetimeCourses = sortedEnrolledCourses.some((c: any) =>
          isLifetimeEnrollment(c.enrollment),
        );

        if (!earliestExpiring && !hasLifetimeCourses) return null;

        // Calculate progress for circular indicator (based on plan type)
        const planDays: Record<string, number> = { monthly: 30, yearly: 365 };
        const totalDays =
          planDays[earliestExpiring?.enrollment?.planType] || 30;
        const progressPercent = earliestExpiring
          ? Math.min(
              100,
              Math.max(0, (earliestExpiring.daysRemaining / totalDays) * 100),
            )
          : 100;
        const strokeDasharray = 2 * Math.PI * 45; // radius = 45
        const strokeDashoffset = strokeDasharray * (1 - progressPercent / 100);

        // Color based on days remaining
        const getColor = (days: number) => {
          if (days <= 3)
            return {
              bg: "from-red-500 to-red-600",
              ring: "#ef4444",
              text: "text-red-600",
            };
          if (days <= 7)
            return {
              bg: "from-orange-500 to-amber-500",
              ring: "#f59e0b",
              text: "text-orange-600",
            };
          if (days <= 14)
            return {
              bg: "from-yellow-500 to-yellow-600",
              ring: "#eab308",
              text: "text-yellow-600",
            };
          return {
            bg: "from-green-500 to-emerald-500",
            ring: "#22c55e",
            text: "text-green-600",
          };
        };

        const colors = earliestExpiring
          ? getColor(earliestExpiring.daysRemaining)
          : {
              bg: "from-green-500 to-emerald-500",
              ring: "#22c55e",
              text: "text-green-600",
            };

        return (
          <div className="px-4 mt-4">
            <Card
              className={`border-none shadow-xl overflow-hidden ${earliestExpiring?.daysRemaining <= 7 ? "animate-pulse-subtle" : ""}`}
            >
              <CardContent className="p-0">
                <div className={`bg-gradient-to-r ${colors.bg} p-4`}>
                  <div className="flex items-center gap-4">
                    {/* Circular Progress Indicator */}
                    <div className="relative w-24 h-24 flex-shrink-0">
                      <svg
                        className="w-full h-full transform -rotate-90"
                        viewBox="0 0 100 100"
                      >
                        {/* Background circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="rgba(255,255,255,0.3)"
                          strokeWidth="8"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="white"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      {/* Center content */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {hasLifetimeCourses && !earliestExpiring ? (
                          <>
                            <span className="text-white text-xl">∞</span>
                            <span className="text-white/80 text-[8px] font-medium">
                              WELIGAA
                            </span>
                          </>
                        ) : earliestExpiring?.enrollment?.planType ===
                          "yearly" ? (
                          <>
                            <span className="text-white text-2xl font-bold">
                              {Math.ceil(earliestExpiring.daysRemaining / 30)}
                            </span>
                            <span className="text-white/80 text-[8px] font-medium">
                              BILO
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-white text-2xl font-bold">
                              {earliestExpiring?.daysRemaining}
                            </span>
                            <span className="text-white/80 text-[8px] font-medium">
                              MAALMOOD
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Text content */}
                    <div className="flex-1 text-white">
                      {hasLifetimeCourses && !earliestExpiring ? (
                        <>
                          <h3 className="font-bold text-lg">
                            ✨ Weligaa Furan!
                          </h3>
                          <p className="text-white/80 text-sm mt-1">
                            Koorsooyinkeena waxay kuu furan yihiin Abiyo,
                            waliigeed. Waxaa tahay Xubin Dahabi ah oo muhiim ah.
                          </p>
                        </>
                      ) : (
                        <>
                          <h3 className="font-bold text-sm flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Wakhtiga kaaga haray in App-ka uu kuu shaqeeyo
                          </h3>
                          <p className="text-white/90 text-sm mt-1 font-medium">
                            {earliestExpiring?.title}
                          </p>
                          <p className="text-xs mt-1">
                            <span className="text-white/70">
                              Wuxuu kaa dhacayaa oo lacagta dambe lagaa
                              rabaa:{" "}
                            </span>
                            <span className="text-red-200 font-bold bg-red-900/40 px-2 py-0.5 rounded">
                              {earliestExpiring?.accessEnd.toLocaleDateString(
                                "so-SO",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </p>
                          <Link href="/subscription">
                            <button
                              className={`mt-2 px-4 py-1.5 text-xs font-bold rounded-lg shadow-md active:scale-[0.98] transition-all ${
                                earliestExpiring?.daysRemaining <= 7
                                  ? "bg-white text-gray-900 animate-pulse"
                                  : "bg-white/20 text-white border border-white/30 hover:bg-white/30"
                              }`}
                              data-testid="button-renew-subscription-banner"
                            >
                              {earliestExpiring?.enrollment?.planType ===
                                "yearly" &&
                              earliestExpiring?.daysRemaining <= 30 ? (
                                <>💰 Bixi $114 Sanadka Cusub</>
                              ) : earliestExpiring?.enrollment?.planType ===
                                "monthly" ? (
                                <>💰 Bixi $30 Bisha Soo Socota</>
                              ) : (
                                <>🔄 Cusboonaysii Wakhtiga</>
                              )}
                            </button>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* All subscriptions summary */}
                {coursesWithExpiry.length > 1 && (
                  <div className="p-3 bg-gray-50 border-t">
                    <p className="text-xs text-gray-500 mb-2">
                      Dhammaan koorsadaada:
                    </p>
                    <div className="space-y-1">
                      {coursesWithExpiry.slice(0, 3).map((c: any) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-gray-700 truncate flex-1">
                            {c.title}
                          </span>
                          <span
                            className={`font-medium ${c.daysRemaining <= 7 ? "text-red-600" : "text-gray-600"}`}
                          >
                            {c.enrollment?.planType === "yearly"
                              ? `${Math.ceil(c.daysRemaining / 30)} bilo`
                              : `${c.daysRemaining} maalmood`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Shaqo Guri - Flashcard Learning Section for enrolled parents */}
      {sortedEnrolledCourses.length > 0 && (
        <div className="px-4 mt-6">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-200 shadow-sm">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-700 mb-2">
                Maalin kasta 7 sawir tus ilmahaaga, magaca u akhri cod fasiix ah, ugu celcel 3 jeer iyo ka badan.
              </p>
              <h2 className="text-2xl font-black text-gray-900">
                Kaararka Waxbarashada
              </h2>
            </div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full">
                LAYLISYO
              </span>
              <span className="text-[10px] text-gray-500">
                ku haboon: 4 Bilood jir - 7 Sano jir
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="px-3 py-1.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                ✓ "Maalin kasta waa Maalin waxbarasho" Barbaarintasan Academy. Tarbiyad Aqoon ku dhisan.
              </span>
            </div>
            <div>
              <button
                onClick={() => setShowDatabaseFlashcards(true)}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold py-3 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base"
                data-testid="button-flashcards-profile"
              >
                <Play className="w-5 h-5" />
                Bilow Barashada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Open Courses - Show progress for each */}
      {allOpenCourses.length > 0 && (
        <div id="in-progress-courses-section" className="px-4 mt-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Koorsadaada kuu Furan
          </h2>
          <div className="space-y-3">
            {allOpenCourses.map((course: any) => (
              <Card
                key={course.id}
                className="border-none shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 overflow-hidden"
                data-testid={`current-course-${course.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Course Image */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-400 to-indigo-500 shadow-md">
                      {course.imageUrl ? (
                        <img
                          src={course.imageUrl}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Course Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm truncate">
                        {course.title}
                      </h3>

                      {/* Progress Bar */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">
                            {course.completedLessons}/{course.totalLessons}{" "}
                            cashar
                          </span>
                          <span className="font-bold text-blue-600">
                            {course.progressPercent}%
                          </span>
                        </div>
                        <Progress
                          value={course.progressPercent}
                          className="h-2 bg-blue-100"
                        />
                      </div>

                      {/* Current Lesson - Show Bilow for not started, Sii wad for in progress */}
                      {course.currentLesson && (
                        <Link href={`/lesson/${course.currentLesson.id}`}>
                          <div
                            className={`mt-3 p-2 rounded-lg border transition-colors cursor-pointer ${
                              course.hasStarted 
                                ? "bg-white border-blue-200 hover:border-blue-400" 
                                : "bg-green-50 border-green-200 hover:border-green-400"
                            }`}
                            data-testid={`continue-lesson-${course.currentLesson.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                course.hasStarted ? "bg-blue-500" : "bg-green-500"
                              }`}>
                                <Play className="w-4 h-4 text-white fill-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500">
                                  {course.hasStarted ? "Sii wad casharka:" : "Bilow koorsada:"}
                                </p>
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {course.currentLesson.title}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            </div>
                          </div>
                        </Link>
                      )}

                      {/* Last Accessed Time */}
                      {course.lastAccessedTime && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>
                            Waxaa Koorsada Casharadeeda kuu dambaysay:{" "}
                            {new Date(
                              course.lastAccessedTime,
                            ).toLocaleDateString("so-SO", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Parenting Style Result - Prominent Display */}
      {latestAssessment?.insights?.parentingStyle && (
        <div className="px-4 mt-4">
          <Card className="border-none shadow-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            <CardContent className="p-4 relative">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/70 text-xs font-medium mb-1">
                    Nooca Waalidnimadaada
                  </p>
                  <h3 className="text-xl font-bold text-white leading-tight">
                    {latestAssessment.insights.parentingStyle}
                  </h3>
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-[8px]">📚</span>
                    </div>
                    <p className="text-white/60 text-[10px]">
                      Baaris-cilmiyeedka Diana Baumrind - Four Parenting Styles
                    </p>
                  </div>
                </div>
              </div>
              {latestAssessment.insights.summary && (
                <div className="mt-3 pt-3 border-t border-white/20">
                  <p className="text-white/80 text-xs leading-relaxed line-clamp-2">
                    {latestAssessment.insights.summary}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assessment History Section - "Qiimaynta Waalidnimadaada iyo Heerka Ilmahaaga" */}
      <AssessmentHistorySection />

      {/* All Enrolled Courses by Category */}
      {sortedEnrolledCourses.length > 0 && (
        <div id="enrolled-courses-section" className="px-4 mt-6">
          {/* General Courses Section */}
          {generalCourses.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                {t("profilePage.generalCourses")} ({generalCourses.length})
              </h2>
              <div className="space-y-2">
                {generalCourses.map((course: any) => {
                  const enrollment = course.enrollment;
                  const accessEnd = enrollment?.accessEnd
                    ? new Date(enrollment.accessEnd)
                    : null;
                  const now = new Date();
                  const daysUntilExpiry = accessEnd
                    ? Math.ceil(
                        (accessEnd.getTime() - now.getTime()) /
                          (1000 * 60 * 60 * 24),
                      )
                    : null;
                  const isLifetime =
                    enrollment?.planType === "lifetime" ||
                    enrollment?.planType === "onetime" ||
                    !accessEnd ||
                    (daysUntilExpiry !== null && daysUntilExpiry > 1825);
                  const isExpiringSoon =
                    !isLifetime &&
                    daysUntilExpiry !== null &&
                    daysUntilExpiry <= 7;

                  return (
                    <div key={course.id}>
                      <Link href={`/course/${course.courseId}`}>
                        <Card
                          className={`border-none shadow-sm bg-white hover:shadow-md transition-shadow cursor-pointer ${isExpiringSoon ? "border-l-4 border-l-orange-500" : ""}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600">
                                {course.imageUrl ? (
                                  <img
                                    src={course.imageUrl}
                                    alt={course.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                                    {course.title?.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
                                  {course.title}
                                </h3>
                                <p className="text-xs text-gray-500">
                                  {isLifetime ? (
                                    <span className="text-green-600">
                                      ✓ Weligaa furan
                                    </span>
                                  ) : accessEnd ? (
                                    <span
                                      className={
                                        isExpiringSoon
                                          ? "text-orange-600 font-medium"
                                          : "text-gray-500"
                                      }
                                    >
                                      {isExpiringSoon
                                        ? `⏰ ${daysUntilExpiry} maalmood oo u hartay`
                                        : `Ilaa ${accessEnd.toLocaleDateString("so-SO")}`}
                                    </span>
                                  ) : (
                                    `${course.totalLessons} ${t("courses.lessons")}`
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {course.progressPercent > 0 && (
                                  <span className="text-xs font-medium text-blue-600">
                                    {course.progressPercent}%
                                  </span>
                                )}
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                      {isExpiringSoon && (
                        <Link href={`/course/${course.courseId}?renew=true`}>
                          <button
                            className="w-full mt-1 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold rounded-lg shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-1"
                            data-testid={`button-renew-${course.courseId}`}
                          >
                            🔄 Cusboonaysii Koorsada
                          </button>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special Courses Section */}
          {specialCourses.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Crown className="w-4 h-4 text-orange-500" />
                {t("profilePage.specialCourses")} ({specialCourses.length})
              </h2>
              <div className="space-y-2">
                {specialCourses.map((course: any) => {
                  const enrollment = course.enrollment;
                  const accessEnd = enrollment?.accessEnd
                    ? new Date(enrollment.accessEnd)
                    : null;
                  const now = new Date();
                  const daysUntilExpiry = accessEnd
                    ? Math.ceil(
                        (accessEnd.getTime() - now.getTime()) /
                          (1000 * 60 * 60 * 24),
                      )
                    : null;
                  const isLifetime =
                    enrollment?.planType === "lifetime" ||
                    enrollment?.planType === "onetime" ||
                    !accessEnd ||
                    (daysUntilExpiry !== null && daysUntilExpiry > 1825);
                  const isExpiringSoon =
                    !isLifetime &&
                    daysUntilExpiry !== null &&
                    daysUntilExpiry <= 7;

                  return (
                    <div key={course.id}>
                      <Link href={`/course/${course.courseId}`}>
                        <Card
                          className={`border-none shadow-sm bg-gradient-to-r from-orange-50 to-amber-50 hover:shadow-md transition-shadow cursor-pointer ${isExpiringSoon ? "border-l-4 border-l-red-500" : "border-l-2 border-l-orange-400"}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-orange-500 to-amber-600">
                                {course.imageUrl ? (
                                  <img
                                    src={course.imageUrl}
                                    alt={course.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                                    {course.title?.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
                                  {course.title}
                                </h3>
                                <p className="text-xs text-gray-500">
                                  {isLifetime ? (
                                    <span className="text-green-600">
                                      ✓ Weligaa furan
                                    </span>
                                  ) : accessEnd ? (
                                    <span
                                      className={
                                        isExpiringSoon
                                          ? "text-red-600 font-medium"
                                          : "text-gray-500"
                                      }
                                    >
                                      {isExpiringSoon
                                        ? `⏰ ${daysUntilExpiry} maalmood oo u hartay`
                                        : `Ilaa ${accessEnd.toLocaleDateString("so-SO")}`}
                                    </span>
                                  ) : (
                                    `${course.totalLessons} ${t("courses.lessons")}`
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {course.progressPercent > 0 && (
                                  <span className="text-xs font-medium text-orange-600">
                                    {course.progressPercent}%
                                  </span>
                                )}
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                      {isExpiringSoon && (
                        <Link href={`/course/${course.courseId}?renew=true`}>
                          <button
                            className="w-full mt-1 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-lg shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-1"
                            data-testid={`button-renew-special-${course.courseId}`}
                          >
                            🔄 Cusboonaysii Koorsada
                          </button>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Offline Downloads */}
      <div className="px-4 mt-6">
        <Link href="/downloads">
          <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 cursor-pointer hover:shadow-xl transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                  <Download className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-sm">
                    Casharrada La Keydiyey
                  </h3>
                  <p className="text-white/80 text-xs mt-0.5">
                    Daawo casharrada adigoo aan internet lahayn
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/70" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Book Appointment with Teacher */}
      <div className="px-4 mt-6">
        <Link href="/appointments">
          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 cursor-pointer hover:shadow-xl transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-sm">
                    Ballan ka Qabso Macalimiinta
                  </h3>
                  <p className="text-white/80 text-xs mt-0.5">
                    Qabso Ballan si aad ula hadasho Macalimiinta
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/70" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Upcoming Approved Appointments */}
      {upcomingAppointments.length > 0 && (
        <div className="px-4 mt-4">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-500" />
            Ballannada Soo Socda ({upcomingAppointments.length})
          </h3>
          <div className="space-y-3">
            {upcomingAppointments.map((apt: any) => {
              const aptDate = new Date(
                `${apt.appointmentDate}T${apt.appointmentTime}`,
              );
              const now = new Date();
              const diffMs = aptDate.getTime() - now.getTime();
              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
              const diffHours = Math.floor(
                (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
              );

              const formatDate = (dateStr: string) => {
                const [year, month, day] = dateStr.split("-");
                const months = [
                  "Jan",
                  "Feb",
                  "Mar",
                  "Apr",
                  "May",
                  "Jun",
                  "Jul",
                  "Aug",
                  "Sep",
                  "Oct",
                  "Nov",
                  "Dec",
                ];
                return `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
              };

              // Use calendar day comparison for accurate today/tomorrow detection
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);
              const aptDay = new Date(apt.appointmentDate + "T00:00:00");

              const isToday = aptDay.getTime() === today.getTime();
              const isTomorrow = aptDay.getTime() === tomorrow.getTime();

              return (
                <Card
                  key={apt.id}
                  className="border-none shadow-md bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-l-green-500"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex flex-col items-center justify-center">
                        <Calendar className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                            ✓ La Ogolaadey
                          </span>
                          {isToday && (
                            <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full animate-pulse">
                              MAANTA!
                            </span>
                          )}
                          {isTomorrow && (
                            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                              Berri
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm">
                          {apt.teacherName}
                        </h4>
                        <p className="text-gray-600 text-xs">
                          {formatDate(apt.appointmentDate)} •{" "}
                          {apt.appointmentTime}
                        </p>
                        {apt.topic && (
                          <p className="text-gray-500 text-xs mt-1 line-clamp-1">
                            📋 {apt.topic}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-purple-500" />
                          <span className="text-xs font-medium text-purple-700">
                            {diffDays > 0 && `${diffDays} maalmood`}
                            {diffDays > 0 && diffHours > 0 && " iyo "}
                            {diffHours > 0 && `${diffHours} saacadood`}
                            {diffDays === 0 &&
                              diffHours === 0 &&
                              "Ka yar 1 saac!"}{" "}
                            ka hartay
                          </span>
                        </div>
                        {apt.meetingLink && (
                          <a
                            href={apt.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                            data-testid={`link-meeting-${apt.id}`}
                          >
                            🔗 Ku biir kulanka
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary if no enrollments */}
      {enrolledCourses.length === 0 && (
        <div className="px-4 mt-6">
          <Card className="border-none shadow-md bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">
                {t("profilePage.noCourses")}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {t("profilePage.startJourney")}
              </p>
              <Link href="/courses">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <BookOpen className="w-4 h-4 mr-2" />
                  {t("profilePage.viewCourses")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Available Courses for All-Access Subscribers */}
      {hasAllAccessSubscription && availableCourses.length > 0 && (
        <div className="px-4 mt-6">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            Koorsooyinka Diyaarka ah (All-Access)
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Waxaad leedahay xubin dahabi ah - Dhammaan koorsadani waa kuu diyaar!
          </p>
          <div className="grid gap-3">
            {availableCourses.map((course: any) => (
              <Card
                key={course.id}
                className="border-none shadow-md bg-gradient-to-r from-amber-50 to-orange-50 overflow-hidden"
                data-testid={`available-course-${course.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
                      {course.imageUrl ? (
                        <img
                          src={course.imageUrl}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm truncate">
                        {course.title}
                      </h3>
                      {course.description && (
                        <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">
                          {course.description}
                        </p>
                      )}
                      {course.ageRange && (
                        <span className="inline-block mt-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          Da'da: {course.ageRange}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md"
                      onClick={() => enrollInCourseMutation.mutate(course.id)}
                      disabled={enrollInCourseMutation.isPending}
                      data-testid={`button-enroll-${course.id}`}
                    >
                      {enrollInCourseMutation.isPending ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-1" />
                          Bilow
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Telegram Notifications */}
      <div className="px-4 mt-6">
        <Card className="border-none shadow-md bg-gradient-to-r from-blue-50 to-sky-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[#0088cc] rounded-xl flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-sm mb-1">
                  {t("telegram.notifications")}
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  {t("telegram.notificationsDesc")}
                </p>
                <TelegramOptIn />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legal Links for Compliance */}
      <div className="px-4 mt-6">
        <Card className="border-none shadow-md overflow-hidden bg-white">
          <CardContent className="p-0">
            <div className="p-4 bg-gray-50 border-b">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Legal & Compliance / Sharciyada
              </h3>
            </div>
            <div className="divide-y">
              <Link href="/terms">
                <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">Terms & Conditions</p>
                      <p className="text-xs text-gray-500">Shuruudaha & Xaaladdaha</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
              <Link href="/privacy-policy">
                <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Shield className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">Privacy Policy</p>
                      <p className="text-xs text-gray-500">Siyaasadda Asturnaanta</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
              <Link href="/community-guidelines">
                <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">Community Guidelines</p>
                      <p className="text-xs text-gray-500">Hagaha Bulshada</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
              <Link href="/legal">
                <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group bg-gradient-to-r from-indigo-50 to-purple-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">All Legal Documents</p>
                      <p className="text-xs text-gray-500">Dhamaan Dukumiintiyada Sharciga</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completed Courses with Certificates - MOVED TO BOTTOM */}
      {completedCourses.length > 0 && (
        <div id="certificates-section" className="px-4 mt-6">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-green-500" />
            {t("profilePage.completedCourses")}
          </h2>
          <div className="space-y-3">
            {completedCourses.map((course: any) => (
              <Card
                key={course.id}
                className="border-none shadow-md bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-l-green-500"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-green-500">
                      <div className="w-full h-full flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm line-clamp-1">
                        {course.title}
                      </h3>
                      <p className="text-xs text-green-600 font-medium">
                        {t("profilePage.courseCompleted")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-green-300 text-green-700 hover:bg-green-100"
                      onClick={async (e) => {
                        e.preventDefault();
                        const toastId = toast.loading(
                          t("profilePage.creatingPdf"),
                        );
                        try {
                          const [logoBase64, signatureBase64, modulesRes] =
                            await Promise.all([
                              loadLogoAsBase64(),
                              loadSignatureAsBase64(),
                              fetch(`/api/courses/${course.courseId || course.id}/modules`).then(r => r.ok ? r.json() : []).catch(() => []),
                            ]);
                          const courseModules = (modulesRes || [])
                            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                            .map((m: any) => m.title);
                          const courseLessonTitles = lessons
                            .filter((l: any) => l.courseId === course.id)
                            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                            .map((l: any) => l.title);
                          const enrollDate = course.enrollment?.accessStart
                            ? new Date(course.enrollment.accessStart)
                            : undefined;
                          const realCompletionDate = course.courseCompletedAt
                            ? new Date(course.courseCompletedAt)
                            : new Date();
                          await generateCertificate({
                            parentName: parent?.name || t("profilePage.parent"),
                            courseName: course.title,
                            completionDate: realCompletionDate,
                            enrollmentDate: enrollDate,
                            courseDuration: course.duration || undefined,
                            lessonTopics: courseLessonTitles,
                            courseSections: courseModules.length > 0 ? courseModules : undefined,
                            logoBase64,
                            signatureBase64,
                          });
                          toast.dismiss(toastId);
                          toast.success(t("profilePage.pdfDownloaded"));
                        } catch (error) {
                          toast.dismiss(toastId);
                          toast.error(t("profilePage.pdfError"));
                        }
                      }}
                      data-testid="button-download-certificate"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      {t("profilePage.certificate")}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-100"
                      data-testid={`button-share-achievement-${course.id}`}
                      onClick={async () => {
                        const toastId = toast.loading("Shahaadada la diyaarinayaa...");
                        try {
                          const [logoBase64, signatureBase64, modulesRes] =
                            await Promise.all([
                              loadLogoAsBase64(),
                              loadSignatureAsBase64(),
                              fetch(`/api/courses/${course.courseId || course.id}/modules`).then(r => r.ok ? r.json() : []).catch(() => []),
                            ]);
                          const courseModules = (modulesRes || [])
                            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                            .map((m: any) => m.title);
                          const courseLessonTitles = lessons
                            .filter((l: any) => l.courseId === course.id)
                            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                            .map((l: any) => l.title);
                          const enrollDate = course.enrollment?.accessStart
                            ? new Date(course.enrollment.accessStart)
                            : undefined;
                          const realCompletionDate = course.courseCompletedAt
                            ? new Date(course.courseCompletedAt)
                            : new Date();
                          const { blob, fileName } = await generateCertificateBlob({
                            parentName: parent?.name || t("profilePage.parent"),
                            courseName: course.title,
                            completionDate: realCompletionDate,
                            enrollmentDate: enrollDate,
                            courseDuration: course.duration || undefined,
                            lessonTopics: courseLessonTitles,
                            courseSections: courseModules.length > 0 ? courseModules : undefined,
                            logoBase64,
                            signatureBase64,
                          });
                          toast.dismiss(toastId);
                          const file = new File([blob], fileName, { type: "application/pdf" });
                          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                            await navigator.share({
                              title: `Shahaado - ${course.title}`,
                              text: `🎓 Waxaan ku guuleystay koorsada "${course.title}" ee Barbaarintasan Academy! 🎉`,
                              files: [file],
                            });
                          } else {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = fileName;
                            a.click();
                            URL.revokeObjectURL(url);
                            toast.success("PDF-ga shahaadada waa la soo dejiyay. Ku share-garee WhatsApp ama Telegram.");
                          }
                        } catch (error: any) {
                          toast.dismiss(toastId);
                          if (error?.name !== "AbortError") {
                            toast.error("Khalad ayaa dhacay. Fadlan isku day mar kale.");
                          }
                        }
                      }}
                    >
                      <Share2 className="w-4 h-4 mr-1" />
                      {t("profilePage.share")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Logout Button */}
      <div className="px-4 mt-6">
        <Button
          variant="outline"
          className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-12 rounded-xl"
          onClick={handleLogout}
          disabled={isLoggingOut}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {isLoggingOut ? t("profilePage.loggingOut") : t("profilePage.logout")}
        </Button>
      </div>

      {/* Flashcard Modal */}
      <DatabaseFlashcardModal
        isOpen={showDatabaseFlashcards}
        onClose={() => setShowDatabaseFlashcards(false)}
      />

      {/* Messenger Overlay - Responsive: full screen on mobile, centered modal on desktop */}
      {showMessenger && (
        <div
          className="fixed inset-0 z-[60] bg-background lg:bg-black/50 lg:flex lg:items-center lg:justify-center"
          style={{ height: "100dvh" }}
        >
          <div className="h-full flex flex-col lg:h-[85vh] lg:w-full lg:max-w-5xl lg:bg-white lg:rounded-2xl lg:overflow-hidden lg:shadow-2xl lg:flex-row">
            {/* Chat List - Always visible on desktop, hidden when conversation selected on mobile */}
            <div
              className={`${selectedConversation ? "hidden lg:flex" : "flex"} flex-col lg:w-96 lg:border-r lg:border-gray-200`}
            >
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shrink-0 lg:rounded-tl-2xl">
                <button
                  onClick={() => setShowMessenger(false)}
                  data-testid="button-messenger-back"
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <MessagesSquare className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h1 className="text-lg font-bold">BSA Messenger v1</h1>
                  <p className="text-xs text-white/70">M.S.Aw-Musse</p>
                </div>
                <button
                  onClick={() => setShowNewConversation(true)}
                  data-testid="button-new-conversation"
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto bg-gray-50">
                <ChatList
                  currentUserId={parent.id}
                  onSelectConversation={(id, name, picture) => {
                    setSelectedConversation({
                      id,
                      participantName: name || "Unknown",
                      participantPicture: picture || null,
                    });
                  }}
                />
              </div>
            </div>

            {/* Chat Room - Full screen on mobile when selected, side panel on desktop */}
            <div
              className={`${selectedConversation ? "flex" : "hidden lg:flex"} flex-col flex-1 lg:flex`}
            >
              {selectedConversation ? (
                <ChatRoom
                  conversationId={selectedConversation.id}
                  participantName={selectedConversation.participantName}
                  participantPicture={selectedConversation.participantPicture}
                  currentUserId={parent.id}
                  onBack={() => setSelectedConversation(null)}
                />
              ) : (
                <div className="hidden lg:flex flex-col items-center justify-center h-full bg-gray-50 text-gray-400">
                  <MessagesSquare className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">
                    Dooro wadahadal si aad u bilowdo
                  </p>
                  <p className="text-sm">
                    Select a conversation to start messaging
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-end justify-center">
          <div
            className="bg-white w-full max-w-lg rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300"
            style={{ maxHeight: "70vh" }}
          >
            <div className="flex items-center gap-3 px-4 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-500">
              <button
                onClick={() => {
                  setShowNewConversation(false);
                  setSearchQuery("");
                }}
                data-testid="button-close-new-conversation"
                className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold text-white flex-1">
                Wadahadal Cusub
              </h2>
            </div>

            {/* Search Input */}
            <div className="px-4 py-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Raadi waalid ama macalin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-full bg-gray-100 border-0"
                  data-testid="input-search-parents"
                />
              </div>
            </div>

            {/* Parents List */}
            <div
              className="overflow-y-auto"
              style={{ maxHeight: "calc(70vh - 130px)" }}
            >
              {parentsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">Wax waalid ah lama helin</p>
                </div>
              ) : (
                parentsList
                  .filter(
                    (p) =>
                      p.id !== parent?.id &&
                      p.name.toLowerCase().includes(searchQuery.toLowerCase()),
                  )
                  .map((person) => (
                    <button
                      key={person.id}
                      onClick={() =>
                        createConversationMutation.mutate(person.id)
                      }
                      disabled={createConversationMutation.isPending}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b last:border-b-0"
                      data-testid={`button-start-conversation-${person.id}`}
                    >
                      <Avatar className="w-12 h-12 border-2 border-blue-100">
                        <AvatarImage
                          src={person.picture || undefined}
                          alt={person.name}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold">
                          {person.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900">
                          {person.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Guji si aad ula hadasho
                        </p>
                      </div>
                      <MessagesSquare className="w-5 h-5 text-blue-500" />
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Assessment History Section Component with Dropdown
function AssessmentHistorySection() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { parent } = useParentAuth();
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<
    string | null
  >(null);

  interface AssessmentWithInsights {
    id: string;
    childAgeRange: string;
    status: string;
    createdAt: string;
    completedAt: string | null;
    averageScore: number;
    insights: {
      strengths: string[];
      needsImprovement: string[];
      focusAreas: string[];
      summary: string;
      parentingStyle: string | null;
      parentingTips: string[] | null;
    } | null;
  }

  const { data: assessmentHistory = [], isLoading } = useQuery<
    AssessmentWithInsights[]
  >({
    queryKey: ["assessmentHistory", parent?.id],
    queryFn: async () => {
      const res = await fetch("/api/parent/assessment-history", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!parent,
  });

  // Include both "completed" and "analyzed" assessments - show even before admin review
  const completedAssessments = assessmentHistory.filter(
    (a) => a.status === "analyzed" || a.status === "completed",
  );

  // Auto-select most recent assessment
  const selectedAssessment = selectedAssessmentId
    ? completedAssessments.find((a) => a.id === selectedAssessmentId)
    : completedAssessments[0];

  if (isLoading) {
    return (
      <div className="px-4 mt-6">
        <div className="bg-gray-50 rounded-xl p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  const getAgeRangeLabel = (ageRange: string) => {
    const labels: Record<string, string> = {
      "0-6": "0-6 bilood",
      "6-12": "6-12 bilood",
      "1-2": "1-2 sano",
      "2-4": "2-4 sano",
      "4-7": "4-7 sano",
    };
    return labels[ageRange] || ageRange;
  };

  const getParentingStyleColor = (style: string | null) => {
    if (!style) return "bg-gray-100 text-gray-700";
    if (style.includes("Dhab")) return "bg-green-100 text-green-700";
    if (style.includes("Adag")) return "bg-orange-100 text-orange-700";
    if (style.includes("Debecsan")) return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-700";
  };

  // Calculate improvement for selected assessment
  const getScoreChange = () => {
    if (!selectedAssessment || completedAssessments.length < 2) return null;
    const currentIndex = completedAssessments.findIndex(
      (a) => a.id === selectedAssessment.id,
    );
    if (currentIndex === completedAssessments.length - 1) return null; // First assessment (oldest)
    const previous = completedAssessments[currentIndex + 1];
    if (!previous) return null;
    return selectedAssessment.averageScore - previous.averageScore;
  };

  const scoreChange = getScoreChange();

  return (
    <div className="px-4 mt-6">
      <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  Qiimaynta Waalidnimadaada
                </h3>
                <p className="text-xs text-gray-600">
                  iyo Qiimaynta Ilmahaaga ee aad horay u samaysay halka ka
                  akhriso:
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-100"
              onClick={() => navigate("/assessment")}
              data-testid="button-new-assessment"
            >
              {completedAssessments.length > 0 ? "Dib u samee" : "Samee"}
            </Button>
          </div>

          {completedAssessments.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Target className="w-8 h-8 text-indigo-400" />
              </div>
              <p className="text-gray-600 text-sm mb-2">
                Weli qiimayn ma samaysan
              </p>
              <p className="text-gray-500 text-xs">
                Samee qiimaynta si aad u ogaato heerka waalidnimaadada iyo
                ilmahaaga
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Dropdown to select assessment */}
              {completedAssessments.length > 1 && (
                <Select
                  value={selectedAssessment?.id || completedAssessments[0]?.id}
                  onValueChange={(value) => setSelectedAssessmentId(value)}
                >
                  <SelectTrigger className="bg-white border-indigo-200 text-sm">
                    <SelectValue placeholder="Dooro qiimayn" />
                  </SelectTrigger>
                  <SelectContent>
                    {completedAssessments.map((assessment, index) => (
                      <SelectItem key={assessment.id} value={assessment.id}>
                        <div className="flex items-center gap-2">
                          <span>
                            {getAgeRangeLabel(assessment.childAgeRange)}
                          </span>
                          <span className="text-gray-400">-</span>
                          <span className="text-gray-500 text-xs">
                            {new Date(assessment.createdAt).toLocaleDateString(
                              "so-SO",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </span>
                          {index === 0 && (
                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                              Cusub
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Selected Assessment Display */}
              {selectedAssessment && (
                <div
                  className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm"
                  data-testid={`assessment-card-${selectedAssessment.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                          {getAgeRangeLabel(selectedAssessment.childAgeRange)}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {new Date(
                          selectedAssessment.createdAt,
                        ).toLocaleDateString("so-SO", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <span className="text-lg font-bold text-indigo-700">
                          {selectedAssessment.averageScore.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-500">/5</span>
                        {scoreChange !== null && (
                          <span
                            className={`text-xs font-medium ml-1 ${
                              scoreChange > 0
                                ? "text-green-600"
                                : scoreChange < 0
                                  ? "text-red-600"
                                  : "text-gray-500"
                            }`}
                          >
                            {scoreChange > 0 ? "▲" : scoreChange < 0 ? "▼" : ""}
                            {scoreChange !== 0 &&
                              Math.abs(scoreChange).toFixed(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500">
                        Dhibcaha celceliska
                      </p>
                    </div>
                  </div>

                  {selectedAssessment.insights && (
                    <>
                      {selectedAssessment.insights.parentingStyle && (
                        <div className="mb-2">
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${getParentingStyleColor(
                              selectedAssessment.insights.parentingStyle,
                            )}`}
                          >
                            {selectedAssessment.insights.parentingStyle}
                          </span>
                        </div>
                      )}

                      {selectedAssessment.insights.strengths.length > 0 && (
                        <div className="mb-2">
                          <p className="text-[10px] text-green-700 font-medium mb-1">
                            Xoogaaga:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {selectedAssessment.insights.strengths
                              .slice(0, 3)
                              .map((strength, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded"
                                >
                                  {strength}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}

                      {selectedAssessment.insights.needsImprovement.length >
                        0 && (
                        <div>
                          <p className="text-[10px] text-orange-700 font-medium mb-1">
                            Hagaaji:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {selectedAssessment.insights.needsImprovement
                              .slice(0, 3)
                              .map((area, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded"
                                >
                                  {area}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* AI Parenting Tips Section */}
                      {selectedAssessment.insights.parentingTips &&
                        selectedAssessment.insights.parentingTips.length >
                          0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-[10px] text-indigo-700 font-medium mb-2 flex items-center gap-1">
                              <span className="w-4 h-4 bg-indigo-100 rounded-full flex items-center justify-center text-[8px]">
                                💡
                              </span>
                              Talooyin Waalidnimo:
                            </p>
                            <div className="space-y-1.5">
                              {selectedAssessment.insights.parentingTips
                                .slice(0, 3)
                                .map((tip, i) => (
                                  <div
                                    key={i}
                                    className="text-[10px] bg-gradient-to-r from-indigo-50 to-purple-50 text-gray-700 p-2 rounded-lg border-l-2 border-indigo-400"
                                  >
                                    {tip}
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                    </>
                  )}
                </div>
              )}

              {completedAssessments.length > 1 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-100">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-xs font-medium text-green-800">
                        Waad horumaraysaa! {completedAssessments.length} qiimayn
                        ayaad samaysay.
                      </p>
                      <p className="text-[10px] text-green-600">
                        Sii wad barashada si aad u aragto isbadalka!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
