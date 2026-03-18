import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useChildAuth } from "@/contexts/ChildAuthContext";

type CurriculumSurah = {
  number: number;
  name: string;
  englishName: string;
  ayahCount: number;
  difficulty: "easy" | "medium" | "hard";
  order: number;
  phase: 1 | 2 | 3 | 4 | 5;
  unlocked: boolean;
  completed: boolean;
  ayahsCompleted?: number;
  progressPercent?: number;
};

const PHASE_META: Record<number, { title: string; subtitle: string; icon: string }> = {
  1: { title: "Juz Group 1", subtitle: "Bilow", icon: "🌱" },
  2: { title: "Juz Group 2", subtitle: "Sii wad", icon: "🌿" },
  3: { title: "Juz Group 3", subtitle: "Dhexe", icon: "🌳" },
  4: { title: "Juz Group 4", subtitle: "Kor u kac", icon: "🌟" },
  5: { title: "Juz Group 5", subtitle: "Heer sare", icon: "🏆" },
};

export default function QuranFolders() {
  const { child, isLoading } = useChildAuth();
  const [, setLocation] = useLocation();
  const [curriculum, setCurriculum] = useState<CurriculumSurah[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !child) setLocation("/child-login");
  }, [child, isLoading, setLocation]);

  useEffect(() => {
    if (!child) return;
    fetch("/api/quran/curriculum", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setCurriculum(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setCurriculum([]);
      })
      .finally(() => setLoading(false));
  }, [child]);

  const grouped = useMemo(() => {
    const byPhase: Record<number, CurriculumSurah[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (const item of curriculum) {
      if (!byPhase[item.phase]) byPhase[item.phase] = [];
      byPhase[item.phase].push(item);
    }
    for (const key of Object.keys(byPhase)) {
      byPhase[Number(key)].sort((a, b) => a.order - b.order);
    }
    return byPhase;
  }, [curriculum]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center text-white/70 font-bold">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] p-4 pb-24">
      <div className="max-w-5xl mx-auto">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white">Quran Folders</h1>
            <p className="text-white/60 text-sm">Juz Amma ilaa 5 qaybood oo diyaar ah</p>
          </div>
          <button
            onClick={() => setLocation("/child-dashboard")}
            className="rounded-xl px-4 py-2 bg-white/10 border border-white/20 text-white font-bold"
          >
            Back
          </button>
        </div>

        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((phase) => {
            const items = grouped[phase] || [];
            const unlockedCount = items.filter((i) => i.unlocked).length;

            return (
              <details key={phase} className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden" open={phase === 1}>
                <summary className="cursor-pointer list-none p-5 md:p-6 bg-gradient-to-r from-[#2a2a46] to-[#1f2a44]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{PHASE_META[phase].icon}</span>
                      <div>
                        <p className="text-white font-black text-lg">{PHASE_META[phase].title}</p>
                        <p className="text-white/60 text-sm">{PHASE_META[phase].subtitle} • {items.length} Surahs</p>
                      </div>
                    </div>
                    <span className="rounded-full px-3 py-1 text-xs font-extrabold bg-[#FFD93D]/20 text-[#FFD93D] border border-[#FFD93D]/40">
                      {unlockedCount}/{items.length} Open
                    </span>
                  </div>
                </summary>

                <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((surah) => (
                    <div
                      key={surah.number}
                      className={`text-left rounded-2xl p-4 border transition ${surah.unlocked ? "bg-white/10 border-white/20 hover:bg-white/15" : "bg-white/5 border-white/10 opacity-60"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-white font-black text-lg leading-tight">{surah.name}</p>
                          <p className="text-white/70 text-sm mt-1">{surah.englishName}</p>
                          <p className="text-white/50 text-xs mt-1">{surah.ayahCount} Ayahs</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${surah.unlocked ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-slate-300"}`}>
                          {surah.unlocked ? "Open" : "Locked"}
                        </span>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          disabled={!surah.unlocked}
                          onClick={() => surah.unlocked && setLocation(`/quran-lesson/${surah.number}`)}
                          className={`rounded-xl px-3 py-2 text-sm font-bold ${surah.unlocked ? "bg-[#FFD93D]/20 text-[#FFD93D] border border-[#FFD93D]/40" : "bg-white/5 text-white/40 border border-white/10 cursor-not-allowed"}`}
                        >
                          Fur casharka
                        </button>
                        <button
                          disabled={!surah.completed}
                          onClick={() => surah.completed && setLocation(`/quran-game/surah-quiz/${surah.number}`)}
                          className={`rounded-xl px-3 py-2 text-sm font-bold ${surah.completed ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40" : "bg-white/5 text-white/40 border border-white/10 cursor-not-allowed"}`}
                        >
                          Ciyaar Juz
                        </button>
                      </div>

                      {typeof surah.progressPercent === "number" && (
                        <div className="mt-3">
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full bg-[#FFD93D]" style={{ width: `${Math.min(100, Math.max(0, surah.progressPercent))}%` }} />
                          </div>
                          <p className="text-white/60 text-xs mt-1">Progress: {surah.progressPercent}%</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}
