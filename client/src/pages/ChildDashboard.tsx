import { useEffect } from "react";
import { useLocation } from "wouter";
import { Lock, LogOut, BookOpen } from "lucide-react";
import { useChildAuth } from "@/contexts/ChildAuthContext";

interface JuzCard {
  num: number;
  arabic: string;
  somaliName: string;
  englishName: string;
  surahStart: number;
  isOpen: boolean;
  gradient: string;
  glowColor: string;
}

const JUZ_DATA: JuzCard[] = [
  { num: 1,  arabic: "الم",              somaliName: "Juz Aliflaammiim",      englishName: "Alif Laam Miim",       surahStart: 1,  isOpen: false, gradient: "from-slate-700 via-slate-600 to-slate-700",          glowColor: "#94a3b8" },
  { num: 2,  arabic: "سَيَقُولُ",         somaliName: "Juz Sayaqulu",          englishName: "Sayaqulu",             surahStart: 2,  isOpen: false, gradient: "from-slate-700 via-slate-600 to-slate-700",          glowColor: "#94a3b8" },
  { num: 3,  arabic: "تِلْكَ الرُّسُلُ",  somaliName: "Juz Tilkar Rusul",      englishName: "Tilkar Rusul",         surahStart: 3,  isOpen: false, gradient: "from-slate-700 via-slate-600 to-slate-700",          glowColor: "#94a3b8" },
  { num: 4,  arabic: "لَن تَنَالُوا",     somaliName: "Juz Lan Tanalu",        englishName: "Lan Tanalu",           surahStart: 4,  isOpen: false, gradient: "from-slate-700 via-slate-600 to-slate-700",          glowColor: "#94a3b8" },
  { num: 5,  arabic: "وَٱلْمُحْصَنَٰتُ",  somaliName: "Juz Walmuhsanat",       englishName: "Wal-Muhsanat",         surahStart: 5,  isOpen: false, gradient: "from-slate-700 via-slate-600 to-slate-700",          glowColor: "#94a3b8" },
  { num: 6,  arabic: "لَا يُحِبُّ ٱللَّهُ", somaliName: "Juz La Yuhibbullah",  englishName: "La Yuhibbullah",       surahStart: 6,  isOpen: false, gradient: "from-slate-700 via-slate-600 to-slate-700",          glowColor: "#94a3b8" },
  { num: 7,  arabic: "وَإِذَا سَمِعُوا",  somaliName: "Juz Wa-iza Sami'u",     englishName: "Wa-iza Sami'u",        surahStart: 7,  isOpen: false, gradient: "from-slate-700 via-slate-600 to-slate-700",          glowColor: "#94a3b8" },
  { num: 8,  arabic: "وَلَوْ أَنَّنَا",   somaliName: "Juz Walaw Annana",      englishName: "Walaw Annana",         surahStart: 8,  isOpen: false, gradient: "from-slate-700 via-slate-600 to-slate-700",          glowColor: "#94a3b8" },
  { num: 9,  arabic: "قَالَ ٱلْمَلَأُ",  somaliName: "Juz Qalal Mala",        englishName: "Qalal Mala",           surahStart: 9,  isOpen: false, gradient: "from-slate-700 via-slate-600 to-slate-700",          glowColor: "#94a3b8" },
  { num: 10, arabic: "وَاعْلَمُوٓا",      somaliName: "Juz Wa'lamu",           englishName: "Wa'lamu",              surahStart: 10, isOpen: false, gradient: "from-slate-700 via-slate-600 to-slate-700",          glowColor: "#94a3b8" },
  { num: 11, arabic: "يَعْتَذِرُونَ",     somaliName: "Juz Ya'taziruna",       englishName: "Ya'taziruna",          surahStart: 9,  isOpen: false, gradient: "from-slate-700 via-slate-600 to-slate-700",          glowColor: "#94a3b8" },
  { num: 12, arabic: "وَمَا مِن دَآبَّةٍ", somaliName: "Juz Wama min Dabbah",  englishName: "Wama min Dabbah",      surahStart: 11, isOpen: false, gradient: "from-slate-700 via-slate-600 to-slate-700",          glowColor: "#94a3b8" },
  { num: 13, arabic: "وَمَآ أُبَرِّئُ",   somaliName: "Juz Wama Ubarri'u",     englishName: "Wama Ubarri'u",        surahStart: 12, isOpen: false, gradient: "from-slate-700 via-slate-600 to-slate-700",          glowColor: "#94a3b8" },
  { num: 14, arabic: "رُّبَمَا",          somaliName: "Juz Rubama",            englishName: "Rubama",               surahStart: 15, isOpen: false, gradient: "from-slate-700 via-slate-600 to-slate-700",          glowColor: "#94a3b8" },
  { num: 15, arabic: "سُبْحَانَ ٱلَّذِى",  somaliName: "Juz Subhanal lazi",     englishName: "Subhanal-lazi",        surahStart: 17, isOpen: false, gradient: "from-slate-700 via-slate-600 to-slate-700",          glowColor: "#94a3b8" },
  { num: 16, arabic: "قَالَ أَلَمْ",      somaliName: "Juz Qala Alam",         englishName: "Qala Alam",            surahStart: 18, isOpen: false, gradient: "from-slate-700 via-slate-600 to-slate-700",          glowColor: "#94a3b8" },
  { num: 17, arabic: "ٱقْتَرَبَ",         somaliName: "Juz Iqtaraba",          englishName: "Iqtaraba",             surahStart: 21, isOpen: false, gradient: "from-slate-700 via-slate-600 to-slate-700",          glowColor: "#94a3b8" },
  { num: 18, arabic: "قَدْ أَفْلَحَ",     somaliName: "Juz Qad Aflaha",        englishName: "Qad Aflaha",           surahStart: 23, isOpen: false, gradient: "from-slate-700 via-slate-600 to-slate-700",          glowColor: "#94a3b8" },
  { num: 19, arabic: "وَقَالَ ٱلَّذِينَ", somaliName: "Juz Waqalal lazina",    englishName: "Waqalal-lazina",       surahStart: 25, isOpen: false, gradient: "from-slate-700 via-slate-600 to-slate-700",          glowColor: "#94a3b8" },
  { num: 20, arabic: "أَمَّنْ خَلَقَ",    somaliName: "Juz Amman Khalaqa",     englishName: "Amman Khalaqa",        surahStart: 27, isOpen: true,  gradient: "from-cyan-800 via-cyan-700 to-teal-700",             glowColor: "#22d3ee" },
  { num: 21, arabic: "أَمَّن يَتَسَآءَ",  somaliName: "Juz Amma Yatasaa",      englishName: "Amma Yatasaa",         surahStart: 29, isOpen: true,  gradient: "from-sky-800 via-blue-700 to-sky-700",               glowColor: "#60a5fa" },
  { num: 22, arabic: "وَمَن يَقْنُتْ",    somaliName: "Juz Wa Man Yaqnut",     englishName: "Wa Man Yaqnut",        surahStart: 33, isOpen: true,  gradient: "from-violet-800 via-violet-700 to-purple-700",       glowColor: "#a78bfa" },
  { num: 23, arabic: "وَمَآ أُبَرِّئُ",   somaliName: "Juz Wama Ubarri'u",     englishName: "Wama Ubarri'u",        surahStart: 36, isOpen: true,  gradient: "from-fuchsia-800 via-fuchsia-700 to-pink-700",       glowColor: "#e879f9" },
  { num: 24, arabic: "فَمَنْ أَظْلَمُ",   somaliName: "Juz Faman Azlamu",      englishName: "Faman Azlamu",         surahStart: 39, isOpen: true,  gradient: "from-rose-800 via-rose-700 to-red-700",              glowColor: "#fb7185" },
  { num: 25, arabic: "إِلَيْهِ يُرَدُّ",  somaliName: "Juz Ilayhi Yuraddu",    englishName: "Ilayhi Yuraddu",       surahStart: 41, isOpen: true,  gradient: "from-orange-800 via-orange-700 to-amber-700",        glowColor: "#fb923c" },
  { num: 26, arabic: "حٰمٓ",              somaliName: "Juz Ha Miim",           englishName: "Ha Mim",               surahStart: 46, isOpen: true,  gradient: "from-yellow-700 via-yellow-600 to-lime-700",         glowColor: "#fbbf24" },
  { num: 27, arabic: "قَالَ فَمَا خَطْبُكُمْ", somaliName: "Juz Qala Fama",   englishName: "Qala Fama",            surahStart: 51, isOpen: true,  gradient: "from-lime-800 via-lime-700 to-green-700",            glowColor: "#86efac" },
  { num: 28, arabic: "قَدْ سَمِعَ ٱللَّهُ", somaliName: "Juz Qad Sami'a",     englishName: "Qad Sami'a",           surahStart: 58, isOpen: true,  gradient: "from-teal-800 via-teal-700 to-cyan-700",             glowColor: "#2dd4bf" },
  { num: 29, arabic: "تَبَارَكَ",         somaliName: "Juz Tabaraka",          englishName: "Tabaraka",             surahStart: 67, isOpen: true,  gradient: "from-emerald-800 via-emerald-700 to-teal-700",       glowColor: "#34d399" },
  { num: 30, arabic: "جُزْءُ عَمَّ",      somaliName: "Juz 'Aamma",            englishName: "Juz Amma — 38 Surah", surahStart: 78, isOpen: true,  gradient: "from-green-800 via-emerald-700 to-green-700",        glowColor: "#4ade80" },
];

