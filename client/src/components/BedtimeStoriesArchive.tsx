import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowLeft, Moon, Star, Calendar, BookOpen, Volume2, Play, Pause, RotateCcw, RotateCw, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { scheduleIdleTask, trackedFetchJson, useExcessiveRenderWarning, useSlowRenderWarning } from "@/lib/performance";
import { memo, useState, useRef, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";

const BLESSING_TEXT = "(Allaha ka Raali Noqdo)";

function getProxyAudioUrl(audioUrl: string | null): string | null {
  if (!audioUrl) return null;
  const match = audioUrl.match(/[?&]id=([^&]+)/);
  if (match) {
    return `/api/tts-audio/${match[1]}`;
  }
  return audioUrl;
}

interface BedtimeStory {
  id: number;
  title: string;
  titleSomali: string;
  content: string;
  characterName: string;
  characterType: "sahabi" | "tabiyin";
  moralLesson: string;
  ageRange: string;
  images: string[];
  audioUrl: string | null;
  storyDate: string;
  generatedAt: string;
  isPublished: boolean;
}

interface BedtimeStoriesArchiveProps {
  onBack: () => void;
}

const StoryListCard = memo(function StoryListCard({
  story,
  formatDate,
  onSelectStory,
}: {
  story: BedtimeStory;
  formatDate: (dateString: string) => string;
  onSelectStory: (story: BedtimeStory) => void;
}) {
  return (
    <Card
      className="bg-slate-800/60 border-slate-700 overflow-hidden cursor-pointer hover:bg-slate-800/80 transition-all duration-200 active:scale-[0.99]"
      onClick={() => onSelectStory(story)}
      data-testid={`card-story-${story.id}`}
    >
      <CardContent className="p-0">
        <div className="flex gap-4 min-h-[96px]">
          {story.images && story.images[0] && (
            <div className="w-24 h-24 flex-shrink-0">
              <img
                src={story.images[0]}
                alt={story.titleSomali}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="py-3 pr-4 flex-1">
            <h3 className="text-white font-medium mb-1 line-clamp-1">
              {story.titleSomali}
            </h3>
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(story.storyDate)}</span>
              <span className="text-slate-600">•</span>
              <span className={story.characterType === "sahabi" ? "text-emerald-400" : "text-blue-400"}>
                {story.characterName}
              </span>
            </div>
            <p className="text-slate-400 text-sm line-clamp-2">
              {story.content.substring(0, 100)}...
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default function BedtimeStoriesArchive({ onBack }: BedtimeStoriesArchiveProps) {
  const queryClient = useQueryClient();
  const [selectedStory, setSelectedStory] = useState<BedtimeStory | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const listPauseTimerRef = useRef<number | null>(null);

  useExcessiveRenderWarning("BedtimeStoriesArchive", 3, 700);
  useSlowRenderWarning("BedtimeStoriesArchive", 16);

  const { data: allStories = [], isLoading } = useQuery<BedtimeStory[]>({
    queryKey: ["/api/bedtime-stories"],
    queryFn: () => trackedFetchJson<BedtimeStory[]>("/api/bedtime-stories", undefined, "BedtimeStoriesArchive.list", { priority: "high" }),
    placeholderData: (prev) => prev,
    staleTime: 60000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const stories = useMemo(() => allStories.filter(story => story.isPublished), [allStories]);
  const storyCount = stories.length;

  const storyVirtualizer = useVirtualizer({
    count: storyCount,
    getScrollElement: () => listContainerRef.current,
    estimateSize: () => 112,
    overscan: 5,
    enabled: !selectedStory,
  });

  // Get current story index in the playlist
  const currentStoryIndex = selectedStory 
    ? stories.findIndex(story => story.id === selectedStory.id)
    : -1;
  
  // Check if we're at the first or last story
  const isFirstStory = currentStoryIndex === 0;
  const isLastStory = currentStoryIndex === stories.length - 1;

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch {
      return dateString;
    }
  };

  const handleSelectStory = useCallback((story: BedtimeStory) => {
    setSelectedStory(story);
    setCurrentImageIndex(0);
  }, []);

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const pauseCurrentAudio = () => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
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
    
    // Auto-play next lesson after 2 seconds if not at the last story
    if (!isLastStory && currentStoryIndex >= 0) {
      autoPlayTimeoutRef.current = setTimeout(() => {
        goToNextStory();
      }, 2000);
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

  const goToPreviousStory = () => {
    if (isFirstStory || currentStoryIndex < 0) return;
    const previousStory = stories[currentStoryIndex - 1];
    if (previousStory) {
      pauseCurrentAudio();
      setSelectedStory(previousStory);
      setCurrentImageIndex(0);
    }
  };

  const goToNextStory = () => {
    if (isLastStory || currentStoryIndex < 0) return;
    const nextStory = stories[currentStoryIndex + 1];
    if (nextStory) {
      pauseCurrentAudio();
      setSelectedStory(nextStory);
      setCurrentImageIndex(0);
    }
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
    
    // Clear any pending auto-play timeout
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
  }, [selectedStory?.id]);

  // Cleanup auto-play timeout on component unmount
  useEffect(() => {
    return () => {
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedStory || !listContainerRef.current) return;

    const container = listContainerRef.current;

    const prefetchStoryPages = () => {
      queryClient.prefetchQuery({
        queryKey: ["/api/bedtime-stories?limit=40"],
        queryFn: () => trackedFetchJson("/api/bedtime-stories?limit=40", undefined, "BedtimeStoriesArchive.prefetch.nearBottom", { priority: "low" }).catch(() => []),
        staleTime: 5 * 60 * 1000,
      });
    };

    const prefetchAdjacent = () => {
      scheduleIdleTask(() => {
        queryClient.prefetchQuery({
          queryKey: ["/api/bedtime-stories/latest"],
          queryFn: () => trackedFetchJson("/api/bedtime-stories/latest", { credentials: "include", cache: "no-store" }, "BedtimeStoriesArchive.prefetch.adjacent", { priority: "low" }).catch(() => null),
          staleTime: 5 * 60 * 1000,
        });
      }, 400);
    };

    const onScroll = () => {
      const remaining = container.scrollHeight - (container.clientHeight + container.scrollTop);
      if (remaining < 600) {
        prefetchStoryPages();
      }

      if (listPauseTimerRef.current) {
        window.clearTimeout(listPauseTimerRef.current);
      }
      listPauseTimerRef.current = window.setTimeout(() => {
        prefetchAdjacent();
      }, 200);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (listPauseTimerRef.current) {
        window.clearTimeout(listPauseTimerRef.current);
      }
    };
  }, [queryClient, selectedStory]);

  if (selectedStory) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 pb-24">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedStory(null);
                setCurrentImageIndex(0);
              }}
              className="text-white hover:bg-white/10"
              data-testid="button-back-story"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">{selectedStory.titleSomali}</h1>
              <p className="text-slate-400 text-sm">{formatDate(selectedStory.storyDate)}</p>
            </div>
          </div>

          {selectedStory.images && selectedStory.images.length > 0 && (
            <div className="mb-6">
              <div className="relative rounded-2xl overflow-hidden">
                <img
                  src={selectedStory.images[currentImageIndex]}
                  alt={selectedStory.titleSomali}
                  className="w-full h-64 object-cover"
                />
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  {selectedStory.images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentImageIndex ? "bg-white w-6" : "bg-white/50"
                      }`}
                      data-testid={`dot-image-${idx}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Audio Player */}
          {selectedStory.audioUrl && (
            <div className="bg-gradient-to-r from-purple-600/30 to-indigo-600/30 rounded-xl p-5 border border-purple-500/30 mb-6">
              {/* Playlist Position Indicator and Navigation */}
              {stories.length > 1 && currentStoryIndex >= 0 && (
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-purple-500/20">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-300" />
                    <span className="text-sm text-purple-200 font-medium">
                      Casharka {currentStoryIndex + 1} / {stories.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={goToPreviousStory}
                      disabled={isFirstStory}
                      size="sm"
                      className="h-8 px-3 bg-purple-700/50 hover:bg-purple-600/50 disabled:opacity-30 disabled:cursor-not-allowed"
                      data-testid="button-previous-story"
                    >
                      <SkipBack className="w-4 h-4 text-white mr-1" />
                      <span className="text-xs text-white">Hore</span>
                    </Button>
                    <Button
                      type="button"
                      onClick={goToNextStory}
                      disabled={isLastStory}
                      size="sm"
                      className="h-8 px-3 bg-purple-700/50 hover:bg-purple-600/50 disabled:opacity-30 disabled:cursor-not-allowed"
                      data-testid="button-next-story"
                    >
                      <span className="text-xs text-white">Xiga</span>
                      <SkipForward className="w-4 h-4 text-white ml-1" />
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={seekBackward}
                  size="icon"
                  className="h-10 w-10 rounded-full bg-purple-700/50 hover:bg-purple-600/50 flex-shrink-0"
                  data-testid="button-seek-backward"
                >
                  <RotateCcw className="w-5 h-5 text-white" />
                </Button>
                <Button
                  type="button"
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
                  type="button"
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
                      Dhagayso Sheekada
                    </h3>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-400 to-pink-500 transition-all duration-200"
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-purple-200 mt-2" data-testid="text-audio-time">
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
            </div>
          )}

          <Card className="bg-slate-800/60 border-slate-700 mb-6">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Badge className="bg-indigo-600 text-white px-3 py-1">
                  {selectedStory.characterType === "sahabi" ? "Saxaabi" : "Taabiciin"}: {selectedStory.characterName} {BLESSING_TEXT}
                </Badge>
              </div>
              <div className={`${isPlaying ? 'hidden' : ''}`}>
                <div className="text-slate-200 leading-relaxed whitespace-pre-wrap mb-4">
                  {selectedStory.content}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Star className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-amber-300 font-medium text-sm mb-1">Casharka Sheekada</h4>
                  <p className="text-slate-200 text-sm">{selectedStory.moralLesson}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 pb-24">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-white hover:bg-white/10"
            data-testid="button-back-archive"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <Moon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Sheekooyinka Habeenkii</h1>
              <p className="text-slate-400 text-sm">Sheekooyin hore oo la kaydiyay</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4 py-2">
            {[0, 1, 2].map((idx) => (
              <Card key={idx} className="bg-slate-800/60 border-slate-700 overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex gap-4 min-h-[96px]">
                    <Skeleton className="w-24 h-24 flex-shrink-0 rounded-none" />
                    <div className="py-3 pr-4 flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stories.length === 0 ? (
          <Card className="bg-slate-800/50 border-dashed border-2 border-slate-600">
            <CardContent className="p-8 text-center">
              <Moon className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">
                Wali sheeko lama kaydin
              </h3>
              <p className="text-slate-500 text-sm">
                Sheekooyin cusub way imanayaan!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div
            ref={listContainerRef}
            className="max-h-[70vh] overflow-y-auto pr-1"
            data-testid="bedtime-stories-virtual-list"
          >
            <div className="relative" style={{ height: `${storyVirtualizer.getTotalSize()}px` }}>
              {storyVirtualizer.getVirtualItems().map((virtualItem) => {
                const story = stories[virtualItem.index];
                return (
                  <div
                    key={story.id}
                    ref={storyVirtualizer.measureElement}
                    data-index={virtualItem.index}
                    className="absolute left-0 top-0 w-full pb-4"
                    style={{ transform: `translateY(${virtualItem.start}px)` }}
                  >
                    <StoryListCard
                      story={story}
                      formatDate={formatDate}
                      onSelectStory={handleSelectStory}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
