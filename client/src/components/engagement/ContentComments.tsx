import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, Trash2, Reply, X, Loader2, Heart, ThumbsUp, ThumbsDown, Sparkles, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { toast } from "sonner";
import { Link } from "wouter";

const REACTION_OPTIONS = [
  { type: "love", emoji: "❤️", icon: Heart, color: "text-red-500" },
  { type: "like", emoji: "👍", icon: ThumbsUp, color: "text-blue-500" },
  { type: "dislike", emoji: "👎", icon: ThumbsDown, color: "text-gray-500" },
  { type: "sparkle", emoji: "✨", icon: Sparkles, color: "text-yellow-500" },
];

interface ContentCommentsProps {
  contentType: "bedtime_story" | "parent_message";
  contentId: string;
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  replyToId: string | null;
  parent: {
    id: string;
    name: string;
    picture: string | null;
  };
  replyTo?: {
    id: string;
    body: string;
    parent: {
      id: string;
      name: string;
    };
  };
}

function CommentReactions({ commentId }: { commentId: string }) {
  const { parent } = useParentAuth();
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery<{ counts: Record<string, number>; userReaction: string | null }>({
    queryKey: [`/api/comments/${commentId}/reactions`],
    queryFn: async () => {
      const res = await fetch(`/api/comments/${commentId}/reactions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reactions");
      return res.json();
    },
  });

  const reactionMutation = useMutation({
    mutationFn: async ({ reactionType, remove }: { reactionType: string; remove?: boolean }) => {
      const res = await fetch(`/api/comments/${commentId}/reactions`, {
        method: remove ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: remove ? undefined : JSON.stringify({ reactionType }),
      });
      if (!res.ok) throw new Error("Failed to update reaction");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/comments/${commentId}/reactions`] });
    },
  });

  const handleReaction = (type: string) => {
    if (!parent) {
      toast.error("Fadlan gal akoontaada si aad reaction ka bixiso");
      return;
    }
    if (data?.userReaction === type) {
      reactionMutation.mutate({ reactionType: type, remove: true });
    } else {
      reactionMutation.mutate({ reactionType: type });
    }
  };

  const totalReactions = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;

  if (isLoading) return null;

  return (
    <div className="flex items-center gap-1">
      {REACTION_OPTIONS.map(({ type, emoji }) => {
        const count = data?.counts[type] || 0;
        const isUserReaction = data?.userReaction === type;
        
        return (
          <button
            key={type}
            onClick={() => handleReaction(type)}
            disabled={reactionMutation.isPending}
            className={`flex items-center gap-0.5 px-2 py-1 rounded-full text-xs transition-all active:scale-95 ${
              isUserReaction
                ? "bg-blue-500/40 ring-2 ring-blue-400 scale-110"
                : "bg-slate-600/50 hover:bg-slate-500/50 hover:scale-105"
            }`}
            data-testid={`comment-reaction-${type}-${commentId}`}
          >
            <span className={`text-base ${isUserReaction ? '' : 'opacity-70'}`}>{emoji}</span>
            {count > 0 && <span className={`font-medium ${isUserReaction ? 'text-white' : 'text-slate-300'}`}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function ContentComments({ contentType, contentId }: ContentCommentsProps) {
  const { parent } = useParentAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState("");

  const apiPath = contentType === "bedtime_story"
    ? `/api/bedtime-stories/${contentId}/comments`
    : `/api/parent-messages/${contentId}/comments`;

  const queryKey = [apiPath];

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(apiPath, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json();
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ body, replyToId }: { body: string; replyToId?: string }) => {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body, replyToId }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setNewComment("");
      setReplyText("");
      setReplyingTo(null);
      toast.success("Faalladaada waa la keydiyay!");
    },
    onError: () => {
      toast.error("Wax qalad ah ayaa dhacay");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`${apiPath}/${commentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete comment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Faalladaada waa la tirtiray");
    },
    onError: () => {
      toast.error("Wax qalad ah ayaa dhacay");
    },
  });

  const handleSubmitComment = () => {
    if (!parent) {
      toast.error("Fadlan gal akoontaada si aad faallo u dhigto");
      return;
    }
    if (!newComment.trim()) return;
    addCommentMutation.mutate({ body: newComment.trim() });
  };

  const handleSubmitReply = () => {
    if (!parent) {
      toast.error("Fadlan gal akoontaada si aad jawaab u dhigto");
      return;
    }
    if (!replyText.trim() || !replyingTo) return;
    addCommentMutation.mutate({ body: replyText.trim(), replyToId: replyingTo.id });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Hadda";
    if (diffMins < 60) return `${diffMins} daqiiqo kahor`;
    if (diffHours < 24) return `${diffHours} saac kahor`;
    if (diffDays < 7) return `${diffDays} maalin kahor`;
    return date.toLocaleDateString("so-SO", { month: "short", day: "numeric" });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const topLevelComments = comments.filter((c) => !c.replyToId);
  const getReplies = (parentCommentId: string) => comments.filter((c) => c.replyToId === parentCommentId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-slate-400" />
        <h3 className="text-lg font-semibold text-white">
          Faallooyinka ({comments.length})
        </h3>
      </div>

      {parent && (
        <div className="bg-white/5 rounded-xl p-4 mb-6">
          <Textarea
            placeholder="Faallo ku qor..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 mb-3 resize-none"
            rows={3}
            data-testid="input-new-comment"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || addCommentMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="button-submit-comment"
            >
              {addCommentMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Dir
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          Wali faallo ma jirto. Noqo kan ugu horreeya!
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {topLevelComments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="bg-white/5 rounded-xl p-4" data-testid={`comment-${comment.id}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {getInitials(comment.parent.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link href={`/parent/${comment.parent.id}`}>
                          <span className="font-medium text-white hover:text-indigo-300 transition-colors cursor-pointer" data-testid={`link-author-${comment.id}`}>
                            {comment.parent.name}
                          </span>
                        </Link>
                        <span className="text-xs text-slate-500">{formatDate(comment.createdAt)}</span>
                        {parent && parent.id !== comment.parent.id && (
                          <Link href={`/parent/${comment.parent.id}`}>
                            <button className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors" data-testid={`button-view-profile-${comment.id}`}>
                              <UserPlus className="w-3 h-3" />
                            </button>
                          </Link>
                        )}
                      </div>
                      <p className="text-slate-300 whitespace-pre-wrap break-words">{comment.body}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <CommentReactions commentId={comment.id} />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyingTo(comment)}
                          className="text-slate-400 hover:text-white h-8 px-2"
                          data-testid={`button-reply-${comment.id}`}
                        >
                          <Reply className="w-4 h-4 mr-1" />
                          Jawaab
                        </Button>
                        {parent?.id === comment.parent.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCommentMutation.mutate(comment.id)}
                            disabled={deleteCommentMutation.isPending}
                            className="text-red-400 hover:text-red-300 h-8 px-2"
                            data-testid={`button-delete-${comment.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {replyingTo?.id === comment.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 ml-13 pl-4 border-l-2 border-emerald-500/30"
                    >
                      <div className="flex items-center gap-2 mb-2 text-sm text-emerald-400">
                        <Reply className="w-4 h-4" />
                        Ka jawaabaya: {comment.parent.name}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyingTo(null)}
                          className="text-slate-400 hover:text-white h-6 w-6 p-0 ml-auto"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Jawaab ku qor..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 mb-2 resize-none"
                        rows={2}
                        data-testid="input-reply"
                      />
                      <Button
                        onClick={handleSubmitReply}
                        disabled={!replyText.trim() || addCommentMutation.isPending}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        data-testid="button-submit-reply"
                      >
                        {addCommentMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-1" />
                        )}
                        Dir jawaab
                      </Button>
                    </motion.div>
                  )}

                  {getReplies(comment.id).length > 0 && (
                    <div className="mt-4 ml-8 space-y-3 border-l-2 border-white/10 pl-4">
                      {getReplies(comment.id).map((reply) => (
                        <motion.div
                          key={reply.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-white/5 rounded-lg p-3"
                          data-testid={`reply-${reply.id}`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {getInitials(reply.parent.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Link href={`/parent/${reply.parent.id}`}>
                                  <span className="font-medium text-white text-sm hover:text-indigo-300 transition-colors cursor-pointer">
                                    {reply.parent.name}
                                  </span>
                                </Link>
                                <span className="text-xs text-slate-500">{formatDate(reply.createdAt)}</span>
                                {parent && parent.id !== reply.parent.id && (
                                  <Link href={`/parent/${reply.parent.id}`}>
                                    <UserPlus className="w-3 h-3 text-indigo-400 hover:text-indigo-300 cursor-pointer" />
                                  </Link>
                                )}
                              </div>
                              {reply.replyTo && (
                                <div className="text-xs text-emerald-400 mb-1">
                                  ↳ {reply.replyTo.parent.name}
                                </div>
                              )}
                              <p className="text-slate-300 text-sm whitespace-pre-wrap break-words">{reply.body}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <CommentReactions commentId={reply.id} />
                                {parent?.id === reply.parent.id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteCommentMutation.mutate(reply.id)}
                                    disabled={deleteCommentMutation.isPending}
                                    className="text-red-400 hover:text-red-300 h-6 px-1"
                                    data-testid={`button-delete-reply-${reply.id}`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