function IslamicPattern({ color }: { color: string }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
      viewBox="0 0 200 120"
      preserveAspectRatio="xMidYMid slice"
    >
      {[0, 40, 80, 120, 160].map((cx) =>
        [0, 40, 80].map((cy) => (
          <g key={`${cx}-${cy}`} transform={`translate(${cx},${cy})`}>
            <polygon points="20,0 40,12 40,36 20,48 0,36 0,12" fill="none" stroke={color} strokeWidth="1" />
            <circle cx="20" cy="24" r="6" fill="none" stroke={color} strokeWidth="0.8" />
            <line x1="20" y1="0" x2="20" y2="48" stroke={color} strokeWidth="0.4" />
            <line x1="0" y1="12" x2="40" y2="36" stroke={color} strokeWidth="0.4" />
            <line x1="40" y1="12" x2="0" y2="36" stroke={color} strokeWidth="0.4" />
          </g>
        ))
      )}
    </svg>
  );
}

function CrescentStar({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 60 60" className="w-10 h-10 opacity-80">
      <path
        d="M30 8 C18 8 10 17 10 28 C10 39 18 48 30 48 C24 44 20 37 20 28 C20 19 24 12 30 8Z"
        fill={color}
      />
      <polygon points="42,8 44,14 50,14 45,18 47,24 42,20 37,24 39,18 34,14 40,14" fill={color} />
    </svg>
  );
}

