import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { BookOpen, LogOut, Moon, Lock } from "lucide-react";
import { useChildAuth } from "@/contexts/ChildAuthContext";

type LessonCard = {
  key: string;
  arabicTitle: string;
  englishLabel: string;
  subtitle?: string;
  meta?: string;
  icon: string;
  status: "open" | "locked";
  gradient?: string;
  accentColor?: string;
  onClick?: () => void;
};

export default function ChildDashboard() {
  const { child, isLoading, logout } = useChildAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !child) {
      setLocation("/child-login");
    }
  }, [isLoading, child, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-[#FFD93D]/20 border-t-[#FFD93D] animate-spin" />
          <span className="text-2xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">⭐</span>
        </div>
        <p className="text-white/60 text-sm animate-pulse">Waa la soo dajinayaa...</p>
      </div>
    );
  }

  if (!child) return null;

  const isYoungChild = (child.age ?? 0) <= 4;

  const openCards: LessonCard[] = useMemo(
    () => [
      {
        key: "alphabet",
        arabicTitle: "أَلِف بَاء",
        englishLabel: "Alifka Quraanka",
        subtitle: "Baro Alifka",
        meta: "Da'da 3-4 jir",
        icon: "✏️",
        status: "open",
        gradient: "from-[#6C63FF] via-[#5B54E8] to-[#4A3FD4]",
        accentColor: "#A78BFA",
        onClick: () => setLocation("/alphabet-lesson"),
      },
      {
        key: "juz-amma",
        arabicTitle: "جزء عم",
        englishLabel: "Juz Amma — Juz 30",
        subtitle: "Juz Amma",
        meta: "38 Surah",
        icon: "📖",
        status: "open",
        gradient: "from-[#2A6041] via-[#1E7A4A] to-[#166534]",
        accentColor: "#4ADE80",
        onClick: () => setLocation("/quran-folders"),
      },
    ],
    [setLocation],
  );

  const orderedOpenCards = isYoungChild
    ? openCards
    : [openCards[1], openCards[0]];

  const comingSoonJuz: { num: number; arabic: string; name: string }[] = [
    { num: 29, arabic: "جزء تبارك", name: "Tabaraka" },
    { num: 28, arabic: "جزء قد سمع", name: "Qad Sami'a" },
    { num: 27, arabic: "جزء قال فما", name: "Qala Fama" },
    { num: 26, arabic: "جزء حم", name: "Ha Mim" },
    { num: 25, arabic: "جزء إليه يرد", name: "Ilayhi Yuraddu" },
    { num: 24, arabic: "جزء فمن أظلم", name: "Faman Azlamu" },
    { num: 23, arabic: "جزء وما أبرئ", name: "Wama Ubarri'u" },
    { num: 22, arabic: "جزء ومن يقنت", name: "Wa Man Yaqnut" },
    { num: 21, arabic: "جزء أمن يتساء", name: "Amma Yatasaa" },
  ];

  const handleLogout = async () => {
    await logout();
    setLocation("/child-login");
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] relative" data-testid="child-dashboard">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              width: Math.random() * 3 + 1 + "px",
              height: Math.random() * 3 + 1 + "px",
              top: Math.random() * 100 + "%",
              left: Math.random() * 100 + "%",
              animationDelay: Math.random() * 3 + "s",
              animationDuration: Math.random() * 2 + 2 + "s",
              opacity: Math.random() * 0.5 + 0.1,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-[#1a1a2e] shadow-lg"
              style={{ backgroundColor: child.avatarColor ?? "#FFD93D" }}
              data-testid="text-child-avatar"
            >
              {child.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-white font-bold text-xl leading-tight" data-testid="text-child-name">
                Salaan, {child.name}! 👋
              </h2>
              <p className="text-white/50 text-sm">Maanta maxaad baran doontaa?</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-white/40 hover:text-white/70 p-2 transition-colors"
            data-testid="button-child-logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20">
          <Moon className="w-4 h-4 text-[#FFD93D]" />
          <span className="text-sm font-bold text-white">Casharrada Quraanka</span>
        </div>

        <div className="space-y-4 mb-6">
          {orderedOpenCards.map((card) => (
            <button
              key={card.key}
              onClick={card.onClick}
              className={`w-full text-left rounded-3xl p-6 bg-gradient-to-br ${card.gradient} border-2 border-white/15 shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-transform`}
              data-testid={`card-${card.key}`}
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-4xl drop-shadow-lg">{card.icon}</span>
                <span
                  className="rounded-full px-3 py-1 text-xs font-extrabold border"
                  style={{
                    backgroundColor: card.accentColor + "25",
                    color: card.accentColor,
                    borderColor: card.accentColor + "50",
                  }}
                >
                  🟢 Furan
                </span>
              </div>

              <p
                className="text-3xl font-black text-white leading-none mb-2"
                style={{ fontFamily: "serif", direction: "rtl" }}
              >
                {card.arabicTitle}
              </p>
              <p className="text-lg font-bold text-white/90">{card.subtitle}</p>
              <p className="text-sm text-white/60 mt-1">{card.englishLabel}</p>
              {card.meta && (
                <p className="text-xs text-white/50 mt-2">{card.meta}</p>
              )}

              <div
                className="mt-5 inline-flex items-center gap-2 font-bold text-sm rounded-2xl px-4 py-2"
                style={{ backgroundColor: card.accentColor + "20", color: card.accentColor }}
              >
                <BookOpen className="w-4 h-4" />
                Bilow
              </div>
            </button>
          ))}
        </div>

        <div>
          <p className="text-white/50 font-bold text-sm mb-3 uppercase tracking-wide">Juz-yada kale — Soo socota</p>
          <div className="grid grid-cols-2 gap-3">
            {comingSoonJuz.map((juz) => (
              <div
                key={juz.num}
                className="rounded-3xl p-5 bg-white/5 border-2 border-amber-400/20 cursor-default"
                data-testid={`card-juz-${juz.num}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">📖</span>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-400/30">
                    🕐 Soo socota
                  </span>
                </div>
                <p
                  className="text-lg font-black text-white/80 leading-none mb-1"
                  style={{ fontFamily: "serif", direction: "rtl" }}
                >
                  {juz.arabic}
                </p>
                <p className="text-sm font-bold text-white/60">Juz {juz.num}</p>
                <p className="text-xs text-white/30 mt-1">{juz.name}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-3xl p-4 bg-white/3 border border-white/8 flex items-center gap-3 opacity-50">
            <Lock className="w-5 h-5 text-white/30 shrink-0" />
            <div>
              <p className="text-white/40 text-sm font-bold">Juz 1 – 20</p>
              <p className="text-white/25 text-xs">Mustaqbalka la furayo</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
