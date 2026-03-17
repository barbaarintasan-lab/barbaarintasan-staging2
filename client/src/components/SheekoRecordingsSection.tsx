import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Play, Pause, Clock, Users, Calendar, Loader2, SkipBack, SkipForward, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useRef, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface VoiceRecording {
  id: string;
  roomId: string | null;
  title: string;
  description: string | null;
  hostId: string;
  driveFileId: string;
  driveUrl: string | null;
  duration: number | null;
  fileSize: string | null;
  isPublished: boolean;
  participantCount: number | null;
  recordedAt: string;
  host: {
    id: string;
    name: string;
    picture: string | null;
  };
}

interface SheekoRecordingsSectionProps {
  onBack: () => void;
}

export default function SheekoRecordingsSection({ onBack }: SheekoRecordingsSectionProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastTapRef = useRef<number>(0);
  const queryClient = useQueryClient();
  const { parent } = useParentAuth();
  const isAdmin = parent?.isAdmin || parent?.email === "barbaarintasan@gmail.com";

  const { data: recordings = [], isLoading } = useQuery<VoiceRecording[]>({
    queryKey: ["/api/voice-recordings"],
    queryFn: () => fetch("/api/voice-recordings").then(r => r.json()),
    refetchOnMount: true,
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/voice-recordings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete recording");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-recordings"] });
      toast.success("Recording la tirtiray");
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Wax qalad ah ayaa dhacay");
    },
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setPlayingId(null);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [playingId]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const seekTo = useCallback((percent: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const newTime = Math.max(0, Math.min(duration, percent * duration));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const skipForward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(duration, audio.currentTime + 10);
  }, [duration]);

  const skipBackward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  }, []);

  const togglePlay = async (recording: VoiceRecording, e?: React.TouchEvent | React.MouseEvent) => {
    // Prevent double-firing on mobile (both touch and click)
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      return; // Debounce rapid taps
    }
    lastTapRef.current = now;
    
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const audio = audioRef.current;
    if (!audio || audioLoading) return;

    if (playingId === recording.id) {
      audio.pause();
      setPlayingId(null);
    } else {
      // Stop any current playback first
      audio.pause();
      setPlayingId(null);
      setAudioLoading(true);
      
      // Use server-side proxy to avoid CORS issues
      const newSrc = `/api/voice-recordings/${recording.id}/stream`;
      
      try {
        // Set source and try to play immediately (preserves user gesture on iOS)
        audio.src = newSrc;
        
        // Important for iOS: play() must be called synchronously in the gesture handler
        // We call play() right away and let it buffer
        await audio.play();
        setPlayingId(recording.id);
        setAudioLoading(false);
      } catch (error: any) {
        console.error("Initial play failed:", error?.message || error);
        
        // For iOS: if play fails, try loading first then playing
        if (error?.name === 'NotAllowedError' || error?.name === 'AbortError') {
          // User gesture lost, need to show a "tap to play" state
          setAudioLoading(false);
          // Set source so next tap will work
          audio.src = newSrc;
          audio.load();
        } else {
          // Network or other error - wait for canplay
          const playWhenReady = () => {
            audio.removeEventListener('canplay', playWhenReady);
            audio.play()
              .then(() => {
                setPlayingId(recording.id);
                setAudioLoading(false);
              })
              .catch(() => setAudioLoading(false));
          };
          audio.addEventListener('canplay', playWhenReady, { once: true });
          audio.load();
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-600 via-purple-700 to-indigo-900 pb-24">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-violet-600 to-purple-700 safe-top shadow-lg">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center" 
              data-testid="button-back-sheeko"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="font-bold text-white text-lg">Sheeko Archive</h1>
              <p className="text-purple-200 text-sm">Wadahadalladii hore la duubay</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        ) : recordings.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🎙️</span>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Wali ma jiro recording</h3>
            <p className="text-purple-200 text-sm">
              Marka Sheeko la duubo, halkan ayay ka muuqan doontaa
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recordings.map((recording) => (
              <Card 
                key={recording.id} 
                className="bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden relative"
                data-testid={`recording-card-${recording.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Button
                      size="icon"
                      className={`h-14 w-14 rounded-full shrink-0 touch-manipulation select-none ${
                        playingId === recording.id 
                          ? "bg-gradient-to-br from-purple-500 to-pink-600" 
                          : "bg-white/20"
                      }`}
                      onTouchEnd={(e) => togglePlay(recording, e)}
                      onClick={(e) => togglePlay(recording, e)}
                      disabled={audioLoading}
                      data-testid={`play-button-${recording.id}`}
                    >
                      {audioLoading && playingId !== recording.id ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : playingId === recording.id ? (
                        <Pause className="w-6 h-6 text-white" />
                      ) : (
                        <Play className="w-6 h-6 text-white ml-1" />
                      )}
                    </Button>
                    
                    {isAdmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 text-red-300 hover:text-red-400 hover:bg-red-500/20 absolute top-2 right-2"
                        onClick={() => setDeleteId(recording.id)}
                        data-testid={`delete-button-${recording.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-base line-clamp-2 mb-1">
                        {recording.title}
                      </h3>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={recording.host.picture || undefined} />
                          <AvatarFallback className="text-[10px] bg-purple-500 text-white">
                            {recording.host.name?.charAt(0).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-purple-200 text-xs">{recording.host.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-purple-200 text-xs">
                        {recording.duration && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDuration(recording.duration)}</span>
                          </div>
                        )}
                        {recording.participantCount && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{recording.participantCount} qof</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{format(new Date(recording.recordedAt), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                      
                      {playingId === recording.id && duration > 0 && (
                        <div className="mt-3 space-y-2">
                          {/* Skip buttons */}
                          <div className="flex items-center justify-center gap-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-white hover:bg-white/20"
                              onClick={skipBackward}
                            >
                              <SkipBack className="w-4 h-4" />
                            </Button>
                            <span className="text-xs text-purple-200">10s</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-white hover:bg-white/20"
                              onClick={skipForward}
                            >
                              <SkipForward className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          {/* Progress bar */}
                          <div 
                            className="h-4 bg-white/20 rounded-full cursor-pointer relative touch-none"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const rect = e.currentTarget.getBoundingClientRect();
                              const percent = (e.clientX - rect.left) / rect.width;
                              seekTo(percent);
                            }}
                            onTouchStart={(e) => {
                              e.preventDefault();
                              const rect = e.currentTarget.getBoundingClientRect();
                              const touch = e.touches[0];
                              const percent = (touch.clientX - rect.left) / rect.width;
                              seekTo(percent);
                            }}
                          >
                            <div 
                              className="h-full bg-gradient-to-r from-purple-400 to-pink-500 rounded-full pointer-events-none"
                              style={{ width: `${(currentTime / duration) * 100}%` }}
                            />
                            <div 
                              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg pointer-events-none border-2 border-purple-400"
                              style={{ left: `calc(${(currentTime / duration) * 100}% - 10px)` }}
                            />
                          </div>
                          
                          <div className="flex justify-between text-[10px] text-purple-300">
                            <span>{formatDuration(currentTime)}</span>
                            <span>{formatDuration(duration)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <audio 
        ref={audioRef} 
        className="hidden" 
        playsInline 
        preload="none"
        x-webkit-airplay="allow"
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-purple-900 border-purple-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Recording-ka tirtir?</AlertDialogTitle>
            <AlertDialogDescription className="text-purple-200">
              Ma hubtaa inaad tirtirayso recording-kan? Tallaabadan lama celin karo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              Maya
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Haa, Tirtir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
