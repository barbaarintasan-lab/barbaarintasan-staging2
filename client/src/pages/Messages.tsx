import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MessageCircle, Send, Loader2, User, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { toast } from "sonner";

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerPicture: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Hadda";
  if (diffMins < 60) return `${diffMins}d`;
  if (diffHours < 24) return `${diffHours}s`;
  if (diffDays < 7) return `${diffDays}m`;
  return date.toLocaleDateString("so-SO", { month: "short", day: "numeric" });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function ConversationList() {
  const [, navigate] = useLocation();
  const { parent } = useParentAuth();

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/messages/conversations"],
    queryFn: async () => {
      const res = await fetch("/api/messages/conversations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
    enabled: !!parent,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <MessageCircle className="w-12 h-12 mx-auto text-slate-500 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Wali fariin kuguma jirto</h3>
        <p className="text-slate-400 text-sm">
          Waxaad fariin u diri kartaa waalidiinta kale marka aad booqato profile-kooda.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/10">
      {conversations.map((conv) => (
        <motion.div
          key={conv.partnerId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="cursor-pointer"
          onClick={() => navigate(`/messages/${conv.partnerId}`)}
          data-testid={`conversation-${conv.partnerId}`}
        >
          <div className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {getInitials(conv.partnerName)}
              </div>
              {conv.unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                  {conv.unreadCount}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className={`font-medium ${conv.unreadCount > 0 ? "text-white" : "text-slate-300"}`}>
                  {conv.partnerName}
                </span>
                <span className="text-xs text-slate-500">{formatRelativeTime(conv.lastMessageAt)}</span>
              </div>
              <p className={`text-sm truncate ${conv.unreadCount > 0 ? "text-white font-medium" : "text-slate-400"}`}>
                {conv.lastMessage}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ChatView({ partnerId }: { partnerId: string }) {
  const [, navigate] = useLocation();
  const { parent } = useParentAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: partnerProfile } = useQuery({
    queryKey: [`/api/parents/${partnerId}/profile`],
    queryFn: async () => {
      const res = await fetch(`/api/parents/${partnerId}/profile`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });

  const { data: messages = [], isLoading } = useQuery<DirectMessage[]>({
    queryKey: [`/api/messages/${partnerId}`],
    queryFn: async () => {
      const res = await fetch(`/api/messages/${partnerId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!parent,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch(`/api/messages/${partnerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${partnerId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
    },
    onError: () => {
      toast.error("Wax qalad ah ayaa dhacay");
    },
  });

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMutation.mutate(newMessage.trim());
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-slate-900/80 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/messages")}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Link href={`/parent/${partnerId}`}>
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
              {partnerProfile ? getInitials(partnerProfile.name) : "..."}
            </div>
            <span className="font-medium text-white">{partnerProfile?.name || "..."}</span>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p>Fariin cusub bilow</p>
          </div>
        ) : (
          <AnimatePresence>
            {sortedMessages.map((msg) => {
              const isMine = msg.senderId === parent?.id;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      isMine
                        ? "bg-indigo-600 text-white rounded-br-md"
                        : "bg-white/10 text-white rounded-bl-md"
                    }`}
                    data-testid={`message-${msg.id}`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                    <div className={`text-xs mt-1 ${isMine ? "text-indigo-200" : "text-slate-400"}`}>
                      {formatRelativeTime(msg.createdAt)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-white/10 bg-slate-900/80">
        <div className="flex gap-2">
          <Textarea
            placeholder="Fariin ku qor..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 resize-none flex-1"
            rows={1}
            data-testid="input-message"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sendMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
            data-testid="button-send-message"
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Messages() {
  const { parent } = useParentAuth();
  const [matchConversation, params] = useRoute("/messages/:partnerId");
  const [location, navigate] = useLocation();
  
  // Handle ?to= query parameter for direct message from profile
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const toId = urlParams.get("to");
    if (toId && parent && !matchConversation) {
      navigate(`/messages/${toId}`, { replace: true });
    }
  }, [parent, matchConversation, navigate]);

  if (!parent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <User className="w-12 h-12 mx-auto text-slate-500 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Gal akoontaada</h2>
          <p className="text-slate-400 mb-4">Si aad u aragto fariimahaaga, fadlan gal akoontaada.</p>
          <Button onClick={() => navigate("/parent-login")} className="bg-indigo-600 hover:bg-indigo-700">
            Gal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-2xl mx-auto">
        {matchConversation ? (
          <ChatView partnerId={params!.partnerId} />
        ) : (
          <>
            <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-white/10 p-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/waalid/feed")}
                  className="text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-xl font-bold text-white">Fariimaha</h1>
              </div>
            </div>
            <ConversationList />
          </>
        )}
      </div>
    </div>
  );
}
