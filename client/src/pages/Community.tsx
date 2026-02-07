import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { ArrowLeft, MessageCircle, Plus, Users, Send, Heart, User, Sparkles, BookOpen, Stethoscope, Gamepad2, Globe, HelpCircle, Pin } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CommunityThread {
  id: string;
  courseId: string | null;
  parentId: string;
  parentName: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  isLocked: boolean;
  replyCount: number;
  likeCount: number;
  isLikedByMe: boolean;
  createdAt: string;
}

interface CommunityPost {
  id: string;
  threadId: string;
  parentId: string;
  parentName: string;
  content: string;
  voiceNoteUrl: string | null;
  likeCount: number;
  isLikedByMe: boolean;
  createdAt: string;
}

const categories = [
  { id: "guud", name: "Guud", icon: Globe, color: "from-blue-500 to-cyan-500", bg: "bg-blue-100", text: "text-blue-700" },
  { id: "caafimaad", name: "Caafimaad", icon: Stethoscope, color: "from-green-500 to-emerald-500", bg: "bg-green-100", text: "text-green-700" },
  { id: "waxbarasho", name: "Waxbarasho", icon: BookOpen, color: "from-purple-500 to-violet-500", bg: "bg-purple-100", text: "text-purple-700" },
  { id: "ciyaar", name: "Ciyaar", icon: Gamepad2, color: "from-orange-500 to-amber-500", bg: "bg-orange-100", text: "text-orange-700" },
  { id: "kale", name: "Kale", icon: HelpCircle, color: "from-gray-500 to-slate-500", bg: "bg-gray-100", text: "text-gray-700" },
];

