import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useParentAuth } from "../contexts/ParentAuthContext";
import {
  ChevronLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Baby,
  BookOpen,
  Volume2,
  Clock,
  Lightbulb,
  ChevronRight,
  RotateCcw,
  RotateCw,
  Pencil,
  Save,
  X,
  Mic,
  Loader2
} from "lucide-react";

function getProxyAudioUrl(audioUrl: string | null): string | null {
  if (!audioUrl) return null;
  const match = audioUrl.match(/[?&]id=([^&]+)/);
  if (match) {
    return `/api/tts-audio/${match[1]}`;
  }
  return audioUrl;
}

interface ParentTip {
  id: string;
  title: string;
  content: string;
  topic: string;
  keyPoints: string | null;
  images: string[];
  audioUrl: string | null;
  tipDate: string;
  stage: string;
}

const DEV_STAGES = [
  { id: "all", label: "Dhammaan", icon: "📚" },
  { id: "newborn-0-3m", label: "Murjux (0-3 bilood)", icon: "👶" },
  { id: "infant-3-6m", label: "Fadhi-barad (3-6 bilood)", icon: "🍼" },
  { id: "infant-6-12m", label: "Gurguurte (6-12 bilood)", icon: "🦶" },
  { id: "toddler-1-2y", label: "Socod barad (1-2 sano)", icon: "🧒" },
  { id: "toddler-2-3y", label: "Inyow (2-3 sano)", icon: "🗣️" },
  { id: "preschool-3-5y", label: "Dareeme (3-5 sano)", icon: "🎨" },
  { id: "school-age-5-7y", label: "Salaad-barad (5-7 sano)", icon: "🎒" },
];

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function ParentTips() {
  const { parent } = useParentAuth();
  const isAdmin = parent?.isAdmin === true;
  const queryClient = useQueryClient();
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedTip, setSelectedTip] = useState<ParentTip | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [activeParagraph, setActiveParagraph] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const paragraphRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editKeyPoints, setEditKeyPoints] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<"muuse" | "ubax">("muuse");

  const editMutation = useMutation({
    mutationFn: async ({ id, title, content, keyPoints }: { id: string; title: string; content: string; keyPoints: string }) => {
      const res = await fetch(`/api/admin/parent-tips/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, keyPoints }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: (updated) => {
      setSelectedTip(updated);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: [`/api/parent-tips?stage=${selectedStage}`] });
    },
  });

  const audioMutation = useMutation({
    mutationFn: async ({ id, voiceName }: { id: string; voiceName: string }) => {
      const res = await fetch(`/api/admin/parent-tips/${id}/audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceName }),
      });
      if (!res.ok) throw new Error("Failed to generate audio");
      return res.json();
    },
    onSuccess: (updated) => {
      setSelectedTip(updated);
      queryClient.invalidateQueries({ queryKey: [`/api/parent-tips?stage=${selectedStage}`] });
    },
  });

  const startEditing = () => {
    if (!selectedTip) return;
    setEditTitle(selectedTip.title);
    setEditContent(selectedTip.content);
    setEditKeyPoints(selectedTip.keyPoints || "");
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!selectedTip) return;
    editMutation.mutate({ id: selectedTip.id, title: editTitle, content: editContent, keyPoints: editKeyPoints });
  };

  const generateAudio = () => {
    if (!selectedTip) return;
    audioRef.current?.pause();
    setIsPlaying(false);
    audioMutation.mutate({ id: selectedTip.id, voiceName: selectedVoice });
  };

  const { data: tips = [], isLoading } = useQuery<ParentTip[]>({
    queryKey: [`/api/parent-tips?stage=${selectedStage}`],
  });

  const paragraphs = useMemo(() => {
    if (!selectedTip) return [];
    return selectedTip.content
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }, [selectedTip?.id]);

  useEffect(() => {
    if (!isPlaying || paragraphs.length === 0 || !audioDuration) return;
    const avgTimePerParagraph = audioDuration / paragraphs.length;
    const currentParagraph = Math.min(
      Math.floor(audioCurrentTime / avgTimePerParagraph),
      paragraphs.length - 1
    );
    if (currentParagraph !== activeParagraph) {
      setActiveParagraph(currentParagraph);
      const ref = paragraphRefs.current[currentParagraph];
      if (ref && contentRef.current) {
        ref.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [audioCurrentTime, audioDuration, paragraphs.length, isPlaying]);

  useEffect(() => {
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setActiveParagraph(0);
    setIsEditing(false);

    if (selectedTip?.audioUrl) {
      const timer = setTimeout(() => {
        const audio = audioRef.current;
        if (audio) {
          audio.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedTip?.id]);

  const toggleAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      setAudioProgress((audio.currentTime / audio.duration) * 100);
      setAudioCurrentTime(audio.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      setAudioDuration(audio.duration);
    }
  }, []);

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioCurrentTime(0);
    setActiveParagraph(0);
    const currentIndex = tips.findIndex(t => t.id === selectedTip?.id);
    if (currentIndex >= 0 && currentIndex < tips.length - 1) {
      setTimeout(() => setSelectedTip(tips[currentIndex + 1]), 1500);
    }
  }, [tips, selectedTip?.id]);

  const seekBackward = useCallback(() => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = Math.max(0, audio.currentTime - 15);
  }, []);

  const seekForward = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.duration) audio.currentTime = Math.min(audio.duration, audio.currentTime + 15);
  }, []);

  const goToPrevTip = useCallback(() => {
    const idx = tips.findIndex(t => t.id === selectedTip?.id);
    if (idx > 0) {
      audioRef.current?.pause();
      setSelectedTip(tips[idx - 1]);
    }
  }, [tips, selectedTip?.id]);

  const goToNextTip = useCallback(() => {
    const idx = tips.findIndex(t => t.id === selectedTip?.id);
    if (idx >= 0 && idx < tips.length - 1) {
      audioRef.current?.pause();
      setSelectedTip(tips[idx + 1]);
    }
  }, [tips, selectedTip?.id]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    audio.currentTime = pct * audio.duration;
  }, []);

  const currentIndex = useMemo(() => {
    if (!selectedTip) return -1;
    return tips.findIndex(t => t.id === selectedTip.id);
  }, [tips, selectedTip?.id]);

  const getStageLabel = (stageId: string) => {
    return DEV_STAGES.find(s => s.id === stageId)?.label || stageId;
  };

  if (selectedTip) {
    const proxyAudioUrl = getProxyAudioUrl(selectedTip.audioUrl);
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-amber-50 pb-48">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 px-4 py-3 safe-top">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button
              onClick={() => { audioRef.current?.pause(); setSelectedTip(null); }}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
              data-testid="button-back-from-tip"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-white truncate">{selectedTip.title}</h1>
              <p className="text-xs text-white/70">{selectedTip.topic} • {currentIndex + 1}/{tips.length}</p>
            </div>
            {isAdmin && !isEditing && (
              <button
                onClick={startEditing}
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
                data-testid="button-edit-tip"
              >
                <Pencil className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200 px-4 py-3">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-1 rounded">ADMIN</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Codka:</span>
                  <button
                    onClick={() => setSelectedVoice("muuse")}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                      selectedVoice === "muuse"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-600 border border-gray-300"
                    }`}
                    data-testid="voice-muuse"
                  >
                    🧔 Muuse (Lab)
                  </button>
                  <button
                    onClick={() => setSelectedVoice("ubax")}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                      selectedVoice === "ubax"
                        ? "bg-pink-600 text-white"
                        : "bg-white text-gray-600 border border-gray-300"
                    }`}
                    data-testid="voice-ubax"
                  >
                    👩 Ubax (Naag)
                  </button>
                </div>
                <button
                  onClick={generateAudio}
                  disabled={audioMutation.isPending}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-all"
                  data-testid="button-generate-audio"
                >
                  {audioMutation.isPending ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Cod la sameynayaa...</>
                  ) : (
                    <><Mic className="w-3 h-3" /> Cod Samee</>
                  )}
                </button>
              </div>
              {audioMutation.isSuccess && (
                <p className="text-xs text-green-700 mt-2">Codka si guul leh ayaa loo sameeyay!</p>
              )}
              {audioMutation.isError && (
                <p className="text-xs text-red-600 mt-2">Codka lama sameyn karin. Isku day mar kale.</p>
              )}
            </div>
          </div>
        )}

        {selectedTip.images.length > 0 && (
          <div className="w-full h-48 overflow-hidden">
            <img
              src={selectedTip.images[0]}
              alt={selectedTip.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="max-w-2xl mx-auto px-4 py-5" ref={contentRef}>
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-medium px-3 py-1 rounded-full">
              <Baby className="w-3 h-3" />
              {getStageLabel(selectedTip.stage)}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(selectedTip.tipDate).toLocaleDateString("so-SO", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>

          {isEditing && isAdmin ? (
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">Cinwaanka</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  data-testid="input-edit-title"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">Qoraalka</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 leading-relaxed"
                  data-testid="input-edit-content"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">Qodobada Muhiimka ah</label>
                <p className="text-[10px] text-gray-400 mb-1">Qodob kasta layn cusub ku qor (Enter riix)</p>
                <textarea
                  value={editKeyPoints}
                  onChange={(e) => setEditKeyPoints(e.target.value)}
                  rows={4}
                  placeholder="Qodobka 1&#10;Qodobka 2&#10;Qodobka 3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 leading-relaxed"
                  data-testid="input-edit-keypoints"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={saveEdit}
                  disabled={editMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-all"
                  data-testid="button-save-edit"
                >
                  {editMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Kaydinayaa...</>
                  ) : (
                    <><Save className="w-4 h-4" /> Kaydi</>
                  )}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-300 transition-all"
                  data-testid="button-cancel-edit"
                >
                  <X className="w-4 h-4" /> Ka noqo
                </button>
              </div>
              {editMutation.isError && (
                <p className="text-xs text-red-600">Wax la kaydin karin. Isku day mar kale.</p>
              )}
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-4 leading-tight">{selectedTip.title}</h2>

              <div className="space-y-3" data-testid="tip-content-paragraphs">
                {paragraphs.map((paragraph, idx) => (
                  <p
                    key={idx}
                    ref={el => { paragraphRefs.current[idx] = el; }}
                    className={`text-[15px] leading-relaxed transition-all duration-500 rounded-lg px-3 py-2 ${
                      isPlaying && idx === activeParagraph
                        ? "bg-orange-100 text-orange-900 font-medium border-l-4 border-orange-500 shadow-sm"
                        : isPlaying && idx < activeParagraph
                        ? "text-gray-400"
                        : "text-gray-700"
                    }`}
                    data-testid={`tip-paragraph-${idx}`}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </>
          )}

          {selectedTip.keyPoints && (
            <div className="mt-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-amber-900 text-sm">Qodobada Muhiimka ah</h3>
              </div>
              <div className="space-y-2">
                {selectedTip.keyPoints.split("\n").filter(Boolean).map((point, idx) => (
                  <p key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {point.replace(/^[-•]\s*/, "")}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {proxyAudioUrl && (
          <>
            <audio
              ref={audioRef}
              src={proxyAudioUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleAudioEnded}
              preload="metadata"
            />
            <div className="fixed bottom-4 left-2 right-2 z-[60]">
              <div className="max-w-2xl mx-auto bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl shadow-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPrevTip}
                    disabled={currentIndex <= 0}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 disabled:opacity-30 active:scale-95"
                    data-testid="button-prev-tip"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={toggleAudio}
                    className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center active:scale-95 transition-all flex-shrink-0"
                    data-testid="button-play-pause"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white font-medium truncate">{selectedTip.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-white/70">{formatTime(audioCurrentTime)}</span>
                      <div
                        className="flex-1 h-1 bg-white/20 rounded-full cursor-pointer"
                        onClick={handleProgressClick}
                        data-testid="audio-progress-bar"
                      >
                        <div
                          className="h-full bg-white rounded-full transition-all duration-200"
                          style={{ width: `${audioProgress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-white/70">{formatTime(audioDuration)}</span>
                    </div>
                  </div>
                  <button
                    onClick={goToNextTip}
                    disabled={currentIndex >= tips.length - 1}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 disabled:opacity-30 active:scale-95"
                    data-testid="button-next-tip"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-amber-50 pb-24">
      <div className="sticky top-0 z-10 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 px-4 py-3 safe-top">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/learning-hub">
            <button className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center" data-testid="button-back">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">Horumarka Da'da Ilmaha</h1>
            <p className="text-xs text-white/70">Talooyinka Barbaarintasan Akademi</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Lightbulb className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Maraaxisha Da'da Ilmaha</h2>
          <p className="text-gray-500 text-sm mt-1">Dooro marxaladda ilmahaaga si aad u hesho talooyin cilmi ku salaysan</p>
        </div>

        <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide mb-5">
          <div className="flex gap-2 min-w-max">
            {DEV_STAGES.map(stage => (
              <button
                key={stage.id}
                onClick={() => setSelectedStage(stage.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 ${
                  selectedStage === stage.id
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-orange-300"
                }`}
                data-testid={`stage-tab-${stage.id}`}
              >
                <span>{stage.icon}</span>
                {stage.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-orange-100 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-20 h-20 bg-gray-200 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : tips.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-7 h-7 text-orange-400" />
            </div>
            <p className="text-gray-500 text-sm">Wali ma jiraan talooyin marxaladdan ah</p>
            <p className="text-gray-400 text-xs mt-1">Talooyin cusub ayaa maalin walba la soo geliyaa</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="tips-list">
            {tips.map((tip) => (
              <button
                key={tip.id}
                onClick={() => setSelectedTip(tip)}
                className="w-full text-left bg-white rounded-2xl border border-orange-100 shadow-sm p-4 flex items-center gap-3 active:scale-[0.98] transition-all hover:shadow-md hover:border-orange-200"
                data-testid={`tip-card-${tip.id}`}
              >
                {tip.images.length > 0 ? (
                  <img
                    src={tip.images[0]}
                    alt={tip.title}
                    className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-300 to-amber-400 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-8 h-8 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">{tip.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{tip.topic}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {tip.audioUrl && (
                      <span className="flex items-center gap-1 text-xs text-orange-600">
                        <Volume2 className="w-3 h-3" />
                        Dhagayso
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {new Date(tip.tipDate).toLocaleDateString("so-SO", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
