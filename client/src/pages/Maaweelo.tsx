import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { 
  Moon, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  Heart,
  BookOpen,
  Sparkles,
  Pencil,
  Save,
  X,
  Loader2,
  Volume2,
  Pause,
  Play,
  Mic,
  RotateCcw,
  RotateCw,
  Users,
  Trophy,
  CheckCircle2,
  Music,
  Share2,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { toast } from "sonner";
import { ShareButton, ContentReactions, ContentComments, ThankYouModal } from "@/components/engagement";
import { useLanguage } from "@/hooks/useLanguage";

function getProxyAudioUrl(audioUrl: string | null): string | null {
  if (!audioUrl) return null;
  const match = audioUrl.match(/[?&]id=([^&]+)/);
  if (match) {
    return `/api/tts-audio/${match[1]}`;
  }
  return audioUrl;
}

interface BedtimeStory {
  id: string;
  title: string;
  titleSomali: string;
  content: string;
  characterName: string;
  characterType: string;
  moralLesson: string | null;
  ageRange: string | null;
  images: string[];
  thumbnailUrl?: string;
  audioUrl: string | null;
  storyDate: string;
  generatedAt: string;
  isPublished: boolean;
}

const MoonWithStars = ({ className = "" }: { className?: string }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <Moon className="w-full h-full fill-current text-[#FFD93D]" />
    {[...Array(5)].map((_, i) => (
      <motion.div
        key={i}
        animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
        transition={{ duration: 2 + i, repeat: Infinity, delay: i * 0.4 }}
        className="absolute w-1 h-1 bg-[#FFD93D] rounded-full"
        style={{
          top: `${50 + 40 * Math.sin((i * 2 * Math.PI) / 5)}%`,
          left: `${50 + 40 * Math.cos((i * 2 * Math.PI) / 5)}%`,
        }}
      />
    ))}
  </div>
);

export default function Maaweelo() {
  const { t } = useTranslation();
  const { apiLanguage } = useLanguage();
  const [, setLocation] = useLocation();
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editMoralLesson, setEditMoralLesson] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const { parent } = useParentAuth();
  const queryClient = useQueryClient();
  const isAdmin = parent?.isAdmin;

  const stars = useMemo(() => {
    return [...Array(40)].map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 3}px`,
      duration: 2 + Math.random() * 4,
    }));
  }, []);

  useEffect(() => {
    const savedFavs = localStorage.getItem('maaweelo_favorites');
    if (savedFavs) {
      try { setFavorites(JSON.parse(savedFavs)); } catch {}
    }
  }, []);

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newFavorites = favorites.includes(id)
      ? favorites.filter(favId => favId !== id)
      : [...favorites, id];
    setFavorites(newFavorites);
    localStorage.setItem('maaweelo_favorites', JSON.stringify(newFavorites));
  };

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch((err) => console.error("[Audio] Play failed:", err));
    }
  };

  const handleAudioTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      setAudioProgress((audio.currentTime / audio.duration) * 100);
      setAudioCurrentTime(audio.currentTime);
      setAudioDuration(audio.duration);
    }
  };

  const handleAudioLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio && audio.duration) setAudioDuration(audio.duration);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioCurrentTime(0);
    if (selectedStory) {
      const key = `bedtime_story:${selectedStory.id}:thankyou`;
      if (!localStorage.getItem(key)) setShowThankYouModal(true);
    }
  };

  const seekBackward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - 15);
  };

  const seekForward = () => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = Math.min(audio.duration, audio.currentTime + 15);
  };

  const handleAudioError = () => {
    setIsPlaying(false);
  };

  const { data: todayStory, isLoading: loadingToday } = useQuery<BedtimeStory>({
    queryKey: [`/api/bedtime-stories/today?lang=${apiLanguage}`],
  });

  const { data: allStories, isLoading: loadingAll } = useQuery<BedtimeStory[]>({
    queryKey: [`/api/bedtime-stories?lang=${apiLanguage}`],
  });

  const effectiveTodayStory = todayStory || allStories?.[0] || null;

  const { data: fullStoryDetail } = useQuery<BedtimeStory>({
    queryKey: [`/api/bedtime-stories/${selectedStoryId}?lang=${apiLanguage}`],
    enabled: !!selectedStoryId,
  });

  const selectedStory = fullStoryDetail || (selectedStoryId ? allStories?.find(s => s.id === selectedStoryId) : null) || null;

  const { data: sheekoProgress = [] } = useQuery<{ contentId: string }[]>({
    queryKey: ["contentProgress", "sheeko"],
    queryFn: async () => {
      const res = await fetch("/api/content-progress?type=sheeko", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!parent,
  });
  const readIds = new Set(sheekoProgress.map(p => p.contentId));

  const markReadMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const res = await fetch("/api/content-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contentType: "sheeko", contentId }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contentProgress", "sheeko"] });
      queryClient.invalidateQueries({ queryKey: ["earnedBadges"] });
      queryClient.invalidateQueries({ queryKey: ["contentProgressSummary"] });
      if (data.awardedBadges?.length > 0) {
        toast.success(t("maaweelo.newBadge", { badges: data.awardedBadges.join(", ") }));
      }
    },
  });

  useEffect(() => {
    if (!isPlaying || !selectedStory || selectedStory.images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % selectedStory.images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, selectedStory]);

  useEffect(() => {
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioCurrentTime(0);
    setAudioDuration(0);
  }, [selectedStoryId]);

  useEffect(() => {
    if (selectedStory && parent && !readIds.has(selectedStory.id)) {
      markReadMutation.mutate(selectedStory.id);
    }
  }, [selectedStoryId, parent?.id]);

  useEffect(() => {
    if (!allStories) return;
    const params = new URLSearchParams(window.location.search);
    const storyId = params.get("story");
    if (storyId && !selectedStoryId) {
      const story = allStories.find(s => s.id === storyId);
      if (story) {
        setSelectedStoryId(story.id);
        setCurrentImageIndex(0);
      }
    }
  }, [allStories, selectedStoryId]);

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; titleSomali: string; content: string; moralLesson: string }) => {
      const res = await fetch(`/api/bedtime-stories/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titleSomali: data.titleSomali,
          content: data.content,
          moralLesson: data.moralLesson,
        }),
      });
      if (!res.ok) throw new Error("Failed to update story");
      return res.json();
    },
    onSuccess: (updatedStory) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bedtime-stories?lang=${apiLanguage}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bedtime-stories/today?lang=${apiLanguage}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bedtime-stories/${selectedStoryId}?lang=${apiLanguage}`] });
      setIsEditing(false);
      toast.success(t("maaweelo.storyUpdated"));
    },
    onError: () => toast.error(t("maaweelo.errorOccurred")),
  });

  const generateAudioMutation = useMutation({
    mutationFn: async (storyId: string) => {
      const res = await fetch(`/api/bedtime-stories/${storyId}/generate-audio`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate audio");
      return res.json();
    },
    onSuccess: (updatedStory) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bedtime-stories?lang=${apiLanguage}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bedtime-stories/today?lang=${apiLanguage}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bedtime-stories/${selectedStoryId}?lang=${apiLanguage}`] });
      toast.success(t("maaweelo.audioGenerated"));
    },
    onError: () => toast.error(t("maaweelo.audioError")),
  });

  const startEditing = () => {
    if (selectedStory) {
      setEditTitle(selectedStory.titleSomali);
      setEditContent(selectedStory.content);
      setEditMoralLesson(selectedStory.moralLesson || "");
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditTitle("");
    setEditContent("");
    setEditMoralLesson("");
  };

  const saveChanges = () => {
    if (selectedStory) {
      updateMutation.mutate({
        id: selectedStory.id,
        titleSomali: editTitle,
        content: editContent,
        moralLesson: editMoralLesson,
      });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("so-SO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const nextImage = () => {
    if (selectedStory && selectedStory.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % selectedStory.images.length);
    }
  };

  const prevImage = () => {
    if (selectedStory && selectedStory.images.length > 0) {
      setCurrentImageIndex((prev) => prev === 0 ? selectedStory.images.length - 1 : prev - 1);
    }
  };

  const displayStories = useMemo(() => {
    if (!allStories) return [];
    const stories = showOnlyFavorites 
      ? allStories.filter(s => favorites.includes(s.id))
      : allStories;
    return stories;
  }, [allStories, showOnlyFavorites, favorites]);

  const StoryCard = ({ story, isToday = false, index = 0 }: { story: BedtimeStory; isToday?: boolean; index?: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -8 }}
      onClick={() => {
        setSelectedStoryId(story.id);
        setCurrentImageIndex(0);
      }}
      className="flex flex-col text-left bg-white/5 backdrop-blur-md rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 shadow-xl hover:shadow-[#FFD93D]/10 transition-all border border-white/10 group relative overflow-hidden cursor-pointer"
      data-testid={`story-card-${story.id}`}
    >
      <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform rotate-12">
        <BookOpen className="w-20 h-20 text-white" />
      </div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-2">
          {isToday && (
            <div className="bg-[#FFD93D]/20 px-3 py-1 rounded-full border border-[#FFD93D]/30">
              <span className="text-xs font-bold uppercase tracking-widest text-[#FFD93D]">
                <Sparkles className="w-3 h-3 inline mr-1" />
                {t("maaweelo.tonightBadge")}
              </span>
            </div>
          )}
          <div className="bg-white/10 px-3 py-1 rounded-full border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#FFD93D]">
              {story.characterType === "sahabi" ? t("maaweelo.sahabi") : t("maaweelo.taabiciin")}
            </span>
          </div>
        </div>
        <div className="flex gap-2 relative z-20">
          <button 
            onClick={(e) => toggleFavorite(story.id, e)}
            className="p-2 -m-2 hover:scale-125 transition-transform"
            data-testid={`button-favorite-${story.id}`}
          >
            <Heart className={`w-5 h-5 ${favorites.includes(story.id) ? "text-[#FF6B6B] fill-current" : "text-white/20 group-hover:text-[#FF6B6B]"}`} />
          </button>
        </div>
      </div>

      {(story.thumbnailUrl || story.images?.length > 0) && (
        <div className="relative aspect-[16/10] mb-4 rounded-xl overflow-hidden">
          <img 
            src={story.thumbnailUrl || story.images?.[0]} 
            alt={story.titleSomali}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {parent && readIds.has(story.id) && (
            <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
      )}

      <h3 className="text-xl md:text-2xl font-bold mb-2 text-white group-hover:text-[#FFD93D] transition-colors leading-tight">
        {story.titleSomali}
      </h3>
      <p className="text-sm text-gray-400 mb-1 font-medium">
        {story.characterName} {t("maaweelo.blessing")}
      </p>
      <p className="text-xs text-gray-500 flex items-center gap-1">
        <Calendar className="w-3 h-3" />
        {formatDate(story.storyDate)}
      </p>

      <div className="flex items-center gap-4 mt-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
        <div className="flex items-center gap-1">
          <BookOpen className="w-3 h-3" />
          <span>{story.ageRange || "6b-13s"}</span>
        </div>
        {story.audioUrl && (
          <div className="flex items-center gap-1">
            <Music className="w-3 h-3" />
            <span>Audio</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2 text-sm font-bold text-[#FFD93D]">
          <span>Akhriso hadda</span>
          <ChevronLeft className="w-4 h-4 rotate-180" />
        </div>
        <div className="bg-white/10 p-2 rounded-xl group-hover:bg-[#FFD93D] group-hover:text-[#1a1a1a] transition-colors">
          <Play className="w-4 h-4" />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#1a1a1a] text-white">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="fixed w-1 h-1 bg-white rounded-full pointer-events-none"
          style={{ top: star.top, left: star.left, width: star.size, height: star.size }}
          animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: star.duration, repeat: Infinity, delay: star.id * 0.1 }}
        />
      ))}

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ x: [0, -30, 0], opacity: [0.1, 0.25, 0.1], rotate: [0, -10, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-40 right-[10%]"
        >
          <Moon className="w-16 h-16 text-[#FFD93D] opacity-30" />
        </motion.div>
      </div>

      <header className="relative z-10 p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => window.history.back()}
          >
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <ChevronLeft className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <MoonWithStars className="w-8 h-8" />
              <div>
                <h1 className="text-lg md:text-xl font-bold text-white">{t("home.sheeko.title")}</h1>
                <p className="text-[#FFD93D] text-xs font-medium">{t("home.sheeko.subtitle")}</p>
              </div>
            </div>
          </motion.div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={`p-3 rounded-2xl transition-all border ${
                showOnlyFavorites 
                  ? "bg-[#FF6B6B] border-[#FF6B6B] text-white" 
                  : "bg-white/5 text-white border-white/10 backdrop-blur-md"
              }`}
              data-testid="button-toggle-favorites"
            >
              <Heart className={`w-5 h-5 ${showOnlyFavorites ? "fill-current" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 pb-8">
        {parent && allStories && allStories.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 mb-6"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#FFD93D]" />
                <span className="text-white font-semibold text-sm">{t("maaweelo.listeningProgress")}</span>
              </div>
              <span className="text-[#FFD93D] text-sm font-bold">{readIds.size}/{allStories.length}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-[#FFD93D] to-[#FF6B6B] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(readIds.size / allStories.length) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <p className="text-gray-500 text-xs mt-2">
              {readIds.size === 0 ? t("maaweelo.startListeningToday") : 
               readIds.size === allStories.length ? t("maaweelo.congratsAllListened") :
               t("maaweelo.remainingStories", { count: allStories.length - readIds.size })}
            </p>
          </motion.div>
        )}

        {loadingToday || loadingAll ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/5 rounded-[1.5rem] p-5 border border-white/10 space-y-3">
                <Skeleton className="h-40 w-full rounded-xl bg-white/10" />
                <Skeleton className="h-5 w-3/4 bg-white/10" />
                <Skeleton className="h-4 w-1/2 bg-white/10" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {effectiveTodayStory && !showOnlyFavorites && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-[#FFD93D] fill-[#FFD93D]" />
                  <h2 className="text-lg font-bold text-white">{t("maaweelo.tonightsStory")}</h2>
                </div>
                <StoryCard story={effectiveTodayStory} isToday index={0} />
              </section>
            )}

            <section>
              {!showOnlyFavorites && (
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-[#FFD93D]" />
                  <h2 className="text-lg font-bold text-white">{t("maaweelo.previousStories")}</h2>
                </div>
              )}
              {showOnlyFavorites && favorites.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-md rounded-[2rem] p-8 border border-white/10 text-center">
                  <Heart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Wali sheeko ma jeclayn</p>
                  <p className="text-gray-600 text-sm mt-1">Riix ♥ si aad u keydi sheekooyin</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(showOnlyFavorites ? displayStories : displayStories.filter(s => s.id !== effectiveTodayStory?.id)).map((story, i) => (
                    <StoryCard key={story.id} story={story} index={i} />
                  ))}
                </div>
              )}
              {!showOnlyFavorites && displayStories.filter(s => s.id !== effectiveTodayStory?.id).length === 0 && !loadingAll && (
                <div className="bg-white/5 backdrop-blur-md rounded-[2rem] p-8 border border-white/10 text-center">
                  <Moon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">{t("maaweelo.storiesNotPrepared")}</p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <AnimatePresence>
        {selectedStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#1a1a1a] overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y"
            style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
          >
            <div className="relative min-h-screen">
              <div className="relative h-[50vh] md:h-[65vh] overflow-hidden">
                {selectedStory.images.length > 0 ? (
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentImageIndex}
                      initial={{ scale: 1.1, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.2 }}
                      src={selectedStory.images[currentImageIndex]}
                      alt={selectedStory.titleSomali}
                      className="w-full h-full object-cover"
                    />
                  </AnimatePresence>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center">
                    <BookOpen className="w-24 h-24 text-white/10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/40 to-transparent" />

                <button 
                  onClick={() => {
                    if (audioRef.current) { audioRef.current.pause(); }
                    setIsPlaying(false);
                    setSelectedStoryId(null);
                  }}
                  className="absolute top-4 left-4 p-3 rounded-xl bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all z-20 group"
                  data-testid="button-close-story"
                >
                  <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </button>

                {selectedStory.images.length > 1 && (
                  <>
                    <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-black/40 backdrop-blur-md text-white border border-white/10 z-20" data-testid="button-prev-image">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-black/40 backdrop-blur-md text-white border border-white/10 z-20" data-testid="button-next-image">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                      {selectedStory.images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentImageIndex(i)}
                          className={`h-1.5 rounded-full transition-all ${i === currentImageIndex ? "bg-[#FFD93D] w-6" : "bg-white/40 w-1.5"}`}
                          data-testid={`image-dot-${i}`}
                        />
                      ))}
                    </div>
                  </>
                )}

                <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 text-center">
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                    <div className="bg-white/10 px-3 py-1 rounded-full border border-white/10 inline-block mb-3">
                      <span className="text-xs font-bold uppercase tracking-widest text-[#FFD93D]">
                        {selectedStory.characterType === "sahabi" ? t("maaweelo.sahabi") : t("maaweelo.taabiciin")}: {selectedStory.characterName}
                      </span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] leading-tight">
                      {selectedStory.titleSomali}
                    </h2>
                    <p className="text-gray-400 text-sm mt-2 flex items-center justify-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {formatDate(selectedStory.storyDate)}
                    </p>
                  </motion.div>
                </div>
              </div>

              <div className="max-w-3xl mx-auto px-4 md:px-8 pb-8">
                <div className="flex flex-wrap gap-2 justify-center my-6">
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                    <BookOpen className="w-4 h-4 text-[#FFD93D]" />
                    <span className="text-xs font-bold text-gray-300">{selectedStory.ageRange || "6b-13s"}</span>
                  </div>
                  {selectedStory.audioUrl && (
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                      <Music className="w-4 h-4 text-[#FFD93D]" />
                      <span className="text-xs font-bold text-gray-300">Audio</span>
                    </div>
                  )}
                  <button 
                    onClick={(e) => toggleFavorite(selectedStory.id, e)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                      favorites.includes(selectedStory.id) 
                        ? "bg-[#FF6B6B]/20 border-[#FF6B6B]/30 text-[#FF6B6B]" 
                        : "bg-white/5 border-white/10 text-gray-400 hover:text-[#FF6B6B]"
                    }`}
                    data-testid="button-favorite-story"
                  >
                    <Heart className={`w-4 h-4 ${favorites.includes(selectedStory.id) ? "fill-current" : ""}`} />
                    <span className="text-xs font-bold">Jeclaado</span>
                  </button>
                  {!isEditing && isAdmin && (
                    <button 
                      onClick={startEditing}
                      className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/10 transition-colors"
                      data-testid="button-edit-story"
                    >
                      <Pencil className="w-4 h-4 text-[#FFD93D]" />
                      <span className="text-xs font-bold text-gray-300">Bedel</span>
                    </button>
                  )}
                </div>

                {selectedStory.audioUrl && !isEditing && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 mb-6"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={seekBackward}
                        className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center flex-shrink-0 transition-colors"
                        data-testid="button-seek-backward"
                      >
                        <RotateCcw className="w-4 h-4 text-[#FFD93D]" />
                      </button>
                      <button
                        onClick={toggleAudio}
                        className="h-14 w-14 rounded-full bg-gradient-to-br from-[#FFD93D] to-[#FF6B6B] hover:shadow-lg hover:shadow-[#FFD93D]/20 flex items-center justify-center flex-shrink-0 transition-all"
                        data-testid="button-play-audio"
                      >
                        {isPlaying ? (
                          <Pause className="w-6 h-6 text-[#1a1a1a]" />
                        ) : (
                          <Play className="w-6 h-6 text-[#1a1a1a] ml-1" />
                        )}
                      </button>
                      <button
                        onClick={seekForward}
                        className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center flex-shrink-0 transition-colors"
                        data-testid="button-seek-forward"
                      >
                        <RotateCw className="w-4 h-4 text-[#FFD93D]" />
                      </button>
                      <div className="flex-1 ml-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Volume2 className="w-4 h-4 text-[#FFD93D]" />
                          <span className="font-semibold text-sm text-gray-200">{t("maaweelo.listenToStory")}</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-[#FFD93D] to-[#FF6B6B]"
                            style={{ width: `${audioProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1.5" data-testid="text-audio-time">
                          {formatTime(audioCurrentTime)} / {formatTime(audioDuration)}
                        </p>
                      </div>
                    </div>
                    <audio
                      ref={audioRef}
                      src={getProxyAudioUrl(selectedStory.audioUrl) || undefined}
                      onTimeUpdate={handleAudioTimeUpdate}
                      onLoadedMetadata={handleAudioLoadedMetadata}
                      onEnded={handleAudioEnded}
                      onError={handleAudioError}
                      preload="auto"
                      playsInline
                    />
                  </motion.div>
                )}

                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 mb-6 space-y-4 border border-white/10">
                  <ShareButton
                    title={selectedStory.titleSomali}
                    text={`${selectedStory.titleSomali} - ${t("maaweelo.shareText")}`}
                    url={`${window.location.origin}/maaweelo?story=${selectedStory.id}`}
                  />
                  <ContentReactions contentType="bedtime_story" contentId={selectedStory.id} />
                  <ContentComments contentType="bedtime_story" contentId={selectedStory.id} />
                </div>

                <button
                  className="w-full bg-gradient-to-r from-[#FFD93D]/20 to-[#FF6B6B]/20 hover:from-[#FFD93D]/30 hover:to-[#FF6B6B]/30 border border-[#FFD93D]/20 rounded-2xl p-4 cursor-pointer transition-all active:scale-[0.98] mb-6"
                  onClick={async () => {
                    try {
                      await fetch("/api/groups/ae26dfaa-c2b3-4236-a168-bc6be74ac442/join", { method: "POST", credentials: "include" });
                    } catch {}
                    setLocation("/groups?group=ae26dfaa-c2b3-4236-a168-bc6be74ac442");
                  }}
                  data-testid="link-sheeko-group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#FFD93D]/20 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-[#FFD93D]" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-bold text-sm">{t("maaweelo.joinGroup")}</p>
                      <p className="text-gray-500 text-xs">{t("maaweelo.shareIdeas")}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#FFD93D]" />
                  </div>
                </button>

                <div className={`bg-white/5 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/10 ${isAdmin && !isEditing ? 'pb-32' : ''}`}>
                  {isEditing ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Pencil className="w-5 h-5 text-[#FFD93D]" />
                        {t("maaweelo.editStory")}
                      </h3>
                      <div>
                        <label className="text-sm text-gray-500 mb-1 block">{t("maaweelo.somaliTitleLabel")}</label>
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="bg-white/5 border-white/10 text-white"
                          data-testid="input-edit-title"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-500 mb-1 block">{t("maaweelo.storyLabel")}</label>
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="bg-white/5 border-white/10 text-white min-h-[200px]"
                          data-testid="input-edit-content"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-500 mb-1 block">{t("maaweelo.moralLessonLabel")}</label>
                        <Textarea
                          value={editMoralLesson}
                          onChange={(e) => setEditMoralLesson(e.target.value)}
                          className="bg-white/5 border-white/10 text-white min-h-[80px]"
                          data-testid="input-edit-moral"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={cancelEditing}
                          className="flex-1 px-6 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-all border border-white/10"
                          data-testid="button-cancel-edit"
                        >
                          Ka noqo
                        </button>
                        <button
                          onClick={saveChanges}
                          disabled={updateMutation.isPending}
                          className="flex-1 px-6 py-3 rounded-xl bg-[#FFD93D] text-[#1a1a1a] font-bold hover:bg-[#FFC900] transition-all disabled:opacity-50"
                          data-testid="button-save-edit"
                        >
                          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Keydi"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={isPlaying ? 'hidden' : ''}>
                        <div className="prose prose-invert prose-lg max-w-none mb-6">
                          {selectedStory.content.split('\n').map((paragraph, i) => (
                            paragraph.trim() && (
                              <p key={i} className="text-gray-300 leading-relaxed mb-4 text-base md:text-lg">
                                {paragraph}
                              </p>
                            )
                          ))}
                        </div>
                        {selectedStory.moralLesson && (
                          <div className="bg-[#FFD93D]/10 rounded-2xl p-5 border border-[#FFD93D]/20">
                            <div className="flex items-start gap-3">
                              <Heart className="w-6 h-6 text-[#FFD93D] flex-shrink-0 mt-1" />
                              <div>
                                <h3 className="font-semibold text-[#FFD93D] mb-1">{t("maaweelo.importantLesson")}</h3>
                                <p className="text-[#FFD93D]/80">{selectedStory.moralLesson}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <ThankYouModal
                  isOpen={showThankYouModal}
                  onClose={() => setShowThankYouModal(false)}
                  title={selectedStory.titleSomali}
                  shareUrl={`${window.location.origin}/maaweelo?story=${selectedStory.id}`}
                  contentType="bedtime_story"
                  contentId={selectedStory.id}
                />

                {isAdmin && !isEditing && (
                  <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a] to-transparent p-4 pb-6 z-50">
                    <div className="max-w-3xl mx-auto flex flex-col gap-2">
                      <button
                        onClick={startEditing}
                        className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
                        data-testid="button-edit-story-bottom"
                      >
                        <Pencil className="w-4 h-4" />
                        {t("maaweelo.editStory")}
                      </button>
                      <button
                        onClick={() => selectedStory && generateAudioMutation.mutate(selectedStory.id)}
                        disabled={generateAudioMutation.isPending}
                        className="w-full bg-[#FFD93D] hover:bg-[#FFC900] text-[#1a1a1a] font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        data-testid="button-generate-audio"
                      >
                        {generateAudioMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                        {generateAudioMutation.isPending ? t("maaweelo.generatingAudio") : (selectedStory?.audioUrl ? t("maaweelo.regenerateAudio") : t("maaweelo.generateAudio"))}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
