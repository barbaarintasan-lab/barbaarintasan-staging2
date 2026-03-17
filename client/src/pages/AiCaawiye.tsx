import { Link, useLocation } from "wouter";
import { ChevronLeft, BookOpen, Heart, Bot, ChevronRight, Sparkles, Crown, Timer, Star, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { openSSOLink } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface AiAccessStatus {
  allowed: boolean;
  plan: string;
  trialDaysRemaining: number;
  trialExpired: boolean;
  dailyUsed: number;
  dailyLimit: number;
  dailyRemaining: number;
  membershipAdvice: string;
}

export default function AiCaawiye() {
  const { parent } = useParentAuth();
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleShareAi = async () => {
    const shareData = {
      title: "AI Caawiye - Barbaarintasan Academy",
      text: "Ilmahaaga dhibaatooyin ma kala kulantaa oo Talo ma u baahan tahay? AI iyo Ustaad Muuse ayaa diyaar kuugu ah — tarbiyada, laylisyada guriga, iyo wax walba oo ilmahaaga khuseeya. Tijaabi hadda!",
      url: "https://appbarbaarintasan.com/ai-caawiye",
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        toast({ title: "Link waa la nuqulay!" });
      } catch {}
    }
  };

  const { data: accessStatus, isLoading: accessLoading } = useQuery<AiAccessStatus>({
    queryKey: ["/api/ai/access-status"],
    enabled: !!parent,
  });

  const startTrialMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/start-trial");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/access-status"] });
      toast({
        title: "Trial bilaabmay!",
        description: "14 maalmood oo tijaabo ah ayaa kuu bilaabmay.",
      });
    },
  });


  if (!parent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
          <Bot className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">AI Caawiye</h2>
        <p className="text-gray-600 mb-6 text-center max-w-sm">
          Fadlan gal akoonkaaga si aad u isticmaasho AI Caawiyaha.
        </p>
        <Link href="/register">
          <Button className="bg-gradient-to-r from-indigo-500 to-purple-500">
            Gal ama Isdiiwaangeli
          </Button>
        </Link>
      </div>
    );
  }

  if (accessStatus?.trialExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
          <Crown className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-3" data-testid="text-trial-expired-title">
          Tijaabadaadii way dhamaatay
        </h2>
        <p className="text-gray-600 mb-6 text-center max-w-md leading-relaxed" data-testid="text-membership-advice">
          Si aad AI Caawiye u sii isticmaasho, fadlan booqo websaydhkeena barbaarintasan.com
        </p>
        <Button
          onClick={openSSOLink}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold px-8 py-3 text-lg rounded-xl shadow-lg"
          data-testid="button-visit-website"
        >
          🌐 Booqo barbaarintasan.com
        </Button>
        <Button variant="ghost" className="mt-4 text-gray-500" data-testid="button-back-home" onClick={() => window.history.back()}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Ku noqo Bogga Hore
          </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-20">
      {accessStatus?.plan === "trial" && (
        <div
          className="bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-900 px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2"
          data-testid="banner-trial-countdown"
        >
          <Timer className="w-4 h-4" />
          <span>Tijaabadaadu waxay kaa dhamaanaysaa {accessStatus.trialDaysRemaining} Maalmood ka dib</span>
        </div>
      )}

      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white sticky top-0 z-40 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-white hover:bg-white/20"
              data-testid="button-back"
              onClick={() => window.history.back()}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold">AI Caawiye</h1>
              <p className="text-xs text-white/70">AI iyo Ustaad Muuse — diyaar ayay kuugu yihiin!</p>
            </div>
          </div>
          {accessStatus?.plan === "gold" && (
            <div
              className="flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-900 px-3 py-1 rounded-full text-xs font-bold shadow"
              data-testid="badge-gold-member"
            >
              <Star className="w-3 h-3" />
              <span>Xubin Dahabi 💛</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShareAi}
            className="rounded-full text-white hover:bg-white/20"
            data-testid="button-share-ai"
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-lg mx-auto mt-6">
        {accessStatus?.plan === "free" && (
          <div
            className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-5 text-center mb-4"
            data-testid="banner-free-trial-offer"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow">
              <Star className="w-7 h-7 text-white" />
            </div>
            <p className="text-gray-700 font-medium mb-4" data-testid="text-trial-offer">
              14 maalmood oo tijaabo ah ayaa kuu diyaar ah! Bilow isticmaalka AI Caawiyaha.
            </p>
            <Button
              onClick={() => startTrialMutation.mutate()}
              disabled={startTrialMutation.isPending}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold px-6 py-2 rounded-xl shadow"
              data-testid="button-start-trial"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {startTrialMutation.isPending ? "Sugitaan..." : "Bilow Trial-ka"}
            </Button>
          </div>
        )}

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">🤖 AI Caawiye</h2>
          <p className="text-gray-600 text-sm max-w-sm mx-auto leading-relaxed">
            Ilmahaaga dhibaatooyin ma kala kulantaa oo Talo ma u baahan tahay? AI iyo Ustaad Muuse ayaa diyaar kuugu ah — tarbiyada, laylisyada guriga, iyo wax walba oo ilmahaaga khuseeya.
          </p>
        </div>

        <Link href="/homework-helper">
          <div
            className="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 rounded-2xl p-5 shadow-lg cursor-pointer active:scale-[0.98] transition-transform"
            data-testid="link-mode-homework"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-1">📚 Laylisyada Guriga</h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  Ilmahaaga laylisyada guriga ha ku dhiban — AI-ku wuu ka caawin karaa xisaabta, aqriska, sayniska, iyo wax kale.
                </p>
              </div>
              <ChevronRight className="w-6 h-6 text-white/60 flex-shrink-0" />
            </div>
          </div>
        </Link>

        <Link href="/tarbiya-helper">
          <div
            className="bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700 rounded-2xl p-5 shadow-lg cursor-pointer active:scale-[0.98] transition-transform mt-4"
            data-testid="link-mode-tarbiya"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Heart className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-1">🤲 Tarbiyada & Waalidnimada</h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  Ilmahaaga sidee u barbaarisaa? AI iyo cajladaha Ustaad Muuse ayaa ku talinaaya — Islaamka, dhaqanka, iyo cilmiga cusub.
                </p>
              </div>
              <ChevronRight className="w-6 h-6 text-white/60 flex-shrink-0" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
