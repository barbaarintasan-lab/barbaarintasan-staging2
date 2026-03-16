import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { ArrowLeft, Check, Target, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import BottomNav from "@/components/BottomNav";
import CelebrationModal from "@/components/CelebrationModal";

interface Milestone {
  id: string;
  ageRange: string;
  title: string;
  description: string | null;
  category: string | null;
  order: number;
}

interface MilestoneProgress {
  id: string;
  parentId: string;
  milestoneId: string;
  completed: boolean;
  completedAt: string | null;
  notes: string | null;
}


export default function Milestones() {
  const { t } = useTranslation();
  const { parent } = useParentAuth();
  const queryClient = useQueryClient();
  const [selectedAge, setSelectedAge] = useState("newborn-0-3m");
  const [expandedAge, setExpandedAge] = useState<string | null>("newborn-0-3m");
  const [showCelebration, setShowCelebration] = useState(false);
  const [completedMilestone, setCompletedMilestone] = useState<Milestone | null>(null);

  const ageRanges = [
    { value: "newborn-0-3m", label: "Murjux (0-3 bilood)", icon: "👶" },
    { value: "infant-3-6m", label: "Fadhi-barad (3-6 bilood)", icon: "🍼" },
    { value: "infant-6-12m", label: "Gurguurte (6-12 bilood)", icon: "🦶" },
    { value: "toddler-1-2y", label: "Socod barad (1-2 sano)", icon: "🧒" },
    { value: "toddler-2-3y", label: "Inyow (2-3 sano)", icon: "🗣️" },
    { value: "preschool-3-5y", label: "Dareeme (3-5 sano)", icon: "🎨" },
    { value: "school-age-5-7y", label: "Salaad-barad (5-7 sano)", icon: "🎒" },
  ];

  const { data: milestones = [] } = useQuery<Milestone[]>({
    queryKey: ["milestones", selectedAge],
    queryFn: async () => {
      const res = await fetch(`/api/milestones?ageRange=${selectedAge}`);
      return res.json();
    },
  });

  const { data: progress = [] } = useQuery<MilestoneProgress[]>({
    queryKey: ["milestoneProgress"],
    queryFn: async () => {
      const res = await fetch("/api/milestones/progress", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!parent,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ milestoneId, milestone }: { milestoneId: string; milestone: Milestone }) => {
      const res = await fetch(`/api/milestones/${milestoneId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const result = await res.json();
      return { result, milestone };
    },
    onSuccess: ({ result, milestone }) => {
      queryClient.invalidateQueries({ queryKey: ["milestoneProgress"] });
      if (result.completed === true) {
        setCompletedMilestone(milestone);
        setShowCelebration(true);
      }
    },
  });

  const progressMap = new Map(progress.map(p => [p.milestoneId, p]));
  const completedCount = milestones.filter(m => progressMap.get(m.id)?.completed).length;
  const progressPercent = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-green-600 to-emerald-600 safe-top shadow-lg">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
              <button onClick={() => window.history.back()} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center" data-testid="button-back">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            <div>
              <h1 className="font-bold text-white text-lg">{t("milestones.title")}</h1>
              <p className="text-green-100 text-sm">{t("milestones.subtitle")}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {ageRanges.map(age => (
            <button
              key={age.value}
              onClick={() => {
                setSelectedAge(age.value);
                setExpandedAge(age.value);
              }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 ${
                selectedAge === age.value
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-green-300"
              }`}
              data-testid={`button-age-${age.value}`}
            >
              <span>{age.icon}</span>
              {age.label}
            </button>
          ))}
        </div>

        {parent && (
          <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{t("milestones.yourProgress")}</span>
              <span className="text-sm font-bold text-green-600">{completedCount}/{milestones.length}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">{progressPercent}% {t("milestones.completed")}</p>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {milestones.map(milestone => {
            const isCompleted = progressMap.get(milestone.id)?.completed || false;
            return (
              <div
                key={milestone.id}
                className={`bg-white rounded-xl p-4 shadow-sm border transition-all ${
                  isCompleted ? "border-green-300 bg-green-50/50" : "border-gray-100"
                }`}
                data-testid={`milestone-${milestone.id}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => parent && toggleMutation.mutate({ milestoneId: milestone.id, milestone })}
                    disabled={!parent || toggleMutation.isPending}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                      isCompleted
                        ? "bg-green-500 border-green-500"
                        : "border-gray-300 hover:border-green-400"
                    } ${!parent ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    data-testid={`checkbox-milestone-${milestone.id}`}
                  >
                    {isCompleted && <Check className="w-4 h-4 text-white" />}
                  </button>
                  <div className="flex-1">
                    <div className="mb-1">
                      <h3 className={`font-semibold ${isCompleted ? "text-green-700" : "text-gray-900"}`}>
                        {milestone.title}
                      </h3>
                    </div>
                    {milestone.description && (
                      <p className="text-sm text-gray-600">{milestone.description}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!parent && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-amber-800 text-sm">{t("milestones.loginPrompt")}</p>
          </div>
        )}
      </div>

      <CelebrationModal
        isOpen={showCelebration}
        onClose={() => {
          setShowCelebration(false);
          setCompletedMilestone(null);
        }}
        type="milestone_complete"
        title="Hambalyo!"
        subtitle={completedMilestone?.title || ""}
        description="Mahadsanid! Ilmahaagu wuxuu gaaray marxalad cusub oo muhiim ah. Si fiican ayaad u socdaa!"
      />

      <BottomNav />
    </div>
  );
}
