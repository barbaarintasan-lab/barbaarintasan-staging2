import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "sonner";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import {
  Loader2,
  MessageSquare,
  Mic,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
  Square,
  Reply,
  X,
} from "lucide-react";

interface DhambaalDiscussionGroupProps {
  messageId: string;
}

interface PostAuthor {
  id: string;
  name: string;
  picture: string | null;
}

interface Post {
  id: string;
  messageId: string;
  userId: string;
  parentPostId: string | null;
  content: string | null;
  audioUrl: string | null;
  createdAt: string;
  author: PostAuthor;
  reactions: Record<string, number>;
  myReactions: string[];
}

interface PostsResponse {
  posts: Post[];
}

const AVAILABLE_REACTIONS = ["❤️", "👍", "😂", "🤲", "👏", "💡"];

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "Hadda";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} daqiiqo`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saacadood`;
  const days = Math.floor(hours / 24);
  return `${days} maalmood`;
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

function getAudioExtension(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
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

export default function DhambaalDiscussionGroup({ messageId }: DhambaalDiscussionGroupProps) {
  const { parent } = useParentAuth();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const mainRecorder = useAudioRecorder();
  const replyRecorder = useAudioRecorder();

  const { data, isLoading } = useQuery<PostsResponse>({
    queryKey: ["/api/dhambaal-discussions", messageId, "posts"],
    enabled: isExpanded,
  });

  const allPosts = data?.posts || [];
  const topLevelPosts = allPosts.filter(p => !p.parentPostId);
  const repliesByParent = allPosts.reduce<Record<string, Post[]>>((acc, post) => {
    if (post.parentPostId) {
      if (!acc[post.parentPostId]) acc[post.parentPostId] = [];
      acc[post.parentPostId].push(post);
    }
    return acc;
  }, {});
  Object.values(repliesByParent).forEach(replies => replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));

  const createPostMutation = useMutation({
    mutationFn: async ({ text, audio, parentPostId }: { text: string; audio: Blob | null; parentPostId?: string }) => {
      const formData = new FormData();
      if (text.trim()) formData.append("content", text.trim());
      if (audio) formData.append("audio", audio, `recording.${getAudioExtension(audio.type)}`);
      if (parentPostId) formData.append("parentPostId", parentPostId);
      const res = await fetch(`/api/dhambaal-discussions/${messageId}/posts`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Qoraalka lama dirin");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dhambaal-discussions", messageId, "posts"] });
      setContent("");
      setReplyContent("");
      setReplyingTo(null);
      mainRecorder.clearRecording();
      replyRecorder.clearRecording();
      toast.success("Qoraalka waa la diray!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Waa la waayay in la diro");
    },
  });

  const reactMutation = useMutation({
    mutationFn: async ({ postId, reactionType }: { postId: string; reactionType: string }) => {
      const res = await apiRequest("POST", `/api/dhambaal-discussions/posts/${postId}/react`, { reactionType });
      return res.json();
    },
    onMutate: async ({ postId, reactionType }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/dhambaal-discussions", messageId, "posts"] });
      const previous = queryClient.getQueryData<PostsResponse>(["/api/dhambaal-discussions", messageId, "posts"]);
      if (previous) {
        const updatedPosts = previous.posts.map((post) => {
          if (post.id !== postId) return post;
          const hasReaction = post.myReactions.includes(reactionType);
          return {
            ...post,
            myReactions: hasReaction ? post.myReactions.filter((r) => r !== reactionType) : [...post.myReactions, reactionType],
            reactions: { ...post.reactions, [reactionType]: (post.reactions[reactionType] || 0) + (hasReaction ? -1 : 1) },
          };
        });
        queryClient.setQueryData(["/api/dhambaal-discussions", messageId, "posts"], { ...previous, posts: updatedPosts });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["/api/dhambaal-discussions", messageId, "posts"], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dhambaal-discussions", messageId, "posts"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiRequest("DELETE", `/api/dhambaal-discussions/posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dhambaal-discussions", messageId, "posts"] });
      toast.success("Qoraalka waa la tirtiray");
    },
    onError: () => {
      toast.error("Waa la waayay in la tirtiro");
    },
  });

  const handleSubmit = () => {
    if (!content.trim() && !mainRecorder.audioBlob) return;
    createPostMutation.mutate({ text: content, audio: mainRecorder.audioBlob });
  };

  const handleReplySubmit = () => {
    if (!replyingTo) return;
    if (!replyContent.trim() && !replyRecorder.audioBlob) return;
    createPostMutation.mutate({ text: replyContent, audio: replyRecorder.audioBlob, parentPostId: replyingTo.id });
  };

  const canSubmit = (content.trim().length > 0 || mainRecorder.audioBlob !== null) && !createPostMutation.isPending;
  const canSubmitReply = (replyContent.trim().length > 0 || replyRecorder.audioBlob !== null) && !createPostMutation.isPending;

  if (!parent) return null;

  const renderPost = (post: Post, isReply = false) => (
    <div
      key={post.id}
      className={`border rounded-xl p-3 ${isReply ? "bg-emerald-900/20 ml-6 border-emerald-800/30" : "bg-slate-800/50 border-slate-700/50"}`}
      data-testid={`card-dhambaal-post-${post.id}`}
    >
      <div className="flex items-start gap-2">
        <div className={`${isReply ? "w-6 h-6" : "w-8 h-8"} rounded-full bg-emerald-900/50 text-emerald-400 flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden`}>
          {post.author.picture ? (
            <img src={post.author.picture} alt={post.author.name} className="w-full h-full object-cover" />
          ) : (
            post.author.name?.charAt(0)?.toUpperCase() || "?"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`${isReply ? "text-xs" : "text-sm"} font-semibold text-white truncate`} data-testid={`text-dhambaal-author-${post.id}`}>
                {post.author.name}
              </span>
              <span className="text-xs text-slate-500 flex-shrink-0">{timeAgo(post.createdAt)}</span>
            </div>
            {parent && parent.id === post.author.id && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-slate-700" onClick={() => deleteMutation.mutate(post.id)} disabled={deleteMutation.isPending} data-testid={`button-dhambaal-delete-post-${post.id}`}>
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </Button>
            )}
          </div>
          {post.content && (
            <p className={`${isReply ? "text-xs" : "text-sm"} text-slate-300 mt-1 whitespace-pre-wrap`} data-testid={`text-dhambaal-content-${post.id}`}>
              {post.content}
            </p>
          )}
          {post.audioUrl && (
            <audio controls src={post.audioUrl} className="mt-2 h-8 w-full max-w-xs" data-testid={`audio-dhambaal-post-${post.id}`} />
          )}
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {AVAILABLE_REACTIONS.map((emoji) => {
              const count = post.reactions[emoji] || 0;
              const isActive = post.myReactions.includes(emoji);
              return (
                <button
                  key={emoji}
                  onClick={() => reactMutation.mutate({ postId: post.id, reactionType: emoji })}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                    isActive ? "bg-emerald-900/50 border-emerald-500/50 text-emerald-300" : "bg-slate-800/50 border-slate-600/50 text-slate-400 hover:bg-slate-700/50"
                  }`}
                  data-testid={`button-dhambaal-react-${emoji}-${post.id}`}
                >
                  <span>{emoji}</span>
                  {count > 0 && <span>{count}</span>}
                </button>
              );
            })}
            {!isReply && (
              <button
                onClick={() => {
                  setReplyingTo({ id: post.id, authorName: post.author.name });
                  setReplyContent("");
                  replyRecorder.clearRecording();
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-slate-600/50 text-slate-400 hover:bg-slate-700/50 transition-colors ml-1"
                data-testid={`button-dhambaal-reply-${post.id}`}
              >
                <Reply className="w-3 h-3" />
                <span>Jawaab</span>
                {(repliesByParent[post.id]?.length || 0) > 0 && (
                  <span className="text-emerald-400 font-medium">{repliesByParent[post.id].length}</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderReplyForm = (parentPostId: string, authorName: string) => (
    <div className="ml-6 mt-2 border border-emerald-700/30 rounded-xl p-3 bg-emerald-900/20" data-testid={`reply-form-${parentPostId}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-emerald-400 font-medium">Ka jawaab {authorName}</span>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-slate-700" onClick={() => { setReplyingTo(null); setReplyContent(""); replyRecorder.clearRecording(); }}>
          <X className="w-3.5 h-3.5 text-slate-400" />
        </Button>
      </div>
      <Textarea
        placeholder="Qor jawaabta halkan..."
        value={replyContent}
        onChange={(e) => setReplyContent(e.target.value)}
        className="min-h-[60px] resize-none bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500 text-sm focus:border-emerald-500/50"
        data-testid="textarea-dhambaal-reply-content"
      />
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {!replyRecorder.audioBlob && !replyRecorder.isRecording && (
          <Button type="button" variant="outline" size="sm" onClick={replyRecorder.startRecording} className="h-7 border-slate-600 text-slate-300 hover:bg-slate-700" data-testid="button-dhambaal-reply-start-recording">
            <Mic className="w-3.5 h-3.5" />
            <span className="text-xs">Cod</span>
          </Button>
        )}
        {replyRecorder.isRecording && (
          <div className="flex items-center gap-2">
            <Button type="button" variant="destructive" size="sm" className="h-7" onClick={replyRecorder.stopRecording} data-testid="button-dhambaal-reply-stop-recording">
              <Square className="w-3.5 h-3.5" />
              <span className="text-xs">Jooji</span>
            </Button>
            <span className="text-xs text-red-400 flex items-center gap-1 animate-pulse">
              <span className="w-2 h-2 bg-red-500 rounded-full inline-block" />
              {replyRecorder.formatDuration(replyRecorder.recordingDuration)}
            </span>
          </div>
        )}
        {replyRecorder.audioBlob && !replyRecorder.isRecording && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <audio controls src={replyRecorder.audioPreviewUrl || undefined} className="h-7 flex-1 min-w-0" />
            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-slate-700" onClick={replyRecorder.clearRecording}>
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </Button>
          </div>
        )}
        <div className="ml-auto">
          <Button type="button" size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleReplySubmit} disabled={!canSubmitReply} data-testid="button-submit-dhambaal-reply">
            {createPostMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span className="text-xs">Dir</span>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mt-6" data-testid="section-dhambaal-discussion">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg hover:from-emerald-700 hover:to-teal-700 transition-all duration-200"
        data-testid="button-toggle-dhambaal-discussion"
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-lg p-2">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <span className="font-bold text-lg block leading-tight">Aan ka wada hadalo</span>
            <span className="text-emerald-100 text-xs">Fikradaada la wadaag waalidiinta kale</span>
          </div>
          {allPosts.length > 0 && (
            <span className="text-sm bg-white/25 text-white font-semibold px-2.5 py-1 rounded-full" data-testid="text-dhambaal-discussion-count">
              {allPosts.length}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-white/80" /> : <ChevronDown className="w-5 h-5 text-white/80" />}
      </button>

      {isExpanded && (
        <div className="mt-0 space-y-3 border border-t-0 border-slate-700/50 rounded-b-xl p-3 bg-slate-800/60">
          <div className="space-y-3 border border-slate-700/50 rounded-xl p-3 bg-slate-800/40">
            <Textarea
              placeholder="Qor fikradaada halkan..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] resize-none bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500/50"
              data-testid="textarea-dhambaal-discussion-content"
            />
            <div className="flex items-center gap-2 flex-wrap">
              {!mainRecorder.audioBlob && !mainRecorder.isRecording && (
                <Button type="button" variant="outline" size="sm" onClick={mainRecorder.startRecording} className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white" data-testid="button-dhambaal-start-recording">
                  <Mic className="w-4 h-4" />
                  <span className="text-xs">Cod</span>
                </Button>
              )}
              {mainRecorder.isRecording && (
                <div className="flex items-center gap-2">
                  <Button type="button" variant="destructive" size="sm" onClick={mainRecorder.stopRecording} data-testid="button-dhambaal-stop-recording">
                    <Square className="w-4 h-4" />
                    <span className="text-xs">Jooji</span>
                  </Button>
                  <span className="text-xs text-red-400 flex items-center gap-1 animate-pulse" data-testid="text-dhambaal-recording-duration">
                    <span className="w-2 h-2 bg-red-500 rounded-full inline-block" />
                    {mainRecorder.formatDuration(mainRecorder.recordingDuration)}
                  </span>
                </div>
              )}
              {mainRecorder.audioBlob && !mainRecorder.isRecording && (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <audio controls src={mainRecorder.audioPreviewUrl || undefined} className="h-8 flex-1 min-w-0" data-testid="audio-dhambaal-preview" />
                  <Button type="button" variant="ghost" size="sm" onClick={mainRecorder.clearRecording} className="hover:bg-slate-700" data-testid="button-dhambaal-delete-recording">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              )}
              <div className="ml-auto">
                <Button type="button" size="sm" onClick={handleSubmit} disabled={!canSubmit} className="bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="button-submit-dhambaal-discussion-post">
                  {createPostMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span className="text-xs">Dir</span>
                </Button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
            </div>
          ) : allPosts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm" data-testid="text-dhambaal-no-posts">
              Weli qoraal lama qorin. Noqo kii ugu horreeya!
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {topLevelPosts.map((post) => (
                <div key={post.id}>
                  {renderPost(post)}
                  {repliesByParent[post.id]?.map((reply) => renderPost(reply, true))}
                  {replyingTo?.id === post.id && renderReplyForm(post.id, post.author.name)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
