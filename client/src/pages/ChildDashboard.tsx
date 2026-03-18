import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { BookOpen, LogOut, Moon } from "lucide-react";
import { useChildAuth } from "@/contexts/ChildAuthContext";

type LessonCard = {
  key: string;
  arabicTitle: string;
  englishLabel: string;
  subtitle?: string;
  meta?: string;
  icon: string;
  status: "open" | "locked";
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
      <div className="min-h-screen bg-sky-50 flex items-center justify-center">
        <p className="text-sky-700 font-bold text-lg">Loading...</p>
      </div>
    );
  }

  if (!child) return null;

  const isYoungChild = (child.age ?? 0) <= 4;

  const openCards: LessonCard[] = useMemo(
    () => [
      {
        key: "alphabet",
        arabicTitle: "الحروف",
        englishLabel: "Arabic Alphabet",
        subtitle: "Xuruufta Carabiga",
        meta: "Age 3-4",
        icon: "🔤",
        status: "open",
        onClick: () => setLocation("/alphabet-lesson"),
      },
      {
        key: "juz-amma",
        arabicTitle: "جزء عم",
        englishLabel: "Quran Juz",
        subtitle: "Juz Amma",
        meta: "37 Surahs",
        icon: "📖",
        status: "open",
        onClick: () => setLocation("/quran-folders"),
      },
    ],
    [setLocation],
  );

  const orderedOpenCards = isYoungChild
    ? openCards
    : [openCards[1], openCards[0]];

  const lockedCards: LessonCard[] = [
    {
      key: "juz-29",
      arabicTitle: "جزء تبارك",
      englishLabel: "Juz 29",
      subtitle: "Coming Soon",
      icon: "🔒",
      status: "locked",
    },
    {
      key: "juz-28",
      arabicTitle: "جزء قد سمع",
      englishLabel: "Juz 28",
      subtitle: "Coming Soon",
      icon: "🔒",
      status: "locked",
    },
  ];

  const handleLogout = async () => {
    await logout();
    setLocation("/child-login");
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-white text-xl md:text-2xl font-black">
              Salaam, {child.name}
            </p>
            <p className="text-white/60 text-sm md:text-base">
              Dooro casharkaaga maanta
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/15"
            data-testid="button-child-logout"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20">
          <Moon className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold text-white">Child Quran Dashboard</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orderedOpenCards.map((card) => (
            <button
              key={card.key}
              onClick={card.onClick}
              className="text-left rounded-3xl p-6 md:p-7 bg-gradient-to-br from-[#2a2a46] via-[#24314d] to-[#1f2a44] border-2 border-white/15 shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-transform"
              data-testid={`card-${card.key}`}
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-3xl">{card.icon}</span>
                <span className="rounded-full px-3 py-1 text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                  🟢 Open
                </span>
              </div>

              <p className="text-3xl font-black text-white leading-none">
                {card.arabicTitle}
              </p>
              <p className="text-lg font-bold text-white mt-2">
                {card.subtitle}
              </p>
              <p className="text-sm font-semibold text-white/70 mt-1">
                {card.englishLabel}
              </p>
              {card.meta && (
                <p className="text-sm text-white/70 mt-3">{card.meta}</p>
              )}

              <div className="mt-4 inline-flex items-center gap-2 text-[#FFD93D] font-bold text-sm">
                <BookOpen className="w-4 h-4" />
                Start
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6">
          <p className="text-white font-bold mb-3">More Juz</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lockedCards.map((card) => (
              <div
                key={card.key}
                className="rounded-3xl p-6 md:p-7 bg-white/5 border-2 border-white/10 opacity-80 cursor-not-allowed"
                aria-disabled="true"
                data-testid={`card-${card.key}-locked`}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-3xl">{card.icon}</span>
                  <span className="rounded-full px-3 py-1 text-xs font-extrabold bg-slate-500/20 text-slate-300 border border-slate-400/30">
                    🔒 Locked
                  </span>
                </div>

                <p className="text-3xl font-black text-white/80 leading-none">
                  {card.arabicTitle}
                </p>
                <p className="text-lg font-bold text-white/70 mt-2">
                  {card.englishLabel}
                </p>
                <p className="text-sm font-semibold text-white/50 mt-3">
                  {card.subtitle}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