export default function Community() {
  const { t } = useTranslation();
  const { parent } = useParentAuth();
  const queryClient = useQueryClient();
  const [showNewThread, setShowNewThread] = useState(false);
  const [selectedThread, setSelectedThread] = useState<CommunityThread | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("guud");
  const [newReply, setNewReply] = useState("");

  const { data: threads = [] } = useQuery<CommunityThread[]>({
    queryKey: ["communityThreads"],
    queryFn: async () => {
      const res = await fetch("/api/community/threads", { credentials: "include" });
      return res.json();
    },
  });

  const { data: posts = [] } = useQuery<CommunityPost[]>({
    queryKey: ["communityPosts", selectedThread?.id],
    queryFn: async () => {
      if (!selectedThread) return [];
      const res = await fetch(`/api/community/threads/${selectedThread.id}/posts`, { credentials: "include" });
      return res.json();
    },
    enabled: !!selectedThread,
  });

  const createThreadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/community/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: newTitle, content: newContent, category: newCategory }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityThreads"] });
      setShowNewThread(false);
      setNewTitle("");
      setNewContent("");
      setNewCategory("guud");
      toast.success("Mawduuca cusub waa la sameeyay!");
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!selectedThread) return;
      const res = await fetch(`/api/community/threads/${selectedThread.id}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: newReply }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityPosts", selectedThread?.id] });
      queryClient.invalidateQueries({ queryKey: ["communityThreads"] });
      setNewReply("");
      toast.success("Jawaabta waa la soo dhigay!");
    },
  });

  const likeThreadMutation = useMutation({
    mutationFn: async (threadId: string) => {
      const res = await fetch(`/api/community/threads/${threadId}/like`, {
        method: "POST",
        credentials: "include",
      });
      return res.json();
    },
    onSuccess: (data, threadId) => {
      queryClient.invalidateQueries({ queryKey: ["communityThreads"] });
      // Update selectedThread if it's the one being liked
      if (selectedThread && selectedThread.id === threadId) {
        setSelectedThread({
          ...selectedThread,
          isLikedByMe: data.liked,
          likeCount: data.liked ? selectedThread.likeCount + 1 : Math.max(0, selectedThread.likeCount - 1),
        });
      }
    },
  });

  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`/api/community/posts/${postId}/like`, {
        method: "POST",
        credentials: "include",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityPosts", selectedThread?.id] });
    },
  });

  const pinThreadMutation = useMutation({
    mutationFn: async (threadId: string) => {
      const res = await fetch(`/api/community/threads/${threadId}/pin`, {
        method: "POST",
        credentials: "include",
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["communityThreads"] });
      toast.success(data.pinned ? "Mawduuca waa la pin gareeyay!" : "Pin-ka waa laga saaray");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Hadda";
    if (diffHours < 24) return `${diffHours} saacadood kahor`;
    if (diffDays < 7) return `${diffDays} maalmood kahor`;
    return date.toLocaleDateString("so-SO");
  };

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(c => c.id === categoryId) || categories[0];
  };

  const filteredThreads = selectedCategory 
    ? threads.filter(t => t.category === selectedCategory)
    : threads;

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "from-pink-500 to-rose-500",
      "from-purple-500 to-violet-500",
      "from-blue-500 to-cyan-500",
      "from-green-500 to-emerald-500",
      "from-orange-500 to-amber-500",
      "from-red-500 to-pink-500",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-pink-50 to-white pb-24">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 safe-top shadow-lg">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <button className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm" data-testid="button-back">
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
              </Link>
              <div>
                <h1 className="font-bold text-white text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Bulshadda Waalidiinta
                </h1>
                <p className="text-pink-100 text-sm">Wadaag fikradahaaga iyo su'aalaha</p>
              </div>
            </div>
            {parent && (
              <button
                onClick={() => setShowNewThread(true)}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg"
                data-testid="button-new-thread"
              >
                <Plus className="w-5 h-5 text-purple-600" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Category Filter */}
      <div className="px-4 py-3 overflow-x-auto">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === null 
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md" 
                : "bg-white text-gray-700 border border-gray-200"
            }`}
            data-testid="filter-all"
          >
            Dhammaan
          </button>
          {categories.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat.id 
                    ? `bg-gradient-to-r ${cat.color} text-white shadow-md` 
                    : "bg-white text-gray-700 border border-gray-200"
                }`}
                data-testid={`filter-${cat.id}`}
              >
                <Icon className="w-4 h-4" />
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-2">
        {filteredThreads.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-purple-500" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Wali ma jiraan mawduucyo</h3>
            <p className="text-gray-500 text-sm mb-4">Noqo qofka ugu horreeya ee mawduuc cusub soo dhiga!</p>
            {parent && (
              <button
                onClick={() => setShowNewThread(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg"
              >
                Ku bilow mawduuc cusub
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredThreads.map(thread => {
              const catInfo = getCategoryInfo(thread.category);
              const CatIcon = catInfo.icon;
              return (
                <div
                  key={thread.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                  data-testid={`thread-${thread.id}`}
                >
                  <button
                    onClick={() => setSelectedThread(thread)}
                    className="w-full p-4 text-left active:bg-gray-50 transition-colors"
                  >
                    <div className="flex gap-3">
                      {/* Avatar */}
                      <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarColor(thread.parentName)} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white font-bold text-sm">{getInitials(thread.parentName)}</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900 text-sm">{thread.parentName}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-400">{formatDate(thread.createdAt)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-1.5">
                          {thread.isPinned && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                              📌 Muhiim
                            </span>
                          )}
                          <span className={`text-xs ${catInfo.bg} ${catInfo.text} px-2 py-0.5 rounded-full font-medium flex items-center gap-1`}>
                            <CatIcon className="w-3 h-3" />
                            {catInfo.name}
                          </span>
                        </div>
                        
                        <h3 className="font-semibold text-gray-900 line-clamp-1 mb-1">{thread.title}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{thread.content}</p>
                      </div>
                    </div>
                  </button>
                  
                  {/* Actions */}
                  <div className="px-4 pb-3 flex items-center gap-4 border-t border-gray-50 pt-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (parent) {
                          likeThreadMutation.mutate(thread.id);
                        } else {
                          toast.error("Fadlan gal akoonkaaga si aad u jeclaato");
                        }
                      }}
                      className={`flex items-center gap-1.5 text-sm transition-all ${
                        thread.isLikedByMe ? "text-pink-600" : "text-gray-500 hover:text-pink-600"
                      }`}
                      data-testid={`like-thread-${thread.id}`}
                    >
                      <Heart className={`w-4 h-4 ${thread.isLikedByMe ? "fill-pink-600" : ""}`} />
                      <span>{thread.likeCount}</span>
                    </button>
                    <button 
                      onClick={() => setSelectedThread(thread)}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-600"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{thread.replyCount} jawaab</span>
                    </button>
                    {parent?.isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          pinThreadMutation.mutate(thread.id);
                        }}
                        className={`flex items-center gap-1.5 text-sm transition-all ml-auto ${
                          thread.isPinned ? "text-amber-600" : "text-gray-400 hover:text-amber-600"
                        }`}
                        data-testid={`pin-thread-${thread.id}`}
                      >
                        <Pin className={`w-4 h-4 ${thread.isPinned ? "fill-amber-600" : ""}`} />
                        <span>{thread.isPinned ? "Ka saar" : "Pin"}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!parent && (
          <div className="mt-6 bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200 rounded-2xl p-4 text-center">
            <User className="w-10 h-10 text-purple-500 mx-auto mb-2" />
            <p className="text-purple-800 font-medium">Fadlan gal akoonkaaga</p>
            <p className="text-purple-600 text-sm">Si aad uga qayb gasho wadahadallada</p>
          </div>
        )}
      </div>

      {/* New Thread Dialog */}
      <Dialog open={showNewThread} onOpenChange={setShowNewThread}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Mawduuc Cusub
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Category Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Nooca Mawduuca</label>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNewCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition-all ${
                        newCategory === cat.id 
                          ? `bg-gradient-to-r ${cat.color} text-white shadow-md` 
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <input
              type="text"
              placeholder="Cinwaanka mawduuca..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
              data-testid="input-thread-title"
            />
            <textarea
              placeholder="Qor faahfaahin... (Su'aal, talo, ama fikrad)"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none resize-none transition-all"
              data-testid="input-thread-content"
            />
            <button
              onClick={() => createThreadMutation.mutate()}
              disabled={!newTitle || !newContent || createThreadMutation.isPending}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50 shadow-lg transition-all"
              data-testid="button-submit-thread"
            >
              {createThreadMutation.isPending ? "Waa la soo dhigayaa..." : "Dhaji Mawduuca"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Thread Detail Dialog */}
      <Dialog open={!!selectedThread} onOpenChange={() => setSelectedThread(null)}>
        <DialogContent className="max-h-[85vh] flex flex-col max-w-md">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-base line-clamp-2">{selectedThread?.title}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-3 py-3">
            {/* Original Post */}
            {selectedThread && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(selectedThread.parentName)} flex items-center justify-center`}>
                    <span className="text-white font-bold text-sm">{getInitials(selectedThread.parentName)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{selectedThread.parentName}</p>
                    <p className="text-xs text-gray-500">{formatDate(selectedThread.createdAt)}</p>
                  </div>
                </div>
                <p className="text-gray-700">{selectedThread.content}</p>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-purple-100">
                  <button 
                    onClick={() => parent && likeThreadMutation.mutate(selectedThread.id)}
                    className={`flex items-center gap-1.5 text-sm ${
                      selectedThread.isLikedByMe ? "text-pink-600" : "text-gray-500"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${selectedThread.isLikedByMe ? "fill-pink-600" : ""}`} />
                    <span>{selectedThread.likeCount}</span>
                  </button>
                </div>
              </div>
            )}
            
            {/* Replies */}
            {posts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Jawaabaha ({posts.length})</p>
                {posts.map(post => (
                  <div key={post.id} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(post.parentName)} flex items-center justify-center`}>
                        <span className="text-white font-bold text-xs">{getInitials(post.parentName)}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{post.parentName}</p>
                        <p className="text-xs text-gray-400">{formatDate(post.createdAt)}</p>
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm">{post.content}</p>
                    <button 
                      onClick={() => parent && likePostMutation.mutate(post.id)}
                      className={`flex items-center gap-1 text-xs mt-2 ${
                        post.isLikedByMe ? "text-pink-600" : "text-gray-400"
                      }`}
                      data-testid={`like-post-${post.id}`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${post.isLikedByMe ? "fill-pink-600" : ""}`} />
                      <span>{post.likeCount}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {parent && !selectedThread?.isLocked && (
            <div className="flex gap-2 pt-3 border-t">
              <input
                type="text"
                placeholder="Qor jawaab..."
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-500 outline-none text-sm"
                data-testid="input-reply"
              />
              <button
                onClick={() => createPostMutation.mutate()}
                disabled={!newReply || createPostMutation.isPending}
                className="w-11 h-11 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white disabled:opacity-50 shadow-lg"
                data-testid="button-send-reply"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
