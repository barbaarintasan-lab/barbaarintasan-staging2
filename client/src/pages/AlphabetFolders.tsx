import { useChildAuth } from "@/contexts/ChildAuthContext";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { ArrowLeft, Star, CheckCircle2, Gamepad2, Award, BookOpen } from "lucide-react";

interface LetterProgress {
  letterId: number;
  completed: boolean;
  tracingScore?: number;
}

type FolderTab = "letters" | "games" | "rewards";

const ALPHABET_PHASES = [
  {
    phase: 1,
    name: "Heerka 1: Bilowga",
    emoji: "🌱",
    letters: [
      { id: 1, arabic: "ا", nameArabic: "أَلِف", nameSomali: "Alif" },
      { id: 2, arabic: "ب", nameArabic: "بَاء", nameSomali: "Baa" },
      { id: 3, arabic: "ت", nameArabic: "تَاء", nameSomali: "Taa" },
      { id: 4, arabic: "ث", nameArabic: "ثَاء", nameSomali: "Thaa" },
      { id: 5, arabic: "ج", nameArabic: "جِيم", nameSomali: "Jiim" },
      { id: 6, arabic: "ح", nameArabic: "حَاء", nameSomali: "Haa" },
      { id: 7, arabic: "خ", nameArabic: "خَاء", nameSomali: "Khaa" },
    ],
  },
  {
    phase: 2,
    name: "Heerka 2: Sii wadista",
    emoji: "🌿",
    letters: [
      { id: 8,  arabic: "د", nameArabic: "دَال",  nameSomali: "Daal" },
      { id: 9,  arabic: "ذ", nameArabic: "ذَال",  nameSomali: "Dhaal" },
      { id: 10, arabic: "ر", nameArabic: "رَاء",  nameSomali: "Raa" },
      { id: 11, arabic: "ز", nameArabic: "زَاي",  nameSomali: "Zay" },
      { id: 12, arabic: "س", nameArabic: "سِين",  nameSomali: "Siin" },
      { id: 13, arabic: "ش", nameArabic: "شِين",  nameSomali: "Shiin" },
      { id: 14, arabic: "ص", nameArabic: "صَاد",  nameSomali: "Saad" },
      { id: 15, arabic: "ض", nameArabic: "ضَاد",  nameSomali: "Daad" },
    ],
  },
  {
    phase: 3,
    name: "Heerka 3: Dhexe",
    emoji: "🌳",
    letters: [
      { id: 16, arabic: "ط", nameArabic: "طَاء",  nameSomali: "Taa'" },
      { id: 17, arabic: "ظ", nameArabic: "ظَاء",  nameSomali: "Dhaa'" },
      { id: 18, arabic: "ع", nameArabic: "عَيْن", nameSomali: "'Ayn" },
      { id: 19, arabic: "غ", nameArabic: "غَيْن", nameSomali: "Ghayn" },
      { id: 20, arabic: "ف", nameArabic: "فَاء",  nameSomali: "Faa" },
      { id: 21, arabic: "ق", nameArabic: "قَاف",  nameSomali: "Qaaf" },
      { id: 22, arabic: "ك", nameArabic: "كَاف",  nameSomali: "Kaaf" },
    ],
  },
  {
    phase: 4,
    name: "Heerka 4: Dhammaad",
    emoji: "🏆",
    letters: [
      { id: 23, arabic: "ل", nameArabic: "لَام",  nameSomali: "Laam" },
      { id: 24, arabic: "م", nameArabic: "مِيم",  nameSomali: "Miim" },
      { id: 25, arabic: "ن", nameArabic: "نُون",  nameSomali: "Nuun" },
      { id: 26, arabic: "ه", nameArabic: "هَاء",  nameSomali: "Haa'" },
      { id: 27, arabic: "و", nameArabic: "وَاو",  nameSomali: "Waaw" },
      { id: 28, arabic: "ي", nameArabic: "يَاء",  nameSomali: "Yaa" },
    ],
  },
];

const LETTER_COLORS = [
  "#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FECA57",
  "#FF9FF3","#54A0FF","#5F27CD","#00D2D3","#FF9F43",
  "#EE5A24","#009432","#0652DD","#9980FA","#C4E538",
  "#FDA7DF","#D980FA","#FFC312","#12CBC4","#B53471",
  "#833471","#1289A7","#C4E538","#F79F1F","#A3CB38",
  "#1B1464","#6F1E51","#ED4C67",
];

const ALL_LETTERS = ALPHABET_PHASES.flatMap(p => p.letters);
const TOTAL = ALL_LETTERS.length;

