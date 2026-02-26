import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Plus,
  Users,
  Heart,
  MessageCircle,
  Send,
  Trash2,
  Crown,
  UserPlus,
  UserMinus,
  Loader2,
  BookOpen,
  Mic,
  Square,
  Play,
  Pause,
  X,
  Lock,
  Award,
  Flame,
  GraduationCap,
  Trophy,
  Star,
  Mail,
  UserCheck,
  ChevronRight,
  Check,
  CheckCheck,
  SmilePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface GroupCreator {
  id: string;
  name: string | null;
  picture: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  courseIds: string[];
  createdBy: string;
  isPublic: boolean;
  maxMembers: number | null;
  memberCount: number;
  createdAt: string;
  isMember: boolean;
  myRole: string | null;
  creator: GroupCreator | null;
  contentType: string | null;
  contentId: string | null;
  hasAccess: boolean;
}

interface MyGroup {
  id: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  courseIds: string[];
  memberCount: number;
  createdBy: string;
  createdAt: string;
  role: string;
}

interface GroupMember {
  id: string;
  name: string | null;
  picture: string | null;
  role: string;
  joinedAt: string;
}

interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  courseIds: string[];
  createdBy: string;
  isPublic: boolean;
  maxMembers: number | null;
  memberCount: number;
  createdAt: string;
  isMember: boolean;
  myRole: string | null;
  members: GroupMember[];
  creator: GroupCreator | null;
  courses: { id: string; title: string; courseId: string; imageUrl: string | null }[];
  contentType: string | null;
  contentId: string | null;
}

interface PostAuthor {
  id: string;
  name: string | null;
  picture: string | null;
}

interface GroupPost {
  id: string;
  groupId: string;
  userId: string;
  title: string | null;
  content: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  isLiked: boolean;
  reactions: { emoji: string; count: number }[];
  myReactions: string[];
  author: PostAuthor;
}

interface PostComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  author: PostAuthor;
}

interface MemberProgress {
  userId: string;
  name: string | null;
  picture: string | null;
  contentType?: string | null;
  courses: {
    courseId?: string;
    completedLessons?: number;
    totalLessons?: number;
    contentType?: string;
    readCount?: number;
    totalCount?: number;
    percent: number;
  }[];
}

function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/wav",
  ];
  for (const type of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supportedMime = getSupportedMimeType();
      const options: MediaRecorderOptions = supportedMime ? { mimeType: supportedMime } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const actualMime = mediaRecorder.mimeType || supportedMime || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: actualMime });
        setAudioBlob(blob);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch {
      toast.error("Codka lama heli karo. Fadlan ogolow microphone-ka.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }, []);

  const clearRecording = useCallback(() => {
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setRecordingDuration(0);
  }, [audioPreviewUrl]);

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    };
  }, [audioPreviewUrl]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return { isRecording, recordingDuration, audioBlob, audioPreviewUrl, startRecording, stopRecording, clearRecording, formatDuration };
}

