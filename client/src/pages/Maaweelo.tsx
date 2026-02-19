import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { 
  Moon, 
  Star, 
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
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  thumbnailUrl?: string | null;
  audioUrl: string | null;
  storyDate: string;
  generatedAt: string;
  isPublished: boolean;
}

export default function Maaweelo() {
  const { t } = useTranslation();
  const { apiLanguage } = useLanguage();
  const [, setLocation] = useLocation();
  const [selectedStory, setSelectedStory] = useState<BedtimeStory | null>(null);
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
  const audioRef = useRef<HTMLAudioElement>(null);

  // Format seconds to mm:ss
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  const { parent } = useParentAuth();
  const queryClient = useQueryClient();
  const isAdmin = parent?.isAdmin;

  // Audio player handlers
  const toggleAudio = () => {
    const audio = audioRef.current;
    console.log("[Audio] Toggle clicked, audioRef:", audio, "src:", audio?.src);
    if (!audio) {
      console.error("[Audio] No audio element found!");
      return;
    }
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      console.log("[Audio] Attempting to play...");
      audio.play()
        .then(() => {
          console.log("[Audio] Playing successfully!");
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error("[Audio] Play failed:", err);
        });
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
    if (audio && audio.duration) {
      setAudioDuration(audio.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioCurrentTime(0);
    // Show thank you modal if not already shown for this story
    if (selectedStory) {
      const key = `bedtime_story:${selectedStory.id}:thankyou`;
      if (!localStorage.getItem(key)) {
        setShowThankYouModal(true);
      }
    }
  };

  const seekBackward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - 15);
    setAudioProgress((audio.currentTime / audio.duration) * 100);
  };

  const seekForward = () => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = Math.min(audio.duration, audio.currentTime + 15);
    setAudioProgress((audio.currentTime / audio.duration) * 100);
  };

  const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    console.error("[Audio] Error playing audio:", audio.error?.message, audio.error?.code);
    setIsPlaying(false);
  };

  // Auto-slideshow when audio is playing
  useEffect(() => {
    if (!isPlaying || !selectedStory || selectedStory.images.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % selectedStory.images.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isPlaying, selectedStory]);

  // Reset audio when story changes
  useEffect(() => {
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioCurrentTime(0);
    setAudioDuration(0);
  }, [selectedStory?.id]);

  const { data: todayStory, isLoading: loadingToday } = useQuery<BedtimeStory>({
    queryKey: [`/api/bedtime-stories/today?lang=${apiLanguage}`],
  });

  const { data: allStories, isLoading: loadingAll } = useQuery<BedtimeStory[]>({
    queryKey: [`/api/bedtime-stories?lang=${apiLanguage}`],
  });

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
    if (selectedStory && parent && !readIds.has(selectedStory.id)) {
      markReadMutation.mutate(selectedStory.id);
    }
  }, [selectedStory?.id, parent?.id]);

  // Auto-open story from URL query parameter (for shared links)
  useEffect(() => {
    if (!allStories) return;
    const params = new URLSearchParams(window.location.search);
    const storyId = params.get("story");
    if (storyId && !selectedStory) {
      const story = allStories.find(s => s.id === storyId);
      if (story) {
        setSelectedStory(story);
        setCurrentImageIndex(0);
      }
    }
  }, [allStories, selectedStory]);

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
      setSelectedStory(updatedStory);
      setIsEditing(false);
      toast.success(t("maaweelo.storyUpdated"));
    },
    onError: () => {
      toast.error(t("maaweelo.errorOccurred"));
    },
  });

  const generateAudioMutation = useMutation({
    mutationFn: async (storyId: string) => {
      const res = await fetch(`/api/bedtime-stories/${storyId}/generate-audio`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to generate audio");
      return res.json();
    },
    onSuccess: (updatedStory) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bedtime-stories?lang=${apiLanguage}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bedtime-stories/today?lang=${apiLanguage}`] });
      setSelectedStory(updatedStory);
      toast.success(t("maaweelo.audioGenerated"));
    },
    onError: () => {
      toast.error(t("maaweelo.audioError"));
    },
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
      setCurrentImageIndex((prev) => 
        prev === 0 ? selectedStory.images.length - 1 : prev - 1
      );
    }
  };

  const StoryCard = ({ story, isToday = false }: { story: BedtimeStory; isToday?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className={`cursor-pointer overflow-hidden ${
          isToday 
            ? "border-2 border-yellow-400 bg-gradient-to-br from-indigo-900/80 to-purple-900/80" 
            : "bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:border-indigo-500/50"
        }`}
        onClick={() => {
          setSelectedStory(story);
          setCurrentImageIndex(0);
        }}
        data-testid={`story-card-${story.id}`}
      >
        <CardContent className="p-4">
          {(story.thumbnailUrl || story.images?.length > 0) && (
            <div className="relative aspect-video mb-3 rounded-lg overflow-hidden">
              <img 
                src={story.thumbnailUrl || story.images?.[0]} 
                alt={story.titleSomali}
                className="w-full h-full object-cover"
              />
              {isToday && (
                <Badge className="absolute top-2 right-2 bg-yellow-500 text-black">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {t("maaweelo.tonightBadge")}
                </Badge>
              )}
            </div>
          )}
          <div className="space-y-2">
            <h3 className="font-bold text-lg text-white line-clamp-2">
              {story.titleSomali}
            </h3>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Calendar className="w-4 h-4" />
              {formatDate(story.storyDate)}
            </div>
            <div className="flex items-center gap-2">
              <Badge className="text-xs bg-indigo-600 text-white">
                {story.characterType === "sahabi" ? t("maaweelo.sahabi") : t("maaweelo.taabiciin")}
              </Badge>
              <span className="text-sm text-white font-medium">
                {story.characterName} {t("maaweelo.blessing")}
              </span>
            </div>
            {parent && readIds.has(story.id) && (
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                <span className="text-indigo-400 text-xs">{t("maaweelo.alreadyListened")}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#1e1b4b] to-[#0f172a] overflow-x-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => window.history.back()}
            className="text-white hover:bg-white/10"
            data-testid="button-back"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <Moon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {t("maaweelo.title")}
              </h1>
              <p className="text-slate-400 text-sm">
                {t("maaweelo.subtitle")}
              </p>
            </div>
          </div>
        </div>

        {parent && allStories && allStories.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 rounded-xl p-4 border border-indigo-500/30 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-indigo-400" />
                <span className="text-white font-semibold text-sm">{t("maaweelo.listeningProgress")}</span>
              </div>
              <span className="text-indigo-300 text-sm font-bold">{readIds.size}/{allStories.length}</span>
            </div>
            <Progress value={(readIds.size / allStories.length) * 100} className="h-2 bg-slate-700" />
            <p className="text-slate-400 text-xs mt-2">
              {readIds.size === 0 ? t("maaweelo.startListeningToday") : 
               readIds.size === allStories.length ? t("maaweelo.congratsAllListened") :
               t("maaweelo.remainingStories", { count: allStories.length - readIds.size })}
            </p>
          </div>
        )}

        {loadingToday ? (
          <Card className="mb-8 bg-gradient-to-br from-indigo-900/80 to-purple-900/80 border-2 border-yellow-400">
            <CardContent className="p-6">
              <Skeleton className="h-48 w-full mb-4 bg-slate-700" />
              <Skeleton className="h-6 w-3/4 mb-2 bg-slate-700" />
              <Skeleton className="h-4 w-1/2 bg-slate-700" />
            </CardContent>
          </Card>
        ) : todayStory ? (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <h2 className="text-xl font-semibold text-white">{t("maaweelo.tonightsStory")}</h2>
            </div>
            <StoryCard story={todayStory} isToday />
          </div>
        ) : (
          <Card className="mb-8 bg-slate-800/50 border-dashed border-2 border-slate-600">
            <CardContent className="p-8 text-center">
              <Moon className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">
                {t("maaweelo.noStoryToday")}
              </h3>
              <p className="text-slate-500 text-sm">
                {t("maaweelo.newStoriesComing")}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-semibold text-white">{t("maaweelo.previousStories")}</h2>
          </div>
          
          {loadingAll ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                  <Skeleton className="h-16 w-16 rounded-lg bg-slate-700 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4 bg-slate-700" />
                    <Skeleton className="h-3 w-1/2 bg-slate-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : allStories && allStories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allStories.filter(s => s.id !== todayStory?.id).map((story) => (
                <motion.button
                  key={story.id}
                  onClick={() => {
                    setSelectedStory(story);
                    setCurrentImageIndex(0);
                  }}
                  className="flex items-center gap-3 p-3 bg-gradient-to-br from-slate-800/70 to-indigo-900/30 rounded-xl border border-slate-700/50 hover:border-indigo-500/50 transition-all text-left group"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  data-testid={`story-list-item-${story.id}`}
                >
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                    {story.images.length > 0 ? (
                      <img 
                        src={story.images[0]} 
                        alt={story.titleSomali}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
                        <Moon className="w-6 h-6 text-white/70" />
                      </div>
                    )}
                    {parent && readIds.has(story.id) && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center shadow-sm">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm line-clamp-2 group-hover:text-indigo-300 transition-colors">
                      {story.titleSomali}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(story.storyDate)}</span>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-500 rotate-180 shrink-0 group-hover:text-indigo-400 transition-colors" />
                </motion.button>
              ))}
            </div>
          ) : (
            <Card className="bg-slate-800/50 border-dashed border-2 border-slate-600">
              <CardContent className="p-8 text-center">
                <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400">
                  {t("maaweelo.storiesNotPrepared")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y"
            style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
            onClick={() => setSelectedStory(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="min-h-screen py-8 px-4 max-w-full overflow-x-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="max-w-3xl mx-auto w-full">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedStory(null)}
                  className="mb-4 text-white hover:bg-white/10"
                  data-testid="button-close-story"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>

                {selectedStory.images.length > 0 && (
                  <div className="relative aspect-video mb-6 rounded-2xl overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={currentImageIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        src={selectedStory.images[currentImageIndex]}
                        alt={`Scene ${currentImageIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </AnimatePresence>
                    
                    {selectedStory.images.length > 1 && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={prevImage}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                          data-testid="button-prev-image"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={nextImage}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                          data-testid="button-next-image"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </Button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                          {selectedStory.images.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setCurrentImageIndex(i)}
                              className={`w-2 h-2 rounded-full transition-all ${
                                i === currentImageIndex 
                                  ? "bg-white w-4" 
                                  : "bg-white/50"
                              }`}
                              data-testid={`image-dot-${i}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Audio Player - right below images (matching Dhambaal layout) */}
                {selectedStory.audioUrl && !isEditing && (
                  <div className="bg-gradient-to-r from-purple-600/30 to-indigo-600/30 rounded-xl p-5 border border-purple-500/30 mb-4">
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={seekBackward}
                        size="icon"
                        className="h-10 w-10 rounded-full bg-purple-700/50 hover:bg-purple-600/50 flex-shrink-0"
                        data-testid="button-seek-backward"
                      >
                        <RotateCcw className="w-5 h-5 text-white" />
                      </Button>
                      <Button
                        onClick={toggleAudio}
                        size="icon"
                        className="h-14 w-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 flex-shrink-0"
                        data-testid="button-play-audio"
                      >
                        {isPlaying ? (
                          <Pause className="w-6 h-6 text-white" />
                        ) : (
                          <Play className="w-6 h-6 text-white ml-1" />
                        )}
                      </Button>
                      <Button
                        onClick={seekForward}
                        size="icon"
                        className="h-10 w-10 rounded-full bg-purple-700/50 hover:bg-purple-600/50 flex-shrink-0"
                        data-testid="button-seek-forward"
                      >
                        <RotateCw className="w-5 h-5 text-white" />
                      </Button>
                      <div className="flex-1 ml-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Volume2 className="w-5 h-5 text-purple-300" />
                          <h3 className="font-semibold text-purple-200">
                            {t("maaweelo.listenToStory")}
                          </h3>
                        </div>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-400 to-pink-500 transition-all duration-200"
                            style={{ width: `${audioProgress}%` }}
                          />
                        </div>
                        <p className="text-sm text-purple-200 mt-2" data-testid="text-audio-time">
                          {t("maaweelo.audioPlaybackTime")} {formatTime(audioCurrentTime)} / {formatTime(audioDuration)}
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
                  </div>
                )}

                {/* Share and Engagement Section - below audio player */}
                <div className="bg-slate-800/50 rounded-xl p-4 mb-4 space-y-4">
                  <ShareButton
                    title={selectedStory.titleSomali}
                    text={`${selectedStory.titleSomali} - ${t("maaweelo.shareText")}`}
                    url={`${window.location.origin}/maaweelo?story=${selectedStory.id}`}
                  />
                  
                  <ContentReactions
                    contentType="bedtime_story"
                    contentId={selectedStory.id}
                  />
                  
                  <ContentComments
                    contentType="bedtime_story"
                    contentId={selectedStory.id}
                  />
                </div>

                {/* Group Discussion Link */}
                <button
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-0 rounded-xl p-4 cursor-pointer transition-all active:scale-[0.98] shadow-lg shadow-indigo-900/30 mb-4"
                  onClick={async () => {
                    try {
                      await fetch("/api/groups/ae26dfaa-c2b3-4236-a168-bc6be74ac442/join", {
                        method: "POST",
                        credentials: "include",
                      });
                    } catch {}
                    setLocation("/groups?group=ae26dfaa-c2b3-4236-a168-bc6be74ac442");
                  }}
                  data-testid="link-sheeko-group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-bold text-sm">{t("maaweelo.joinGroup")}</p>
                      <p className="text-indigo-100 text-xs">{t("maaweelo.shareIdeas")}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/80" />
                  </div>
                </button>

                {/* Content Card - below share/comments, users can scroll down */}
                <div className={`bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-2xl p-6 md:p-8 backdrop-blur-sm ${isAdmin && !isEditing ? 'pb-32' : ''}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <Badge className="mb-3 bg-indigo-600 text-white px-3 py-1">
                        {selectedStory.characterType === "sahabi" ? t("maaweelo.sahabi") : t("maaweelo.taabiciin")}: {selectedStory.characterName} {t("maaweelo.blessing")}
                      </Badge>
                      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                        {selectedStory.titleSomali}
                      </h2>
                      <p className="text-slate-400 text-sm flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(selectedStory.storyDate)}
                      </p>
                    </div>
                  </div>

                  {/* Hide story content when audio is playing */}
                  <div className={isPlaying ? 'hidden' : ''}>
                    <div className="prose prose-invert prose-lg max-w-none mb-6">
                      {selectedStory.content.split('\n').map((paragraph, i) => (
                        <p key={i} className="text-slate-200 leading-relaxed mb-4">
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {selectedStory.moralLesson && !isEditing && (
                      <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-5 border border-yellow-500/30">
                        <div className="flex items-start gap-3">
                          <Heart className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
                          <div>
                            <h3 className="font-semibold text-yellow-300 mb-1">
                              {t("maaweelo.importantLesson")}
                            </h3>
                            <p className="text-yellow-100/80">
                              {selectedStory.moralLesson}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">

                  {/* Thank You Modal */}
                  <ThankYouModal
                    isOpen={showThankYouModal}
                    onClose={() => setShowThankYouModal(false)}
                    title={selectedStory.titleSomali}
                    shareUrl={`${window.location.origin}/maaweelo?story=${selectedStory.id}`}
                    contentType="bedtime_story"
                    contentId={selectedStory.id}
                  />

                  {/* Admin buttons - fixed at bottom for easy mobile access */}
                  {isAdmin && !isEditing && (
                    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent p-4 pb-6 z-50">
                      <div className="max-w-3xl mx-auto flex flex-col gap-2">
                        <Button
                          onClick={startEditing}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3"
                          data-testid="button-edit-story"
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          {t("maaweelo.editStory")}
                        </Button>
                        <Button
                          onClick={() => selectedStory && generateAudioMutation.mutate(selectedStory.id)}
                          disabled={generateAudioMutation.isPending}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3"
                          data-testid="button-generate-audio"
                        >
                          {generateAudioMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Mic className="w-4 h-4 mr-2" />
                          )}
                          {generateAudioMutation.isPending ? t("maaweelo.generatingAudio") : (selectedStory?.audioUrl ? t("maaweelo.regenerateAudio") : t("maaweelo.generateAudio"))}
                        </Button>
                      </div>
                    </div>
                  )}

                  {isAdmin && isEditing && (
                    <div className="pt-6 border-t border-slate-700 space-y-4">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Pencil className="w-5 h-5 text-indigo-400" />
                        {t("maaweelo.editStory")}
                      </h3>
                      
                      <div>
                        <label className="text-sm text-slate-400 mb-1 block">{t("maaweelo.somaliTitleLabel")}</label>
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="bg-slate-800 border-slate-600 text-white"
                          placeholder={t("maaweelo.storyTitlePlaceholder")}
                          data-testid="input-edit-title"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm text-slate-400 mb-1 block">{t("maaweelo.storyLabel")}</label>
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="bg-slate-800 border-slate-600 text-white min-h-[200px]"
                          placeholder={t("maaweelo.fullStoryPlaceholder")}
                          data-testid="input-edit-content"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm text-slate-400 mb-1 block">{t("maaweelo.moralLessonLabel")}</label>
                        <Textarea
                          value={editMoralLesson}
                          onChange={(e) => setEditMoralLesson(e.target.value)}
                          className="bg-slate-800 border-slate-600 text-white min-h-[80px]"
                          placeholder={t("maaweelo.storyLessonPlaceholder")}
                          data-testid="input-edit-moral"
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <Button
                          onClick={cancelEditing}
                          variant="outline"
                          className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                          data-testid="button-cancel-edit"
                        >
                          <X className="w-4 h-4 mr-2" />
                          {t("maaweelo.cancel")}
                        </Button>
                        <Button
                          onClick={saveChanges}
                          disabled={updateMutation.isPending}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          data-testid="button-save-edit"
                        >
                          {updateMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          {t("maaweelo.save")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