export default function AlphabetFolders() {
  const { child, isLoading, logout } = useChildAuth();
  const [, setLocation] = useLocation();
  const [progress, setProgress] = useState<LetterProgress[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [activeTab, setActiveTab] = useState<FolderTab>("letters");

  useEffect(() => {
    if (!isLoading && !child) setLocation("/child-login");
  }, [child, isLoading, setLocation]);

  useEffect(() => {
    if (!child) return;
    fetch("/api/quran/alphabet/curriculum", { credentials: "include" })
      .then(r => (r.ok ? r.json() : { items: [] }))
      .then(data => {
        const items = Array.isArray(data.items) ? data.items : [];
        setProgress(items.map((it: { id: number; completed?: boolean; tracingScore?: number }) => ({
          letterId: it.id,
          completed: it.completed ?? false,
          tracingScore: it.tracingScore,
        })));
        setLoadingProgress(false);
      })
      .catch(() => setLoadingProgress(false));
  }, [child]);

  const completedSet = new Set(progress.filter(p => p.completed).map(p => p.letterId));
  const completedCount = completedSet.size;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📖</div>
          <p className="text-white/60 font-bold text-lg animate-pulse">Waa la soo rarayaa...</p>
        </div>
      </div>
    );
  }

  if (!child) return null;

  return (
    <div className="min-h-screen bg-[#1a1a2e] relative" data-testid="alphabet-folders">
      {Array.from({ length: 25 }).map((_, i) => (
        <div key={i}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            width: `${Math.random() * 2.5 + 1}px`,
            height: `${Math.random() * 2.5 + 1}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.5 + 0.1,
          }}
        />
      ))}

      <div className="relative z-10 px-4 pt-5 pb-28">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/child-dashboard")}
              className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/70"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-black text-[#1a1a2e] shadow-lg"
              style={{ backgroundColor: child.avatarColor ?? "#FFD93D" }}
            >
              {child.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-white font-black text-base leading-tight">Baro Alifka</h2>
              <p className="text-white/40 text-xs">{child.name} · {completedCount}/{TOTAL} ✓</p>
            </div>
          </div>
          <button
            onClick={async () => { await logout(); setLocation("/child-login"); }}
            className="text-white/30 text-xs border border-white/10 px-3 py-2 rounded-xl"
            data-testid="button-logout"
          >
            Ka bax
          </button>
        </div>

        <div className="mb-5 bg-white/5 rounded-2xl p-4 border border-white/10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/60 text-sm font-bold">Horumarka guud</span>
            <span className="text-[#FFD93D] font-black text-sm">{completedCount}/{TOTAL}</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.round((completedCount / TOTAL) * 100)}%`,
                background: "linear-gradient(90deg, #FFD93D, #FF6B6B)",
              }}
            />
          </div>
          <p className="text-white/30 text-xs mt-1 text-right">
            {Math.round((completedCount / TOTAL) * 100)}%
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          {(["letters", "games", "rewards"] as FolderTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-2xl font-black text-sm flex items-center justify-center gap-1.5 transition-all ${
                activeTab === tab
                  ? "bg-[#FFD93D] text-[#1a1a2e] shadow-lg"
                  : "bg-white/8 text-white/50 border border-white/10"
              }`}
              data-testid={`tab-${tab}`}
            >
              {tab === "letters" ? <><BookOpen className="w-4 h-4" /> Xarfaha</> :
               tab === "games"   ? <><Gamepad2 className="w-4 h-4" /> Ciyaaro</> :
                                   <><Award className="w-4 h-4" /> Hadiyad</>}
            </button>
          ))}
        </div>

        {activeTab === "letters" && (
          <div className="space-y-6">
            {ALPHABET_PHASES.map(phase => {
              const phaseDone = phase.letters.filter(l => completedSet.has(l.id)).length;
              return (
                <div key={phase.phase}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{phase.emoji}</span>
                      <span className="text-white/80 font-black text-sm">{phase.name}</span>
                    </div>
                    <span className="text-white/40 text-xs font-bold">{phaseDone}/{phase.letters.length}</span>
                  </div>

                  <div className="space-y-2.5">
                    {phase.letters.map((letter) => {
                      const color = LETTER_COLORS[letter.id - 1];
                      const done = completedSet.has(letter.id);
                      return (
                        <button
                          key={letter.id}
                          onClick={() => setLocation(`/alphabet-lesson/${letter.id}`)}
                          className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 border transition-all active:scale-98"
                          style={{
                            backgroundColor: done ? color + "18" : "rgba(255,255,255,0.05)",
                            borderColor: done ? color + "50" : "rgba(255,255,255,0.1)",
                          }}
                          data-testid={`letter-card-${letter.id}`}
                        >
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
                            style={{
                              backgroundColor: done ? color : color + "30",
                              boxShadow: done ? `0 0 16px ${color}60` : "none",
                            }}
                          >
                            {done
                              ? <CheckCircle2 className="w-6 h-6 text-white" />
                              : <span
                                  className="text-2xl font-black leading-none"
                                  style={{ fontFamily: "Amiri, serif", color }}
                                >
                                  {letter.arabic}
                                </span>
                            }
                          </div>

                          <div className="flex-1 text-right" dir="rtl">
                            <p
                              className="font-black text-xl leading-tight text-white"
                              style={{ fontFamily: "Amiri, serif" }}
                            >
                              {letter.nameArabic}
                            </p>
                            <p className="text-white/40 text-xs font-bold" dir="ltr">
                              {letter.nameSomali}
                            </p>
                          </div>

                          <div className="flex-shrink-0 ml-1">
                            {done ? (
                              <div className="flex gap-0.5">
                                {[1,2,3].map(i => (
                                  <Star key={i} className="w-4 h-4 fill-[#FFD93D] text-[#FFD93D]" />
                                ))}
                              </div>
                            ) : (
                              <span
                                className="text-xs font-black px-3 py-1.5 rounded-full border"
                                style={{ color, borderColor: color + "60", backgroundColor: color + "15" }}
                              >
                                Bilow
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "games" && (
          <div className="space-y-4">
            <div className="rounded-2xl p-5 border border-[#FFD93D]/20 bg-[#FFD93D]/5 text-center">
              <div className="text-5xl mb-3">🎮</div>
              <p className="text-white font-black text-xl mb-1">Ciyaaraha Alifka</p>
              <p className="text-white/50 text-sm mb-4">
                Dhammaad 5 xaraf si aad ciyaaraha u furto
              </p>
              <button
                onClick={() => setLocation("/alphabet-games")}
                className="px-6 py-3 rounded-2xl bg-[#FFD93D] text-[#1a1a2e] font-black text-base"
                data-testid="button-go-games"
              >
                🎮 Ciyaaro Hadda
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { emoji: "🔤", name: "Xarafaha waa kuma?", desc: "Garan xarfaha" },
                { emoji: "🔊", name: "Dhageyso & Aqoonsi", desc: "Dhageyso oo dooro" },
                { emoji: "✍️", name: "Qorista Xarfaha", desc: "Sawirid xarafka" },
                { emoji: "🔗", name: "Xidid Ciyaar", desc: "Geli xarafka meeshiisa" },
              ].map((g, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-4 border border-white/10 bg-white/5 text-center"
                >
                  <div className="text-3xl mb-2">{g.emoji}</div>
                  <p className="text-white/80 font-black text-sm">{g.name}</p>
                  <p className="text-white/30 text-xs mt-1">{g.desc}</p>
                  <span className="mt-2 inline-block text-xs text-[#FFD93D]/60 font-bold border border-[#FFD93D]/20 rounded-full px-2 py-0.5">
                    Soon
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "rewards" && (
          <div className="space-y-4">
            <div className="rounded-2xl p-5 border border-white/10 bg-white/5">
              <h3 className="text-white font-black text-base mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-[#FFD93D]" /> Guushayda
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3 bg-[#FFD93D]/10 border border-[#FFD93D]/20 text-center">
                  <p className="text-3xl font-black text-[#FFD93D]">{completedCount}</p>
                  <p className="text-white/50 text-xs mt-1">Xaraf La Baray</p>
                </div>
                <div className="rounded-xl p-3 bg-purple-500/10 border border-purple-400/20 text-center">
                  <p className="text-3xl font-black text-purple-300">
                    {Math.round((completedCount / TOTAL) * 100)}%
                  </p>
                  <p className="text-white/50 text-xs mt-1">Heerka</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-5 border border-white/10 bg-white/5">
              <h3 className="text-white font-black text-base mb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" /> Buug-Sawirayaasha
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { need: 5,  icon: "⭐", name: "Bilow", color: "#FFD93D" },
                  { need: 14, icon: "🌟", name: "Bilaa Istaag", color: "#FF9F43" },
                  { need: 28, icon: "🏆", name: "Xarafka Dhan", color: "#EE5A24" },
                ].map(badge => {
                  const earned = completedCount >= badge.need;
                  return (
                    <div
                      key={badge.name}
                      className={`rounded-xl p-3 text-center border ${earned ? "border-opacity-50" : "border-white/10 opacity-40"}`}
                      style={{ borderColor: earned ? badge.color + "80" : undefined, backgroundColor: earned ? badge.color + "15" : undefined }}
                    >
                      <div className="text-3xl mb-1">{badge.icon}</div>
                      <p className="text-white/70 text-xs font-bold">{badge.name}</p>
                      {!earned && (
                        <p className="text-white/30 text-xs">{badge.need - completedCount} wax</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
