import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { ArrowLeft, Award, Lock, Trophy, Star } from "lucide-react";
import { Link } from "wouter";
import BottomNav from "@/components/BottomNav";
import CelebrationModal from "@/components/CelebrationModal";

interface Badge {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  triggerType: string;
  triggerValue: string | null;
  order: number;
}

interface BadgeAward {
  id: string;
  parentId: string;
  badgeId: string;
  awardedAt: string;
}

export default function Badges() {
  const { parent } = useParentAuth();
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: badges = [] } = useQuery<Badge[]>({
    queryKey: ["badges"],
    queryFn: async () => {
      const res = await fetch("/api/badges");
      return res.json();
    },
  });

  const { data: earnedBadges = [] } = useQuery<BadgeAward[]>({
    queryKey: ["earnedBadges"],
    queryFn: async () => {
      const res = await fetch("/api/badges/earned", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!parent,
  });

  const earnedBadgeIds = new Set(earnedBadges.map(b => b.badgeId));
  const earnedCount = earnedBadges.length;

  const badgeIcons: Record<string, React.ReactNode> = {
    "lessons_complete": <Star className="w-8 h-8" />,
    "course_complete": <Trophy className="w-8 h-8" />,
    "streak": <Award className="w-8 h-8" />,
    "milestone": <Award className="w-8 h-8" />,
    "first_lesson": <Star className="w-8 h-8" />,
    "dhambaal_read": <Award className="w-8 h-8" />,
    "sheeko_read": <Trophy className="w-8 h-8" />,
  };

  const badgeColors: Record<string, string> = {
    "1": "from-amber-400 to-yellow-500",
    "2": "from-blue-400 to-indigo-500",
    "3": "from-purple-400 to-pink-500",
    "4": "from-green-400 to-emerald-500",
    "5": "from-orange-400 to-red-500",
  };

  const handleBadgeClick = (badge: Badge, isEarned: boolean) => {
    if (isEarned) {
      setSelectedBadge(badge);
      setIsDialogOpen(true);
    }
  };

  const getColorIndex = (index: number) => String((index % 5) + 1);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-amber-500 to-orange-500 safe-top shadow-lg">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/profile">
              <button className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center" data-testid="button-back">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            </Link>
            <div>
              <h1 className="font-bold text-white text-lg">Abaalmarinta & Guulaha</h1>
              <p className="text-amber-100 text-sm">Halka ka eego Abaalmarinada Barbaarintasan Academy ku siisay Adiga waalid ah.</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{earnedCount}</h2>
          <p className="text-gray-600">Abaalmarin Lagu Guuleystay</p>
          <p className="text-sm text-gray-500 mt-1">{badges.length - earnedCount} kale ayaa hadhay</p>
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-3">Dhammaan Abaalmarinada</h3>
        
        <div className="grid grid-cols-2 gap-3">
          {badges.map((badge, index) => {
            const isEarned = earnedBadgeIds.has(badge.id);
            const colorClass = badgeColors[getColorIndex(index)] || "from-gray-400 to-gray-500";
            
            return (
              <button
                key={badge.id}
                onClick={() => handleBadgeClick(badge, isEarned)}
                disabled={!isEarned}
                className={`bg-white rounded-xl p-4 shadow-sm border text-center transition-all ${
                  isEarned 
                    ? "border-amber-300 hover:shadow-md hover:scale-105 cursor-pointer" 
                    : "border-gray-100 opacity-70 cursor-not-allowed"
                }`}
                data-testid={`button-badge-${badge.id}`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2 ${
                  isEarned ? `bg-gradient-to-br ${colorClass} text-white` : "bg-gray-200 text-gray-400"
                }`}>
                  {isEarned ? (
                    badgeIcons[badge.triggerType] || <Award className="w-8 h-8" />
                  ) : (
                    <Lock className="w-6 h-6" />
                  )}
                </div>
                <h4 className={`font-semibold text-sm ${isEarned ? "text-gray-900" : "text-gray-500"}`}>
                  {badge.name}
                </h4>
                {isEarned && (
                  <span className="inline-block mt-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    Riix si aad u aragto
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {!parent && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-amber-800 text-sm">Fadlan gal akoonkaaga si aad u aragto abaalmarinadaada</p>
          </div>
        )}
      </div>

      <CelebrationModal
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        type="badge"
        title={selectedBadge?.name || "Abaalmarin!"}
        subtitle="Mahadsanid Dadaalkaaga!"
        description={selectedBadge?.description || "Waxaad ku guuleysatay abaalmarin cusub!"}
      />

      <BottomNav />
    </div>
  );
}