export default function ChildDashboard() {
  const { child, isLoading, logout } = useChildAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !child) setLocation("/child-login");
  }, [isLoading, child, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center gap-4">
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

  const handleLogout = async () => {
    await logout();
    setLocation("/child-login");
  };

  const handleJuzClick = (juz: JuzCard) => {
    if (!juz.isOpen) return;
    if (juz.num === 30) {
      setLocation("/quran-folders");
    } else {
      setLocation(`/quran-lesson/${juz.surahStart}`);
    }
  };

  const orderedJuz = [...JUZ_DATA].sort((a, b) => a.num - b.num);

  return (
    <div className="min-h-screen bg-[#0d1117] relative">
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 10px var(--glow), 0 0 20px var(--glow)33; }
          50% { box-shadow: 0 0 20px var(--glow), 0 0 40px var(--glow)66; }
        }
        .card-open { animation: float 4s ease-in-out infinite; }
        .card-shimmer::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%);
          background-size: 200% 100%;
          animation: shimmer 3s infinite;
          border-radius: inherit;
          pointer-events: none;
        }
        .star-bg > div { position: absolute; border-radius: 50%; background: white; animation: pulse 3s infinite; }
      `}</style>

      <div className="absolute inset-0 pointer-events-none overflow-hidden star-bg">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: (Math.random() * 2.5 + 0.5) + "px",
              height: (Math.random() * 2.5 + 0.5) + "px",
              top: Math.random() * 100 + "%",
              left: Math.random() * 100 + "%",
              animationDelay: Math.random() * 4 + "s",
              animationDuration: Math.random() * 2 + 2 + "s",
              opacity: Math.random() * 0.5 + 0.1,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-4 pt-6 pb-28">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-[#1a1a2e] shadow-lg ring-2 ring-white/20"
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

        <div className="mb-5 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20">
            <span className="text-[#FFD93D]">🌙</span>
            <span className="text-sm font-bold text-white">Casharrada Quraanka</span>
          </div>
          <div className="text-white/30 text-xs font-semibold">
            {JUZ_DATA.filter(j => j.isOpen).length + 1} / 31 furan
          </div>
        </div>

        <div className="space-y-3">
          {/* ══════════ ALIF CARD ══════════ */}
          {(isYoungChild ? true : true) && (
            <button
              onClick={() => setLocation("/alphabet-lesson")}
              className={`w-full text-left rounded-3xl overflow-hidden relative card-open card-shimmer border-2 border-white/20 shadow-2xl`}
              style={{ "--glow": "#a78bfa" } as React.CSSProperties}
              data-testid="card-alphabet"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-800 via-purple-700 to-indigo-800" />
              <IslamicPattern color="#a78bfa" />
              <div className="relative z-10 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex flex-col">
                    <span className="text-4xl drop-shadow-lg mb-1">✏️</span>
                    <span className="text-[10px] font-bold text-violet-300 uppercase tracking-widest">Higaadda</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <CrescentStar color="#c4b5fd" />
                    <span className="text-[10px] font-extrabold bg-violet-400/20 text-violet-300 border border-violet-400/40 rounded-full px-2 py-0.5">
                      🟢 Furan
                    </span>
                  </div>
                </div>
                <p className="text-4xl font-black text-white leading-none mb-1" style={{ fontFamily: "serif", direction: "rtl" }}>
                  أَلِف بَاء
                </p>
                <p className="text-lg font-bold text-white/90">Baro Alifka</p>
                <p className="text-sm text-white/60 mt-0.5">Alifka Quraanka — Da'da 3-4 jir</p>
                <div className="mt-4 inline-flex items-center gap-2 font-bold text-sm rounded-2xl px-4 py-2 bg-violet-400/20 text-violet-200">
                  <BookOpen className="w-4 h-4" />
                  Bilow
                </div>
              </div>
            </button>
          )}

          {/* ══════════ JUZ CARDS 1-30 ══════════ */}
          {orderedJuz.map((juz, idx) => {
            const isOpen = juz.isOpen;
            return (
              <button
                key={juz.num}
                onClick={() => handleJuzClick(juz)}
                disabled={!isOpen}
                className={`w-full text-left rounded-3xl overflow-hidden relative border-2 shadow-xl transition-all duration-200 ${
                  isOpen
                    ? "card-open card-shimmer border-white/20 active:scale-[0.98] hover:scale-[1.01]"
                    : "border-white/5 opacity-50 cursor-default"
                }`}
                style={isOpen ? { "--glow": juz.glowColor, animationDelay: `${(idx % 5) * 0.6}s` } as React.CSSProperties : {}}
                data-testid={`card-juz-${juz.num}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${isOpen ? juz.gradient : "from-slate-800 via-slate-700 to-slate-800"}`} />
                <IslamicPattern color={isOpen ? juz.glowColor : "#94a3b8"} />

                <div className="relative z-10 p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex flex-col">
                      <span className="text-2xl mb-0.5">📖</span>
                      <span
                        className="text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: isOpen ? juz.glowColor : "#94a3b8" }}
                      >
                        Juz {juz.num}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isOpen ? (
                        <>
                          <CrescentStar color={juz.glowColor} />
                          <span
                            className="text-[10px] font-extrabold rounded-full px-2 py-0.5 border"
                            style={{
                              backgroundColor: juz.glowColor + "25",
                              color: juz.glowColor,
                              borderColor: juz.glowColor + "50",
                            }}
                          >
                            🟢 Furan
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] font-extrabold bg-slate-600/30 text-slate-400 border border-slate-500/30 rounded-full px-2 py-0.5 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Soo socota
                        </span>
                      )}
                    </div>
                  </div>

                  <p
                    className="text-3xl font-black leading-none mb-1"
                    style={{ fontFamily: "serif", direction: "rtl", color: isOpen ? "white" : "#94a3b8" }}
                  >
                    {juz.arabic}
                  </p>
                  <p className={`text-sm font-bold ${isOpen ? "text-white/80" : "text-slate-400"}`}>
                    {juz.englishName}
                  </p>

                  {isOpen && (
                    <div className="mt-3 flex items-center justify-between">
                      <div
                        className="inline-flex items-center gap-1.5 font-bold text-xs rounded-xl px-3 py-1.5"
                        style={{ backgroundColor: juz.glowColor + "20", color: juz.glowColor }}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        Bilow
                      </div>
                      <p
                        className="text-xs font-semibold"
                        style={{ color: juz.glowColor + "cc" }}
                      >
                        {juz.somaliName}
                      </p>
                    </div>
                  )}

                  {!isOpen && (
                    <p className="text-xs text-slate-500 mt-2 font-semibold">{juz.somaliName}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
