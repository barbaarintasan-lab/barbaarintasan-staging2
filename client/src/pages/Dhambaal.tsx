import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { 
  MessageCircle,
  ChevronLeft, 
  ChevronRight,
  Calendar,
  BookOpen,
  Sparkles,
  Pencil,
  Save,
  X,
  Loader2,
  User,
  CheckCircle2,
  Volume2,
  Pause,
  Play,
  Mic,
  RotateCcw,
  RotateCw,
  Users,
  Award,
  Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { toast } from "sonner";
import { ShareButton, ContentReactions, ContentComments, ThankYouModal } from "@/components/engagement";
import DhambaalDiscussionGroup from "@/components/DhambaalDiscussionGroup";

function getProxyAudioUrl(audioUrl: string | null): string | null {
  if (!audioUrl) return null;
  const match = audioUrl.match(/[?&]id=([^&]+)/);
  if (match) {
    return `/api/tts-audio/${match[1]}`;
  }
  return audioUrl;
}

interface ParentMessage {
  id: string;
  title: string;
  content: string;
  topic: string;
  keyPoints: string | null;
  images: string[];
  audioUrl: string | null;
  messageDate: string;
  generatedAt: string;
  isPublished: boolean;
  authorName: string | null;
}

export default function Dhambaal() {
  const [, setLocation] = useLocation();
  const [selectedMessage, setSelectedMessage] = useState<ParentMessage | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editKeyPoints, setEditKeyPoints] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [showThankYouModal, setShowThankYouModal] = useState(false);

  // Format seconds to mm:ss
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  const audioRef = useRef<HTMLAudioElement>(null);
  const imagesRef = useRef<HTMLDivElement>(null);
  const { parent } = useParentAuth();
  const queryClient = useQueryClient();
  const isAdmin = parent?.isAdmin;

  // Audio player handlers - scroll to images when playing
  const toggleAudio = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
        // Scroll to images when starting to play
        if (imagesRef.current) {
          imagesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }).catch(console.error);
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
    // Show thank you modal if not already shown for this message
    if (selectedMessage) {
      const key = `parent_message:${selectedMessage.id}:thankyou`;
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

  // Auto-slideshow when audio is playing
  useEffect(() => {
    if (!isPlaying || !selectedMessage || selectedMessage.images.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % selectedMessage.images.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isPlaying, selectedMessage]);

  // Reset audio when message changes
  useEffect(() => {
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioCurrentTime(0);
    setAudioDuration(0);
  }, [selectedMessage?.id]);

  const { data: todayMessage, isLoading: loadingToday } = useQuery<ParentMessage>({
    queryKey: ["/api/parent-messages/today"],
  });

  const { data: allMessages, isLoading: loadingAll } = useQuery<ParentMessage[]>({
    queryKey: ["/api/parent-messages"],
  });

  const { data: dhambaalProgress = [] } = useQuery<{ contentId: string }[]>({
    queryKey: ["contentProgress", "dhambaal"],
    queryFn: async () => {
      const res = await fetch("/api/content-progress?type=dhambaal", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!parent,
  });
  const readIds = new Set(dhambaalProgress.map(p => p.contentId));

  const markReadMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const res = await fetch("/api/content-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contentType: "dhambaal", contentId }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contentProgress", "dhambaal"] });
      queryClient.invalidateQueries({ queryKey: ["earnedBadges"] });
      queryClient.invalidateQueries({ queryKey: ["contentProgressSummary"] });
      if (data.awardedBadges?.length > 0) {
        toast.success(`🏆 Abaalmarin cusub: ${data.awardedBadges.join(", ")}`);
      }
    },
  });

  useEffect(() => {
    if (selectedMessage && parent && !readIds.has(selectedMessage.id)) {
      markReadMutation.mutate(selectedMessage.id);
    }
  }, [selectedMessage?.id, parent?.id]);

  // Auto-open message from URL query parameter (for shared links)
  useEffect(() => {
    if (!allMessages) return;
    const params = new URLSearchParams(window.location.search);
    const messageId = params.get("message");
    if (messageId && !selectedMessage) {
      const message = allMessages.find(m => m.id === messageId);
      if (message) {
        setSelectedMessage(message);
        setCurrentImageIndex(0);
      }
    }
  }, [allMessages, selectedMessage]);

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; title: string; content: string; keyPoints: string }) => {
      const res = await fetch(`/api/parent-messages/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          keyPoints: data.keyPoints,
        }),
      });
      if (!res.ok) throw new Error("Failed to update message");
      return res.json();
    },
    onSuccess: (updatedMessage) => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent-messages/today"] });
      setSelectedMessage(updatedMessage);
      setIsEditing(false);
      toast.success("Dhambaalka waa la cusboonaysiiyay!");
    },
    onError: () => {
      toast.error("Wax qalad ah ayaa dhacay");
    },
  });

  const generateAudioMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await fetch(`/api/parent-messages/${messageId}/generate-audio`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate audio");
      return res.json();
    },
    onSuccess: (updatedMessage) => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent-messages/today"] });
      setSelectedMessage(updatedMessage);
      toast.success("Codka waa la sameeyay!");
    },
    onError: () => {
      toast.error("Codka lama samayn karin");
    },
  });

  const startEditing = () => {
    if (selectedMessage) {
      setEditTitle(selectedMessage.title);
      setEditContent(selectedMessage.content);
      setEditKeyPoints(selectedMessage.keyPoints || "");
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditTitle("");
    setEditContent("");
    setEditKeyPoints("");
  };

  const saveChanges = () => {
    if (selectedMessage) {
      updateMutation.mutate({
        id: selectedMessage.id,
        title: editTitle,
        content: editContent,
        keyPoints: editKeyPoints,
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
    if (selectedMessage && selectedMessage.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % selectedMessage.images.length);
    }
  };

  const prevImage = () => {
    if (selectedMessage && selectedMessage.images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? selectedMessage.images.length - 1 : prev - 1
      );
    }
  };

  const MessageCard = ({ message, isToday = false }: { message: ParentMessage; isToday?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className={`cursor-pointer overflow-hidden ${
          isToday 
            ? "border-2 border-emerald-400 bg-gradient-to-br from-emerald-900/80 to-teal-900/80" 
            : "bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:border-emerald-500/50"
        }`}
        onClick={() => {
          setSelectedMessage(message);
          setCurrentImageIndex(0);
        }}
        data-testid={`message-card-${message.id}`}
      >
        <CardContent className="p-4">
          {(message.thumbnailUrl || message.images?.length > 0) && (
            <div className="relative aspect-video mb-3 rounded-lg overflow-hidden">
              <img 
                src={message.thumbnailUrl || message.images?.[0]} 
                alt={message.title}
                className="w-full h-full object-cover"
              />
              {isToday && (
                <Badge className="absolute top-2 right-2 bg-emerald-500 text-white">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Maanta
                </Badge>
              )}
            </div>
          )}
          <div className="space-y-2">
            <h3 className="font-bold text-lg text-white line-clamp-2">
              {message.title}
            </h3>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Calendar className="w-4 h-4" />
              {formatDate(message.messageDate)}
            </div>
            <Badge className="text-xs bg-teal-600 text-white">
              {message.topic}
            </Badge>
            {parent && readIds.has(message.id) && (
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-xs">Waa la akhriyay</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#134e4a] to-[#0f172a] overflow-x-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-emerald-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.6, 0.2],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
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
            onClick={() => setLocation("/")}
            className="text-white hover:bg-white/10"
            data-testid="button-back"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Dhambaalka Waalidka
              </h1>
              <p className="text-slate-400 text-sm">
                Talo iyo tilmaamo waalidnimo maalin kasta
              </p>
            </div>
          </div>
        </div>

        {parent && allMessages && allMessages.length > 0 && (
          <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 rounded-xl p-4 border border-emerald-500/30 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-emerald-400" />
                <span className="text-white font-semibold text-sm">Horumarka Akhriskaaga</span>
              </div>
              <span className="text-emerald-300 text-sm font-bold">{readIds.size}/{allMessages.length}</span>
            </div>
            <Progress value={(readIds.size / allMessages.length) * 100} className="h-2 bg-slate-700" />
            <p className="text-slate-400 text-xs mt-2">
              {readIds.size === 0 ? "Billow akhriskaaga maanta!" : 
               readIds.size === allMessages.length ? "Hambalyo! Dhammaan ayaad akhriyay! 🎉" :
               `${allMessages.length - readIds.size} dhambaal ayaad weli akhriyi la'dahay`}
            </p>
          </div>
        )}

        {loadingToday ? (
          <Card className="mb-8 bg-gradient-to-br from-emerald-900/80 to-teal-900/80 border-2 border-emerald-400">
            <CardContent className="p-6">
              <Skeleton className="h-48 w-full mb-4 bg-slate-700" />
              <Skeleton className="h-6 w-3/4 mb-2 bg-slate-700" />
              <Skeleton className="h-4 w-1/2 bg-slate-700" />
            </CardContent>
          </Card>
        ) : todayMessage ? (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-semibold text-white">Dhambaalka Maanta</h2>
            </div>
            <MessageCard message={todayMessage} isToday />
          </div>
        ) : (
          <Card className="mb-8 bg-slate-800/50 border-dashed border-2 border-slate-600">
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">
                Maanta dhambaal cusub ma jirto
              </h3>
              <p className="text-slate-500 text-sm">
                Dhambaalyo cusub way imanayaan!
              </p>
            </CardContent>
          </Card>
        )}

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-semibold text-white">Dhambaalladeena Hore</h2>
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
          ) : allMessages && allMessages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allMessages.filter(m => m.id !== todayMessage?.id).map((message) => (
                <motion.button
                  key={message.id}
                  onClick={() => {
                    setSelectedMessage(message);
                    setCurrentImageIndex(0);
                  }}
                  className="flex items-center gap-3 p-3 bg-gradient-to-br from-slate-800/70 to-emerald-900/30 rounded-xl border border-slate-700/50 hover:border-emerald-500/50 transition-all text-left group"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  data-testid={`message-list-item-${message.id}`}
                >
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                    {message.images.length > 0 ? (
                      <img 
                        src={message.images[0]} 
                        alt={message.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center">
                        <MessageCircle className="w-6 h-6 text-white/70" />
                      </div>
                    )}
                    {parent && readIds.has(message.id) && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm line-clamp-2 group-hover:text-emerald-300 transition-colors">
                      {message.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(message.messageDate)}</span>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-500 rotate-180 shrink-0 group-hover:text-emerald-400 transition-colors" />
                </motion.button>
              ))}
            </div>
          ) : (
            <Card className="bg-slate-800/50 border-dashed border-2 border-slate-600">
              <CardContent className="p-8 text-center">
                <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400">
                  Dhambaallooyinka aan wali la diyaarin
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black overflow-y-auto overflow-x-hidden"
            onClick={() => setSelectedMessage(null)}
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
                  onClick={() => setSelectedMessage(null)}
                  className="mb-4 text-white hover:bg-white/10"
                  data-testid="button-close-message"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>

                {selectedMessage.images.length > 0 && (
                  <div ref={imagesRef} className="relative aspect-video mb-6 rounded-2xl overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={currentImageIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        src={selectedMessage.images[currentImageIndex]}
                        alt={selectedMessage.title}
                        className="w-full h-full object-cover"
                      />
                    </AnimatePresence>
                    
                    {selectedMessage.images.length > 1 && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={prevImage}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                          data-testid="button-prev-image"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={nextImage}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                          data-testid="button-next-image"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </Button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                          {selectedMessage.images.map((_, idx) => (
                            <div
                              key={idx}
                              className={`w-2 h-2 rounded-full ${
                                idx === currentImageIndex ? "bg-white" : "bg-white/50"
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Audio Player - right below images */}
                {selectedMessage.audioUrl && !isEditing && (
                  <div className="bg-gradient-to-r from-teal-600/30 to-emerald-600/30 rounded-xl p-5 border border-teal-500/30 mb-4">
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={seekBackward}
                        size="icon"
                        className="h-10 w-10 rounded-full bg-teal-700/50 hover:bg-teal-600/50 flex-shrink-0"
                        data-testid="button-seek-backward"
                      >
                        <RotateCcw className="w-5 h-5 text-white" />
                      </Button>
                      <Button
                        type="button"
                        onClick={(e) => toggleAudio(e)}
                        size="icon"
                        className="h-14 w-14 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 flex-shrink-0"
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
                        className="h-10 w-10 rounded-full bg-teal-700/50 hover:bg-teal-600/50 flex-shrink-0"
                        data-testid="button-seek-forward"
                      >
                        <RotateCw className="w-5 h-5 text-white" />
                      </Button>
                      <div className="flex-1 ml-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Volume2 className="w-5 h-5 text-teal-300" />
                          <h3 className="font-semibold text-teal-200">
                            Dhagayso Maqaalka
                          </h3>
                        </div>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-200"
                            style={{ width: `${audioProgress}%` }}
                          />
                        </div>
                        <p className="text-sm text-teal-200 mt-2" data-testid="text-audio-time">
                          Dhagaysiga cajladani waa: {formatTime(audioCurrentTime)} / {formatTime(audioDuration)}
                        </p>
                      </div>
                    </div>
                    <audio
                      ref={audioRef}
                      src={getProxyAudioUrl(selectedMessage.audioUrl) || undefined}
                      onTimeUpdate={handleAudioTimeUpdate}
                      onLoadedMetadata={handleAudioLoadedMetadata}
                      onEnded={handleAudioEnded}
                      playsInline
                    />
                  </div>
                )}

                {/* Share and Engagement Section - below audio player */}
                <div className="bg-slate-800/50 rounded-xl p-4 mb-4 space-y-4">
                  <ShareButton
                    title={selectedMessage.title}
                    text={`${selectedMessage.title} - Dhambaalka waalidka`}
                    url={`${window.location.origin}/dhambaal?message=${selectedMessage.id}`}
                  />
                  
                  <ContentReactions
                    contentType="parent_message"
                    contentId={selectedMessage.id}
                  />
                  
                  <ContentComments
                    contentType="parent_message"
                    contentId={selectedMessage.id}
                  />
                </div>

                {/* Group Discussion Link */}
                <button
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-0 rounded-xl p-4 cursor-pointer transition-all active:scale-[0.98] shadow-lg shadow-emerald-900/30"
                  onClick={async () => {
                    try {
                      await fetch("/api/groups/1cb34f9b-5480-4d52-af2d-22e6e5e4674d/join", {
                        method: "POST",
                        credentials: "include",
                      });
                    } catch {}
                    setLocation("/groups?group=1cb34f9b-5480-4d52-af2d-22e6e5e4674d");
                  }}
                  data-testid="link-dhambaal-group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-bold text-sm">Ku Biir Guruubka lagu falanqeeyo Casharkan</p>
                      <p className="text-emerald-100 text-xs">Waalidiinta kale la wadaag fikradahaaga</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/80" />
                  </div>
                </button>

                {/* Discussion Section */}
                <DhambaalDiscussionGroup messageId={selectedMessage.id} />

                {/* Thank You Modal */}
                <ThankYouModal
                  isOpen={showThankYouModal}
                  onClose={() => setShowThankYouModal(false)}
                  title={selectedMessage.title}
                  shareUrl={`${window.location.origin}/dhambaal?message=${selectedMessage.id}`}
                  contentType="parent_message"
                  contentId={selectedMessage.id}
                />

                {/* Content Card - below share/comments, users can scroll down */}
                <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      {isEditing ? (
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="text-2xl font-bold bg-slate-700 border-slate-600 text-white mb-2"
                          data-testid="input-edit-title"
                        />
                      ) : (
                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                          {selectedMessage.title}
                        </h2>
                      )}
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(selectedMessage.messageDate)}
                        </div>
                        <Badge className="bg-teal-600 text-white">
                          {selectedMessage.topic}
                        </Badge>
                      </div>
                    </div>
                    
                    {isAdmin && (
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={cancelEditing}
                              className="border-slate-600 text-slate-300"
                              data-testid="button-cancel-edit"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Jooji
                            </Button>
                            <Button
                              size="sm"
                              onClick={saveChanges}
                              disabled={updateMutation.isPending}
                              className="bg-emerald-600 hover:bg-emerald-700"
                              data-testid="button-save-edit"
                            >
                              {updateMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Save className="w-4 h-4 mr-1" />
                                  Kaydi
                                </>
                              )}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={startEditing}
                              className="border-slate-600 text-slate-300"
                              data-testid="button-start-edit"
                            >
                              <Pencil className="w-4 h-4 mr-1" />
                              Wax ka Bedel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => selectedMessage && generateAudioMutation.mutate(selectedMessage.id)}
                              disabled={generateAudioMutation.isPending}
                              className="bg-purple-600 hover:bg-purple-700"
                              data-testid="button-generate-audio"
                            >
                              {generateAudioMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Mic className="w-4 h-4 mr-1" />
                                  {selectedMessage?.audioUrl ? "Codka Dib u Samee" : "Codka Samee"}
                                </>
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Hide message content when audio is playing - use CSS to avoid scroll issues */}
                  <div className={isPlaying ? 'hidden' : ''}>
                    <div className="flex items-center gap-2 mb-6 p-3 bg-slate-700/50 rounded-lg">
                      <User className="w-5 h-5 text-emerald-400" />
                      <span className="text-slate-300 text-sm">
                        {selectedMessage.authorName || "Musse Said Aw-Musse"}
                      </span>
                    </div>

                    <div className="prose prose-invert prose-lg max-w-none mb-6">
                      {isEditing ? (
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[300px] bg-slate-700 border-slate-600 text-white"
                          data-testid="textarea-edit-content"
                        />
                      ) : (
                        <div className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {selectedMessage.content}
                        </div>
                      )}
                    </div>

                    {(selectedMessage.keyPoints || isEditing) && (
                      <div className="bg-emerald-900/30 rounded-xl p-4 border border-emerald-500/30">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <h3 className="font-semibold text-emerald-300">Qodobbada Muhiimka ah</h3>
                        </div>
                        {isEditing ? (
                          <Textarea
                            value={editKeyPoints}
                            onChange={(e) => setEditKeyPoints(e.target.value)}
                            placeholder="Qodob kasta meel cusub ku qor..."
                            className="bg-slate-700 border-slate-600 text-white"
                            data-testid="textarea-edit-keypoints"
                          />
                        ) : (
                          <ul className="space-y-2">
                            {selectedMessage.keyPoints?.split(/[,،\n]/).filter(Boolean).map((point, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-emerald-100">
                                <span className="text-emerald-400 mt-1">•</span>
                                <span>{point.trim()}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