function RadioWavePlayer({ url, title, authorName }: { url: string; title?: string | null; authorName?: string | null }) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const barCount = 40;
    const barWidth = Math.max(2, (w / barCount) * 0.55);
    const gap = (w - barCount * barWidth) / (barCount - 1);
    const time = Date.now() / 1000;
    const progress = duration > 0 ? currentTime / duration : 0;

    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + gap);
      const posRatio = i / barCount;

      let amplitude: number;
      if (playing) {
        const wave1 = Math.sin(time * 3.5 + i * 0.4) * 0.4;
        const wave2 = Math.sin(time * 2.1 + i * 0.7) * 0.25;
        const wave3 = Math.cos(time * 4.8 + i * 0.3) * 0.15;
        amplitude = 0.25 + Math.abs(wave1 + wave2 + wave3);
      } else {
        amplitude = 0.12 + Math.sin(i * 0.5) * 0.06 + Math.cos(i * 0.3) * 0.04;
      }

      const barHeight = Math.max(3, amplitude * h * 0.85);
      const y = (h - barHeight) / 2;

      const isPast = posRatio <= progress;
      if (isPast) {
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, '#34d399');
        gradient.addColorStop(0.5, '#10b981');
        gradient.addColorStop(1, '#059669');
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = playing ? 'rgba(148, 163, 184, 0.35)' : 'rgba(148, 163, 184, 0.2)';
      }

      ctx.beginPath();
      const r = barWidth / 2;
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, barHeight, r);
      } else {
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + barWidth, y, x + barWidth, y + barHeight, r);
        ctx.arcTo(x + barWidth, y + barHeight, x, y + barHeight, r);
        ctx.arcTo(x, y + barHeight, x, y, r);
        ctx.arcTo(x, y, x + barWidth, y, r);
        ctx.closePath();
      }
      ctx.fill();
    }

    if (playing) {
      animFrameRef.current = requestAnimationFrame(drawWaveform);
    }
  }, [playing, currentTime, duration]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  useEffect(() => {
    if (playing) {
      animFrameRef.current = requestAnimationFrame(drawWaveform);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [playing, drawWaveform]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const initAudio = () => {
    if (!audioRef.current) {
      const audio = new Audio(url);
      audio.onloadedmetadata = () => setDuration(audio.duration);
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onended = () => { setPlaying(false); setCurrentTime(0); };
      audioRef.current = audio;
    }
  };

  const toggle = () => {
    initAudio();
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else {
      audioRef.current?.play().catch(() => {});
      setPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioRef.current || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    audioRef.current.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  };

  return (
    <div className="mt-3 rounded-2xl overflow-hidden" data-testid="radio-wave-player">
      <div className="bg-blue-50 p-4 border border-blue-200 rounded-2xl">
        {title && (
          <p className="text-gray-800 font-semibold text-sm mb-1 truncate">{title}</p>
        )}
        {authorName && !title && (
          <p className="text-gray-500 text-xs mb-2">{authorName}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
              playing
                ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/30'
                : 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 shadow-blue-500/20'
            }`}
            data-testid="button-play-audio"
          >
            {playing ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <canvas
              ref={canvasRef}
              width={300}
              height={40}
              className="w-full h-10 cursor-pointer"
              onClick={handleSeek}
              data-testid="audio-waveform"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-1.5 px-1">
          <span className="text-gray-500 text-[10px] font-mono">{formatTime(currentTime)}</span>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${playing ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-gray-500 text-[10px]">{playing ? 'LIVE' : 'READY'}</span>
          </div>
          <span className="text-gray-500 text-[10px] font-mono">{duration > 0 ? formatTime(duration) : '--:--'}</span>
        </div>
      </div>
    </div>
  );
}

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerPicture: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface DirectMsg {
  id: string;
  senderId: string;
  receiverId: string;
  body: string;
  audioUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

function MemberProfileDialog({
  member,
  open,
  onOpenChange,
  currentUserId,
  onOpenChat,
}: {
  member: { id: string; name: string | null; picture: string | null } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onOpenChat: (partnerId: string) => void;
}) {
  const queryClient = useQueryClient();

  const { data: followStatus } = useQuery<{ isFollowing: boolean; isFollowedBy: boolean }>({
    queryKey: ["follow-status", member?.id],
    queryFn: async () => {
      const res = await fetch(`/api/parents/${member!.id}/follow-status`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: open && !!member && member.id !== currentUserId,
  });

  const { data: followCounts } = useQuery<{ followersCount: number; followingCount: number }>({
    queryKey: ["follow-counts", member?.id],
    queryFn: async () => {
      const res = await fetch(`/api/parents/${member!.id}/follow-counts`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: open && !!member,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/parents/${member!.id}/follow`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-status", member?.id] });
      queryClient.invalidateQueries({ queryKey: ["follow-counts", member?.id] });
      toast.success("Waxaad follow-gareysay!");
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/parents/${member!.id}/follow`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-status", member?.id] });
      queryClient.invalidateQueries({ queryKey: ["follow-counts", member?.id] });
      toast.success("Waxaad unfollow-gareysay");
    },
  });

  if (!member) return null;

  const isSelf = member.id === currentUserId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 max-w-sm">
        <DialogHeader>
          <DialogTitle className="sr-only">Profile</DialogTitle>
          <DialogDescription className="sr-only">Xubin profile</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center pt-2 pb-4">
          <Avatar className="w-20 h-20 border-2 border-blue-500 mb-3">
            <AvatarImage src={member.picture || undefined} />
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xl">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>
          <h3 className="text-lg font-bold text-gray-900 mb-1">{member.name || "Aan la aqoon"}</h3>

          <div className="flex items-center gap-6 mb-4">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{followCounts?.followersCount ?? 0}</p>
              <p className="text-gray-500 text-xs">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{followCounts?.followingCount ?? 0}</p>
              <p className="text-gray-500 text-xs">Following</p>
            </div>
          </div>

          {followStatus?.isFollowedBy && !isSelf && (
            <p className="text-gray-500 text-xs mb-3 flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              Wuu ku follow-gareeysanayaa
            </p>
          )}

          {!isSelf && (
            <div className="flex items-center gap-3 w-full">
              <Button
                className={`flex-1 ${
                  followStatus?.isFollowing
                    ? "bg-gray-200 hover:bg-gray-300 text-gray-600"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
                onClick={() => {
                  if (followStatus?.isFollowing) {
                    unfollowMutation.mutate();
                  } else {
                    followMutation.mutate();
                  }
                }}
                disabled={followMutation.isPending || unfollowMutation.isPending}
                data-testid={`button-follow-${member.id}`}
              >
                {followMutation.isPending || unfollowMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : followStatus?.isFollowing ? (
                  <UserCheck className="w-4 h-4 mr-1" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-1" />
                )}
                {followStatus?.isFollowing ? "Following" : "Follow"}
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  onOpenChange(false);
                  onOpenChat(member.id);
                }}
                data-testid={`button-dm-${member.id}`}
              >
                <Mail className="w-4 h-4 mr-1" />
                Fariin dir
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChatView({
  partnerId,
  partnerName,
  partnerPicture,
  onBack,
  currentUserId,
}: {
  partnerId: string;
  partnerName: string;
  partnerPicture: string | null;
  onBack: () => void;
  currentUserId: string;
}) {
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const [isSendingVoice, setIsSendingVoice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dmRecorder = useAudioRecorder();

  const { data: messages, isLoading } = useQuery<DirectMsg[]>({
    queryKey: ["dm-messages", partnerId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/${partnerId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 15000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch(`/api/messages/${partnerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["dm-messages", partnerId] });
      queryClient.invalidateQueries({ queryKey: ["dm-conversations"] });
    },
  });

  const sendVoiceDm = async () => {
    if (!dmRecorder.audioBlob) return;
    setIsSendingVoice(true);
    try {
      const formData = new FormData();
      const ext = dmRecorder.audioBlob.type.includes("mp3") || dmRecorder.audioBlob.type.includes("mpeg") ? "mp3" : "webm";
      formData.append("audio", dmRecorder.audioBlob, `voice.${ext}`);
      if (messageText.trim()) formData.append("body", messageText.trim());
      const res = await fetch(`/api/messages/${partnerId}/voice`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed");
      dmRecorder.clearRecording();
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["dm-messages", partnerId] });
      queryClient.invalidateQueries({ queryKey: ["dm-conversations"] });
    } catch (err) {
      toast.error("Cod-ka lama dirin");
    } finally {
      setIsSendingVoice(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-700 hover:bg-gray-100"
          onClick={onBack}
          data-testid="button-back-from-chat"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Avatar className="w-8 h-8 border border-gray-200">
          <AvatarImage src={partnerPicture || undefined} />
          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
            {getInitials(partnerName)}
          </AvatarFallback>
        </Avatar>
        <span className="text-gray-900 font-semibold text-sm truncate">{partnerName || "Aan la aqoon"}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ maxHeight: "calc(100vh - 320px)" }}>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : messages && messages.length > 0 ? (
          messages.map((msg) => {
            const isMine = msg.senderId === currentUserId;
            let timeAgo = "";
            try {
              timeAgo = formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true });
            } catch {}
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`} data-testid={`msg-${msg.id}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl ${
                    isMine
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-700 rounded-bl-sm"
                  }`}
                >
                  {msg.audioUrl && (
                    <div className="mb-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Mic className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[11px] text-blue-500 font-medium">Fariin cod ah</span>
                      </div>
                      <audio src={msg.audioUrl} controls controlsList="nodownload" className="w-full" style={{ maxWidth: '100%', height: '36px', minHeight: '36px', filter: 'invert(1) hue-rotate(180deg)', opacity: 0.9, borderRadius: '8px' }} />
                    </div>
                  )}
                  {msg.body && msg.body !== "🎤 Fariin cod ah" && (
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                  )}
                  <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                    <span className="text-[10px] opacity-60">{timeAgo}</span>
                    {isMine && (
                      msg.isRead ? (
                        <CheckCheck className="w-3 h-3 text-blue-500" />
                      ) : (
                        <Check className="w-3 h-3 opacity-50" />
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <Mail className="w-10 h-10 text-blue-500 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Billow sheekada!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-gray-200 bg-white">
        {dmRecorder.isRecording && (
          <div className="flex items-center gap-3 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
            <div className="relative">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            </div>
            <span className="text-red-600 text-sm flex-1">Duubayo... {dmRecorder.formatDuration(dmRecorder.recordingDuration)}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-100 rounded-full"
              onClick={dmRecorder.stopRecording}
              data-testid="button-dm-stop-recording"
            >
              <Square className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {dmRecorder.audioPreviewUrl && !dmRecorder.isRecording && (
          <div className="mb-2 bg-blue-50 border border-blue-200 rounded-xl p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-blue-600 text-xs font-medium flex items-center gap-1">
                <Mic className="w-3 h-3" /> Cod duuban
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 text-gray-400 hover:text-red-400 rounded-full"
                onClick={dmRecorder.clearRecording}
                data-testid="button-dm-clear-recording"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <audio src={dmRecorder.audioPreviewUrl} controls className="w-full h-8" style={{ maxWidth: '100%' }} />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={dmRecorder.audioPreviewUrl ? "Faahfaahin ku dar (ikhtiyaari)..." : "Fariin qor..."}
            className="bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (dmRecorder.audioPreviewUrl) {
                  sendVoiceDm();
                } else if (messageText.trim()) {
                  sendMutation.mutate(messageText.trim());
                }
              }
            }}
            data-testid="input-dm-message"
          />
          <Button
            size="icon"
            variant="ghost"
            className={`h-9 w-9 shrink-0 rounded-full ${dmRecorder.isRecording ? 'text-red-500 bg-red-50' : dmRecorder.audioPreviewUrl ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-600 hover:bg-gray-100'}`}
            onClick={dmRecorder.isRecording ? dmRecorder.stopRecording : dmRecorder.startRecording}
            disabled={isSendingVoice || (!!dmRecorder.audioPreviewUrl && !dmRecorder.isRecording)}
            data-testid="button-dm-record"
          >
            <Mic className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            className="bg-blue-600 hover:bg-blue-700 text-white h-9 w-9 shrink-0"
            onClick={() => {
              if (dmRecorder.audioPreviewUrl) {
                sendVoiceDm();
              } else if (messageText.trim()) {
                sendMutation.mutate(messageText.trim());
              }
            }}
            disabled={(!messageText.trim() && !dmRecorder.audioPreviewUrl) || sendMutation.isPending || isSendingVoice}
            data-testid="button-send-dm"
          >
            {sendMutation.isPending || isSendingVoice ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessagesView({
  currentUserId,
  groupMembers,
  initialChatPartner,
  onClearInitialPartner,
}: {
  currentUserId: string;
  groupMembers: GroupMember[];
  initialChatPartner?: { id: string; name: string; picture: string | null } | null;
  onClearInitialPartner?: () => void;
}) {
  const [chatPartner, setChatPartner] = useState<{ id: string; name: string; picture: string | null } | null>(initialChatPartner || null);

  useEffect(() => {
    if (initialChatPartner) {
      setChatPartner(initialChatPartner);
    }
  }, [initialChatPartner]);

  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ["dm-conversations"],
    queryFn: async () => {
      const res = await fetch("/api/messages/conversations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30000,
  });

  if (chatPartner) {
    return (
      <ChatView
        partnerId={chatPartner.id}
        partnerName={chatPartner.name}
        partnerPicture={chatPartner.picture}
        onBack={() => { setChatPartner(null); onClearInitialPartner?.(); }}
        currentUserId={currentUserId}
      />
    );
  }

  const memberConvos = conversations?.filter(c =>
    groupMembers.some(m => m.id === c.partnerId)
  ) || [];

  const otherMembers = groupMembers.filter(
    m => m.id !== currentUserId && !memberConvos.some(c => c.partnerId === m.id)
  );

  return (
    <div className="space-y-3">
      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="bg-white border-gray-200">
            <CardContent className="p-3 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full bg-gray-200" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 bg-gray-200 mb-1" />
                <Skeleton className="h-3 w-40 bg-gray-200" />
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <>
          {memberConvos.length > 0 && (
            <>
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider px-1">Fariimaha</p>
              {memberConvos.map((convo) => {
                let timeAgo = "";
                try {
                  timeAgo = formatDistanceToNow(new Date(convo.lastMessageAt), { addSuffix: true });
                } catch {}
                return (
                  <Card
                    key={convo.partnerId}
                    className="bg-white border-gray-200 cursor-pointer hover:border-blue-300 transition-colors"
                    onClick={() => setChatPartner({
                      id: convo.partnerId,
                      name: convo.partnerName,
                      picture: convo.partnerPicture,
                    })}
                    data-testid={`convo-${convo.partnerId}`}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="w-10 h-10 border border-gray-200">
                          <AvatarImage src={convo.partnerPicture || undefined} />
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                            {getInitials(convo.partnerName)}
                          </AvatarFallback>
                        </Avatar>
                        {convo.unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {convo.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-semibold truncate ${convo.unreadCount > 0 ? 'text-gray-900' : 'text-gray-600'}`}>
                            {convo.partnerName}
                          </span>
                          <span className="text-blue-500 text-[10px] shrink-0 ml-2">{timeAgo}</span>
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${convo.unreadCount > 0 ? 'text-gray-600 font-medium' : 'text-gray-500'}`}>
                          {convo.lastMessage}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-blue-600 shrink-0" />
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}

          {otherMembers.length > 0 && (
            <>
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider px-1 mt-4">Xubnaha kale</p>
              {otherMembers.map((m) => (
                <Card
                  key={m.id}
                  className="bg-white border-gray-200 cursor-pointer hover:border-blue-300 transition-colors"
                  onClick={() => setChatPartner({
                    id: m.id,
                    name: m.name || "Aan la aqoon",
                    picture: m.picture,
                  })}
                  data-testid={`dm-member-${m.id}`}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-gray-200">
                      <AvatarImage src={m.picture || undefined} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                        {getInitials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-600 text-sm font-semibold truncate block">
                        {m.name || "Aan la aqoon"}
                      </span>
                      <span className="text-blue-500 text-xs">Fariin dir</span>
                    </div>
                    <Mail className="w-4 h-4 text-blue-500" />
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          {memberConvos.length === 0 && otherMembers.length === 0 && (
            <div className="text-center py-12">
              <Mail className="w-10 h-10 text-blue-500 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Wali fariin la ma dirin</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GroupsListView({
  onSelectGroup,
}: {
  onSelectGroup: (id: string) => void;
}) {
  const { parent } = useParentAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"all" | "my">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(true);

  const { data: allGroups, isLoading: loadingAll } = useQuery<Group[]>({
    queryKey: ["groups", "all"],
    queryFn: async () => {
      const res = await fetch("/api/groups", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch groups");
      return res.json();
    },
    enabled: !!parent,
  });

  const { data: myGroups, isLoading: loadingMy } = useQuery<MyGroup[]>({
    queryKey: ["groups", "my"],
    queryFn: async () => {
      const res = await fetch("/api/groups/my", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch my groups");
      return res.json();
    },
    enabled: !!parent,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newName,
          description: newDescription,
          isPublic: newIsPublic,
          courseIds: [],
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create group");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      setNewIsPublic(true);
      toast.success("Guruubka si guul leh ayaa loo sameeyay!");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to join");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Guruubka waad ku biirtay!");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const res = await fetch(`/api/groups/${groupId}/leave`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to leave");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Guruubka waad ka baxday");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const isLoading = tab === "all" ? loadingAll : loadingMy;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-700 hover:bg-gray-100"
              onClick={() => navigate("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-gray-900">
              Guruubada Waxbarashada
            </h1>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button
                size="icon"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full"
                data-testid="button-create-group"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-200 max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-gray-900">Guruub Cusub Samee</DialogTitle>
                <DialogDescription className="text-gray-500">
                  Samee guruub waxbarasho oo aad la wadaagto dadka kale
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">
                    Magaca Guruubka
                  </label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Tusaale: Waalidiinta Cusub"
                    className="border-gray-300 text-gray-800 placeholder:text-gray-400"
                    data-testid="input-group-name"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">
                    Sharaxaad
                  </label>
                  <Textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Guruubka maxuu ku saabsan yahay?"
                    className="border-gray-300 text-gray-800 placeholder:text-gray-400 min-h-[80px]"
                    data-testid="input-group-description"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Guruub Waalidiinta
                  </span>
                  <button
                    type="button"
                    onClick={() => setNewIsPublic(!newIsPublic)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      newIsPublic ? "bg-blue-600" : "bg-gray-300"
                    }`}
                    data-testid="toggle-public"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        newIsPublic ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => createMutation.mutate()}
                  disabled={!newName.trim() || createMutation.isPending}
                  data-testid="button-submit-group"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Samee
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex px-4 pb-3 gap-2">
          <Button
            variant={tab === "all" ? "default" : "ghost"}
            size="sm"
            className={
              tab === "all"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }
            onClick={() => setTab("all")}
            data-testid="tab-all-groups"
          >
            Dhammaan
          </Button>
          <Button
            variant={tab === "my" ? "default" : "ghost"}
            size="sm"
            className={
              tab === "my"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }
            onClick={() => setTab("my")}
            data-testid="tab-my-groups"
          >
            Kuwaygeyga
          </Button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 pb-24">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card
              key={i}
              className="bg-white border-gray-200"
            >
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))
        ) : tab === "all" ? (
          allGroups && allGroups.length > 0 ? (
            allGroups.map((group) => (
              <div key={group.id}>
                <Card
                  className={`bg-white border-gray-200 transition-colors ${
                    !group.hasAccess && !group.isMember ? 'opacity-70 cursor-default' : 'cursor-pointer hover:border-blue-300 hover:shadow-sm'
                  }`}
                  onClick={() => {
                    if (!group.hasAccess && !group.isMember) {
                      toast.error("Dadka koorsada qaata ayaa geli kara guruubkan. Fadlan koorsada iibasdo.");
                      return;
                    }
                    onSelectGroup(group.id);
                  }}
                  data-testid={`card-group-${group.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-base truncate">
                          {group.name}
                        </h3>
                        {group.description && (
                          <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                            {group.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3 text-gray-500 text-xs">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {group.memberCount}
                        </span>
                        {group.creator?.name && (
                          <span className="truncate max-w-[120px]">
                            {group.creator.name}
                          </span>
                        )}
                      </div>
                      {group.isMember ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs h-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            leaveMutation.mutate(group.id);
                          }}
                          disabled={leaveMutation.isPending}
                          data-testid={`button-leave-${group.id}`}
                        >
                          <UserMinus className="w-3.5 h-3.5 mr-1" />
                          Ka bax
                        </Button>
                      ) : !group.hasAccess ? (
                        <div className="flex items-center gap-1 text-amber-500 text-xs">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Xiran</span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            joinMutation.mutate(group.id);
                          }}
                          disabled={joinMutation.isPending}
                          data-testid={`button-join-${group.id}`}
                        >
                          <UserPlus className="w-3.5 h-3.5 mr-1" />
                          Ku biir
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-blue-400 mx-auto mb-3" />
              <p className="text-gray-500">
                Wali guruub la ma samayn. Noqo kii ugu horreeya!
              </p>
            </div>
          )
        ) : myGroups && myGroups.length > 0 ? (
          myGroups.map((group) => (
            <div key={group.id}>
              <Card
                className="bg-white border-gray-200 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-colors"
                onClick={() => onSelectGroup(group.id)}
                data-testid={`card-group-${group.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-base truncate">
                          {group.name}
                        </h3>
                        {group.role === "admin" && (
                          <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-[10px]">
                            <Crown className="w-3 h-3 mr-0.5" />
                            Admin
                          </Badge>
                        )}
                      </div>
                      {group.description && (
                        <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                          {group.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-gray-500 text-xs mt-2">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {group.memberCount}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        ) : (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <p className="text-gray-500">
              Wali guruub kuma jirtid. Ku biir mid ama samee mid cusub!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const GROUP_EMOJIS = ["❤️", "👍", "😂", "🤲", "👏", "💡", "🔥", "💪"];

function PostItem({
  post,
  currentUserId,
  groupId,
  onMemberClick,
}: {
  post: GroupPost;
  currentUserId: string;
  groupId: string;
  onMemberClick?: (member: { id: string; name: string | null; picture: string | null }) => void;
}) {
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [optimisticReactions, setOptimisticReactions] = useState<{ emoji: string; count: number }[]>(post.reactions || []);
  const [optimisticMyReactions, setOptimisticMyReactions] = useState<string[]>(post.myReactions || []);

  useEffect(() => {
    setOptimisticReactions(post.reactions || []);
    setOptimisticMyReactions(post.myReactions || []);
  }, [post.reactions, post.myReactions]);

  const { data: comments, isLoading: loadingComments } = useQuery<PostComment[]>({
    queryKey: ["group-comments", post.id],
    queryFn: async () => {
      const res = await fetch(`/api/groups/posts/${post.id}/comments`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: showComments,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/groups/posts/${post.id}/like`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-posts", groupId] });
    },
  });

  const reactionMutation = useMutation({
    mutationFn: async (emoji: string) => {
      const res = await fetch(`/api/groups/posts/${post.id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onMutate: async (emoji: string) => {
      const isAlreadyReacted = optimisticMyReactions.includes(emoji);
      if (isAlreadyReacted) {
        setOptimisticMyReactions(prev => prev.filter(e => e !== emoji));
        setOptimisticReactions(prev => {
          const existing = prev.find(r => r.emoji === emoji);
          if (existing && existing.count > 1) {
            return prev.map(r => r.emoji === emoji ? { ...r, count: r.count - 1 } : r);
          }
          return prev.filter(r => r.emoji !== emoji);
        });
      } else {
        setOptimisticMyReactions(prev => [...prev, emoji]);
        setOptimisticReactions(prev => {
          const existing = prev.find(r => r.emoji === emoji);
          if (existing) {
            return prev.map(r => r.emoji === emoji ? { ...r, count: r.count + 1 } : r);
          }
          return [...prev, { emoji, count: 1 }];
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["group-posts", groupId] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/groups/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: commentText }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["group-comments", post.id] });
      queryClient.invalidateQueries({ queryKey: ["group-posts", groupId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/groups/posts/${post.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-posts", groupId] });
      toast.success("Post-ka waa la tirtiray");
    },
  });

  let timeAgo = "";
  try {
    timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  } catch {
    timeAgo = "";
  }

  return (
    <Card
      className="bg-white border-gray-200"
      data-testid={`card-post-${post.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar
            className="w-9 h-9 border border-gray-200 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
            onClick={() => onMemberClick?.({ id: post.userId, name: post.author.name, picture: post.author.picture })}
          >
            <AvatarImage src={post.author.picture || undefined} />
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
              {getInitials(post.author.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <button
                  className="text-gray-900 text-sm font-semibold hover:text-gray-600 transition-colors text-left"
                  onClick={() => onMemberClick?.({ id: post.userId, name: post.author.name, picture: post.author.picture })}
                  data-testid={`button-author-${post.userId}`}
                >
                  {post.author.name || "Aan la aqoon"}
                </button>
                <span className="text-gray-500 text-xs ml-2">{timeAgo}</span>
              </div>
              {post.userId === currentUserId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-500 hover:text-red-400 hover:bg-red-50 h-7 w-7"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-post-${post.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            {post.audioUrl ? (
              <>
                {post.content && !post.title && (
                  <p className="text-gray-600 text-sm mt-1 whitespace-pre-wrap">
                    {post.content}
                  </p>
                )}
                <RadioWavePlayer
                  url={post.audioUrl}
                  title={post.title}
                  authorName={post.author.name}
                />
                {post.title && post.content && (
                  <p className="text-gray-500/80 text-xs mt-2 whitespace-pre-wrap leading-relaxed">
                    {post.content}
                  </p>
                )}
              </>
            ) : (
              <>
                {post.content && (
                  <p className="text-gray-600 text-sm mt-1 whitespace-pre-wrap">
                    {post.content}
                  </p>
                )}
                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt=""
                    className="mt-2 rounded-lg max-h-60 object-cover w-full"
                  />
                )}
              </>
            )}
            {optimisticReactions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {optimisticReactions.map((r) => (
                  <button
                    key={r.emoji}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
                      optimisticMyReactions.includes(r.emoji)
                        ? "bg-blue-600/50 border border-blue-400 text-white"
                        : "bg-gray-100 border border-gray-200/40 text-gray-500 hover:bg-gray-200"
                    }`}
                    onClick={() => reactionMutation.mutate(r.emoji)}
                    data-testid={`reaction-${r.emoji}-${post.id}`}
                  >
                    <span>{r.emoji}</span>
                    <span className="font-medium">{r.count}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3 mt-2 relative">
              <button
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  post.isLiked
                    ? "text-red-400"
                    : "text-gray-500 hover:text-red-400"
                }`}
                onClick={() => likeMutation.mutate()}
                disabled={likeMutation.isPending}
                data-testid={`button-like-post-${post.id}`}
              >
                <Heart
                  className={`w-4 h-4 ${post.isLiked ? "fill-current" : ""}`}
                />
                {post.likeCount > 0 && post.likeCount}
              </button>
              <button
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-600 transition-colors"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                data-testid={`button-emoji-picker-${post.id}`}
              >
                <SmilePlus className="w-4 h-4" />
              </button>
              <button
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-600 transition-colors"
                onClick={() => setShowComments(!showComments)}
                data-testid={`button-comments-post-${post.id}`}
              >
                <MessageCircle className="w-4 h-4" />
                {post.commentCount > 0 && post.commentCount}
              </button>
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 5 }}
                    className="absolute bottom-8 left-0 bg-white border border-gray-200 rounded-xl p-2 shadow-xl z-10 flex gap-1"
                  >
                    {GROUP_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        className={`text-lg p-1 rounded-lg transition-all hover:bg-gray-200 ${
                          optimisticMyReactions.includes(emoji) ? "bg-blue-600/50 ring-1 ring-blue-400" : ""
                        }`}
                        onClick={() => {
                          reactionMutation.mutate(emoji);
                          setShowEmojiPicker(false);
                        }}
                        data-testid={`emoji-pick-${emoji}-${post.id}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                {loadingComments ? (
                  <div className="flex justify-center py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  </div>
                ) : (
                  comments?.map((comment) => {
                    let commentTime = "";
                    try {
                      commentTime = formatDistanceToNow(new Date(comment.createdAt), {
                        addSuffix: true,
                      });
                    } catch {
                      commentTime = "";
                    }
                    return (
                      <div
                        key={comment.id}
                        className="flex items-start gap-2"
                        data-testid={`card-comment-${comment.id}`}
                      >
                        <Avatar className="w-6 h-6 border border-gray-200">
                          <AvatarImage
                            src={comment.author.picture || undefined}
                          />
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-[10px]">
                            {getInitials(comment.author.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-900 text-xs font-semibold">
                              {comment.author.name || "Aan la aqoon"}
                            </span>
                            <span className="text-blue-500 text-[10px]">
                              {commentTime}
                            </span>
                          </div>
                          <p className="text-gray-600 text-xs mt-0.5">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div className="flex items-center gap-2">
                  <Input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Faallo dhig..."
                    className="bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 text-sm h-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && commentText.trim()) {
                        commentMutation.mutate();
                      }
                    }}
                    data-testid={`input-comment-${post.id}`}
                  />
                  <Button
                    size="icon"
                    className="bg-blue-600 hover:bg-blue-700 text-white h-9 w-9 shrink-0"
                    onClick={() => commentMutation.mutate()}
                    disabled={!commentText.trim() || commentMutation.isPending}
                    data-testid={`button-send-comment-${post.id}`}
                  >
                    {commentMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

function GroupDashboard({
  groupId,
  onBack,
}: {
  groupId: string;
  onBack: () => void;
}) {
  const { parent } = useParentAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("posts");
  const [postContent, setPostContent] = useState("");
  const [audioTitle, setAudioTitle] = useState("");
  const recorder = useAudioRecorder();
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [allPosts, setAllPosts] = useState<GroupPost[]>([]);
  const [postsOffset, setPostsOffset] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const POSTS_PER_PAGE = 5;

  const [profileMember, setProfileMember] = useState<{ id: string; name: string | null; picture: string | null } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dmChatPartner, setDmChatPartner] = useState<{ id: string; name: string; picture: string | null } | null>(null);

  const handleMemberClick = (member: { id: string; name: string | null; picture: string | null }) => {
    if (member.id === parent?.id) return;
    setProfileMember(member);
    setProfileOpen(true);
  };

  const handleOpenChat = (partnerId: string) => {
    const member = group?.members.find(m => m.id === partnerId);
    if (member) {
      setDmChatPartner({ id: member.id, name: member.name || "Aan la aqoon", picture: member.picture });
      setActiveTab("messages");
    }
  };

  useEffect(() => {
    setAllPosts([]);
    setPostsOffset(0);
    setHasMorePosts(false);
    setTotalPosts(0);
  }, [groupId]);

  const { data: group, isLoading: loadingGroup } = useQuery<GroupDetail>({
    queryKey: ["group-detail", groupId],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${groupId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch group");
      return res.json();
    },
    enabled: !!parent,
  });

  const { data: postsData, isLoading: loadingPosts } = useQuery<{ posts: GroupPost[]; total: number; hasMore: boolean }>({
    queryKey: ["group-posts", groupId],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/posts?limit=${POSTS_PER_PAGE}&offset=0`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    },
    enabled: !!parent && !!group?.isMember,
  });

  useEffect(() => {
    if (postsData) {
      setAllPosts(postsData.posts);
      setPostsOffset(postsData.posts.length);
      setHasMorePosts(postsData.hasMore);
      setTotalPosts(postsData.total);
    }
  }, [postsData]);

  const loadMorePosts = useCallback(async () => {
    if (loadingMorePosts || !hasMorePosts) return;
    setLoadingMorePosts(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/posts?limit=${POSTS_PER_PAGE}&offset=${postsOffset}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch posts");
      const data = await res.json();
      setAllPosts(prev => [...prev, ...data.posts]);
      setPostsOffset(prev => prev + data.posts.length);
      setHasMorePosts(data.hasMore);
      setTotalPosts(data.total);
    } catch (err) {
      console.error("Failed to load more posts:", err);
    } finally {
      setLoadingMorePosts(false);
    }
  }, [groupId, postsOffset, loadingMorePosts, hasMorePosts]);

  const { data: progress, isLoading: loadingProgress } = useQuery<MemberProgress[]>({
    queryKey: ["group-progress", groupId],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/progress`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch progress");
      return res.json();
    },
    enabled:
      !!parent && activeTab === "progress" && !!group?.isMember,
  });

  const postMutation = useMutation({
    mutationFn: async () => {
      if (recorder.audioBlob) {
        setIsUploadingAudio(true);
        const formData = new FormData();
        const ext = recorder.audioBlob.type.includes("mp3") || recorder.audioBlob.type.includes("mpeg") ? "mp3" : "webm";
        formData.append("audio", recorder.audioBlob, `recording.${ext}`);
        if (audioTitle.trim()) formData.append("title", audioTitle);
        if (postContent.trim()) formData.append("content", postContent);
        const res = await fetch(`/api/groups/${groupId}/posts/audio`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        setIsUploadingAudio(false);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed");
        }
        return res.json();
      } else {
        const res = await fetch(`/api/groups/${groupId}/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content: postContent }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed");
        }
        return res.json();
      }
    },
    onSuccess: () => {
      setPostContent("");
      setAudioTitle("");
      recorder.clearRecording();
      setIsUploadingAudio(false);
      setPostsOffset(0);
      setAllPosts([]);
      queryClient.invalidateQueries({ queryKey: ["group-posts", groupId] });
    },
    onError: (err: Error) => {
      setIsUploadingAudio(false);
      toast.error(err.message);
    },
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-detail", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Guruubka waad ku biirtay!");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/leave`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-detail", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Guruubka waad ka baxday");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Guruubka waa la tirtiray");
      onBack();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  if (loadingGroup) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 space-y-4">
        <Skeleton className="h-10 w-full bg-gray-200" />
        <Skeleton className="h-24 w-full bg-gray-200" />
        <Skeleton className="h-40 w-full bg-gray-200" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Guruubka lama helin</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-700 hover:bg-gray-100"
            onClick={onBack}
            data-testid="button-back-to-list"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">
              {group.name}
            </h1>
          </div>
          {group.myRole === "admin" && group.createdBy === parent?.id && (
            <Button
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid="button-delete-group"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      <div className="px-4 py-4 pb-40">
        <Card className="bg-white border-gray-200 mb-4">
          <CardContent className="p-4">
            {group.description && (
              <p className="text-gray-600 text-sm mb-3">
                {group.description}
              </p>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Users className="w-4 h-4" />
                <span>
                  {group.memberCount} xubnood
                </span>
              </div>
              {group.isMember ? (
                group.createdBy !== parent?.id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs"
                    onClick={() => leaveMutation.mutate()}
                    disabled={leaveMutation.isPending}
                    data-testid="button-leave-group"
                  >
                    <UserMinus className="w-3.5 h-3.5 mr-1" />
                    Ka bax
                  </Button>
                )
              ) : (
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  onClick={() => joinMutation.mutate()}
                  disabled={joinMutation.isPending}
                  data-testid="button-join-group"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  Ku biir
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {group.isMember ? (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="w-full bg-gray-100 border border-gray-200 grid grid-cols-4">
              <TabsTrigger
                value="posts"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-600 text-xs"
                data-testid="tab-posts"
              >
                Posts
              </TabsTrigger>
              <TabsTrigger
                value="messages"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-600 text-xs"
                data-testid="tab-messages"
              >
                <Mail className="w-3.5 h-3.5 mr-1" />
                Fariin Gaar ah
              </TabsTrigger>
              <TabsTrigger
                value="members"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-600 text-xs"
                data-testid="tab-members"
              >
                Xubnaha
              </TabsTrigger>
              <TabsTrigger
                value="progress"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-600 text-xs"
                data-testid="tab-progress"
              >
                Horumarka
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="mt-4 space-y-4">
              <Card className="bg-white border-gray-200">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-9 h-9 border border-gray-200 shrink-0">
                      <AvatarImage src={parent?.picture || undefined} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                        {getInitials(parent?.name || null)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      {recorder.isRecording && (
                        <div className="flex items-center gap-3 mb-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                          <div className="relative">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-30" />
                          </div>
                          <span className="text-red-600 text-sm font-medium flex-1">Duubayo... {recorder.formatDuration(recorder.recordingDuration)}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-100 rounded-full"
                            onClick={recorder.stopRecording}
                            data-testid="button-stop-recording"
                          >
                            <Square className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      {recorder.audioPreviewUrl && !recorder.isRecording && (
                        <div className="mb-3 space-y-2">
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-blue-600 text-xs font-medium flex items-center gap-1.5">
                                <Mic className="w-3.5 h-3.5" /> Audio duuban
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-gray-400 hover:text-red-400 hover:bg-red-50 rounded-full"
                                onClick={() => { recorder.clearRecording(); setAudioTitle(""); }}
                                data-testid="button-clear-recording"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            <audio src={recorder.audioPreviewUrl} controls className="w-full h-9 mb-3" style={{ maxWidth: '100%' }} />
                            <Input
                              value={audioTitle}
                              onChange={(e) => setAudioTitle(e.target.value)}
                              placeholder="Ciwaan ku dar (tusaale: Talo waalid)"
                              className="bg-white border-gray-200 text-gray-800 placeholder:text-gray-400 text-sm mb-2 rounded-lg"
                              data-testid="input-audio-title"
                            />
                            <Textarea
                              value={postContent}
                              onChange={(e) => setPostContent(e.target.value)}
                              placeholder="Faahfaahin yar ku dar (ikhtiyaari)..."
                              className="bg-white border-gray-200 text-gray-800 placeholder:text-gray-400 text-sm min-h-[50px] resize-none rounded-lg"
                              data-testid="input-post-content"
                            />
                          </div>
                        </div>
                      )}

                      {!recorder.audioPreviewUrl && !recorder.isRecording && (
                        <Textarea
                          value={postContent}
                          onChange={(e) => setPostContent(e.target.value)}
                          placeholder="Wax la wadaag guruubka..."
                          className="bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 text-sm min-h-[60px] resize-none"
                          data-testid="input-post-content-text"
                        />
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-9 w-9 rounded-full ${recorder.isRecording ? 'text-red-500 hover:text-red-400 bg-red-50' : recorder.audioPreviewUrl ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-600 hover:bg-gray-100'}`}
                          onClick={recorder.isRecording ? recorder.stopRecording : recorder.startRecording}
                          disabled={postMutation.isPending || (!!recorder.audioPreviewUrl && !recorder.isRecording)}
                          data-testid="button-record-audio"
                        >
                          <Mic className="w-5 h-5" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => postMutation.mutate()}
                          disabled={
                            (!postContent.trim() && !recorder.audioBlob) || postMutation.isPending || isUploadingAudio
                          }
                          data-testid="button-send-post"
                        >
                          {postMutation.isPending || isUploadingAudio ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          ) : (
                            <Send className="w-4 h-4 mr-1" />
                          )}
                          Dir
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {loadingPosts ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card
                    key={i}
                    className="bg-white border-gray-200"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full bg-gray-200" />
                        <Skeleton className="h-4 w-32 bg-gray-200" />
                      </div>
                      <Skeleton className="h-12 w-full bg-gray-200" />
                    </CardContent>
                  </Card>
                ))
              ) : allPosts.length > 0 ? (
                <>
                  {allPosts.map((post) => (
                    <PostItem
                      key={post.id}
                      post={post}
                      currentUserId={parent?.id || ""}
                      groupId={groupId}
                      onMemberClick={handleMemberClick}
                    />
                  ))}
                  {hasMorePosts && (
                    <Button
                      variant="outline"
                      className="w-full border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-white"
                      onClick={loadMorePosts}
                      disabled={loadingMorePosts}
                      data-testid="button-load-more-posts"
                    >
                      {loadingMorePosts ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Tus fariimaha hore ({allPosts.length}/{totalPosts})
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="w-10 h-10 text-blue-500 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">
                    Wali post la ma sameyn. Noqo kii ugu horreeya!
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="messages" className="mt-4">
              <MessagesView
                currentUserId={parent?.id || ""}
                groupMembers={group.members}
                initialChatPartner={dmChatPartner}
                onClearInitialPartner={() => setDmChatPartner(null)}
              />
            </TabsContent>

            <TabsContent value="members" className="mt-4 space-y-2">
              {group.members.map((member) => {
                const isSelf = member.id === parent?.id;
                return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Card
                    className={`bg-white border-gray-200 ${!isSelf ? 'cursor-pointer hover:border-blue-300' : ''} transition-colors`}
                    onClick={() => !isSelf && handleMemberClick(member)}
                    data-testid={`card-member-${member.id}`}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <Avatar className={`w-10 h-10 border border-gray-200 ${!isSelf ? 'hover:ring-2 hover:ring-blue-500' : ''} transition-all`}>
                        <AvatarImage src={member.picture || undefined} />
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">
                          {member.name || "Aan la aqoon"}
                          {isSelf && <span className="text-gray-500 text-xs ml-1">(Adiga)</span>}
                        </p>
                      </div>
                      {!isSelf && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenChat(member.id);
                          }}
                          data-testid={`button-chat-member-${member.id}`}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                      )}
                      <Badge
                        className={
                          member.role === "admin"
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            : "bg-blue-100 text-gray-500 border-blue-500/30"
                        }
                      >
                        {member.role === "admin" ? (
                          <>
                            <Crown className="w-3 h-3 mr-1" />
                            Admin
                          </>
                        ) : (
                          "Xubin"
                        )}
                      </Badge>
                    </CardContent>
                  </Card>
                </motion.div>
                );
              })}
            </TabsContent>

            <TabsContent value="progress" className="mt-4 space-y-4">
              {loadingProgress ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card
                    key={i}
                    className="bg-white border-gray-200"
                  >
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-5 w-32 bg-gray-200" />
                      <Skeleton className="h-3 w-full bg-gray-200" />
                    </CardContent>
                  </Card>
                ))
              ) : progress && progress.length > 0 ? (
                progress.map((member: any) => {
                  const isContentMember = member.contentType === 'dhambaal' || member.contentType === 'sheeko';
                  const completedCourses = !isContentMember ? (member.courses?.filter((c: any) => c.percent === 100) || []) : [];
                  const contentData = isContentMember && member.courses?.[0] ? member.courses[0] : null;
                  const hasCertificates = member.certificates && member.certificates.length > 0;
                  const hasBadges = member.badges && member.badges.length > 0;
                  return (
                  <Card
                    key={member.userId}
                    className="bg-white border-gray-200"
                    data-testid={`card-progress-${member.userId}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="w-9 h-9 border-2 border-blue-600">
                          <AvatarImage src={member.picture || undefined} />
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <span className="text-white text-sm font-semibold block truncate">
                            {member.name || "Aan la aqoon"}
                          </span>
                          <div className="flex items-center gap-3 mt-0.5">
                            {member.currentStreak > 0 && (
                              <span className="flex items-center gap-1 text-orange-400 text-xs">
                                <Flame className="w-3.5 h-3.5" />
                                {member.currentStreak} maalin
                              </span>
                            )}
                            {isContentMember && contentData && (
                              <span className={`flex items-center gap-1 text-xs ${member.contentType === 'dhambaal' ? 'text-teal-400' : 'text-purple-400'}`}>
                                <BookOpen className="w-3.5 h-3.5" />
                                {contentData.readCount || 0} la akhriyay
                              </span>
                            )}
                            {!isContentMember && completedCourses.length > 0 && (
                              <span className="flex items-center gap-1 text-blue-500 text-xs">
                                <GraduationCap className="w-3.5 h-3.5" />
                                {completedCourses.length} koorso
                              </span>
                            )}
                          </div>
                        </div>
                        {member.longestStreak > 0 && (
                          <div className="text-center px-2 py-1 bg-orange-900/30 border border-orange-800/40 rounded-lg">
                            <Trophy className="w-3.5 h-3.5 text-orange-400 mx-auto" />
                            <span className="text-orange-300 text-[10px] block">{member.longestStreak}</span>
                          </div>
                        )}
                      </div>

                      {hasBadges && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {member.badges.map((badge: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1 px-2 py-1 bg-amber-900/30 border border-amber-700/40 rounded-full"
                              title={badge.description || badge.name}
                              data-testid={`badge-${member.userId}-${idx}`}
                            >
                              {badge.imageUrl ? (
                                <img src={badge.imageUrl} alt={badge.name} className="w-4 h-4 rounded-full" />
                              ) : (
                                <Award className="w-3.5 h-3.5 text-amber-400" />
                              )}
                              <span className="text-amber-200 text-[11px] font-medium">{badge.name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {hasCertificates && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {member.certificates.map((cert: any, idx: number) => {
                            const certCourse = group.courses?.find((c: any) => c.id === cert.courseId);
                            return (
                              <div
                                key={idx}
                                className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-full"
                                data-testid={`cert-${member.userId}-${idx}`}
                              >
                                <Star className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-blue-600 text-[11px] font-medium">
                                  Shahaado: {certCourse?.title || "Koorsada"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {member.courses.length > 0 ? (
                        <div className="space-y-3">
                          {member.courses.map((course: any, idx: number) => {
                            if (course.contentType) {
                              const isDhambaal = course.contentType === 'dhambaal';
                              const label = isDhambaal ? "Dhambaalka la akhriyay" : "Sheekada la akhriyay";
                              const isComplete = course.percent === 100;
                              return (
                                <div key={`content-${idx}`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className={`text-xs flex items-center gap-1 ${isComplete ? 'text-blue-500' : isDhambaal ? 'text-teal-300' : 'text-purple-300'}`}>
                                      <BookOpen className="w-3 h-3" />
                                      {label}
                                      {isComplete && <span className="text-blue-500 text-[10px] ml-1">✓ Dhammaystay</span>}
                                    </span>
                                    <span className={`text-xs ${isComplete ? 'text-blue-500 font-semibold' : isDhambaal ? 'text-teal-400' : 'text-purple-400'}`}>
                                      {course.readCount}/{course.totalCount}
                                    </span>
                                  </div>
                                  <Progress
                                    value={course.percent}
                                    className={`h-2 ${isComplete ? 'bg-blue-200' : isDhambaal ? 'bg-teal-200' : 'bg-purple-200'}`}
                                  />
                                </div>
                              );
                            }
                            const courseInfo = group.courses?.find(
                              (c: any) => c.id === course.courseId
                            );
                            const isComplete = course.percent === 100;
                            return (
                              <div key={course.courseId}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-xs flex items-center gap-1 ${isComplete ? 'text-blue-500' : 'text-gray-500'}`}>
                                    {isComplete ? <GraduationCap className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                                    {courseInfo?.title || "Koorsada"}
                                    {isComplete && <span className="text-blue-500 text-[10px] ml-1">✓ Dhameeyay</span>}
                                  </span>
                                  <span className={`text-xs ${isComplete ? 'text-blue-500 font-semibold' : 'text-gray-500'}`}>
                                    {course.completedLessons}/
                                    {course.totalLessons}
                                  </span>
                                </div>
                                <Progress
                                  value={course.percent}
                                  className={`h-2 ${isComplete ? 'bg-blue-200' : 'bg-gray-200'}`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-xs">
                          {member.contentType === 'dhambaal' ? "Wali dhambaal lama akhriyin" : member.contentType === 'sheeko' ? "Wali sheeko lama akhriyin" : "Wali koorso lama bilaabin"}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-10 h-10 text-blue-500 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">
                    {group.contentType === 'dhambaal' || group.contentType === 'sheeko'
                      ? "Xogta horumarka wali lama helin"
                      : group.courseIds && group.courseIds.length > 0
                        ? "Xogta horumarka wali lama helin"
                        : "Guruubkan koorso laguma xirin wali"}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-blue-500 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">
              Guruubka ku biir si aad u aragto posts-ka, xubnaha iyo horumarka
            </p>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
              data-testid="button-join-group-cta"
            >
              {joinMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Ku biir Guruubka
            </Button>
          </div>
        )}
      </div>

      <MemberProfileDialog
        member={profileMember}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        currentUserId={parent?.id || ""}
        onOpenChat={handleOpenChat}
      />
    </div>
  );
}

export default function LearningGroups() {
  const [location, setLocation] = useLocation();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('group');
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const groupParam = params.get('group');
    if (groupParam && groupParam !== selectedGroupId) {
      setSelectedGroupId(groupParam);
    }
  }, [location]);

  return (
    <AnimatePresence mode="wait">
      {selectedGroupId ? (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <GroupDashboard
            groupId={selectedGroupId}
            onBack={() => {
              setSelectedGroupId(null);
              setLocation("/groups");
            }}
          />
        </motion.div>
      ) : (
        <motion.div
          key="list"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2 }}
        >
          <GroupsListView onSelectGroup={setSelectedGroupId} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
