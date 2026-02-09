import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, ArrowLeft, User, MessageCircle, Check, CheckCheck, Flag, MoreVertical, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/useWebSocket";

interface MessageSender {
  id: string;
  name: string;
  picture: string | null;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: MessageSender | null;
  deliveredAt?: string | null;
  readAt?: string | null;
}

interface MessagesResponse {
  messages: Message[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface ChatRoomProps {
  conversationId: string;
  participantName?: string;
  participantPicture?: string | null;
  currentUserId?: string;
  onBack?: () => void;
}

export function ChatRoom({
  conversationId,
  participantName,
  participantPicture,
  currentUserId,
  onBack,
}: ChatRoomProps) {
  const [messageText, setMessageText] = useState("");
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);
  const [messagesRead, setMessagesRead] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const reportMutation = useMutation({
    mutationFn: async (data: { reason: string; description: string }) => {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reportType: "conversation",
          contentId: conversationId,
          reason: data.reason,
          description: data.description,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit report");
      return res.json();
    },
    onSuccess: () => {
      setShowReportDialog(false);
      setReportReason("");
      setReportDescription("");
    },
  });

  const handleNewMessage = useCallback((msg: { id: string; conversationId: string; senderId: string; content: string; createdAt: string }) => {
    if (msg.conversationId === conversationId && msg.senderId !== currentUserId) {
      setRealtimeMessages((prev) => [
        ...prev,
        {
          id: msg.id,
          content: msg.content,
          createdAt: msg.createdAt,
          sender: { id: msg.senderId, name: participantName || "Unknown", picture: participantPicture || null },
        },
      ]);
      // Mark incoming message as read immediately since user is viewing the chat
      fetch(`/api/conversations/${conversationId}/mark-read`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    }
  }, [conversationId, currentUserId, participantName, participantPicture]);

  const handleMessageStatus = useCallback((status: { conversationId: string; status: "delivered" | "read" }) => {
    if (status.conversationId === conversationId && status.status === "read") {
      setMessagesRead(true);
    }
  }, [conversationId]);

  const { connect, disconnect } = useWebSocket({ onMessage: handleNewMessage, onMessageStatus: handleMessageStatus });

  useEffect(() => {
    if (currentUserId) {
      connect(currentUserId);
    }
    return () => disconnect();
  }, [currentUserId, connect, disconnect]);

  const { data, isLoading, error } = useQuery<MessagesResponse>({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}/messages?limit=50`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
  });

  // Mark messages as read when entering the chat room
  useEffect(() => {
    const markAsRead = async () => {
      try {
        await fetch(`/api/conversations/${conversationId}/mark-read`, {
          method: "POST",
          credentials: "include",
        });
        // Refresh unread count after marking as read
        queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
      } catch (error) {
        console.error("Failed to mark messages as read:", error);
      }
    };
    markAsRead();
  }, [conversationId, queryClient]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setMessageText("");
      // Reset read status so new messages show single checkmark until recipient reads
      setMessagesRead(false);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  const handleSend = () => {
    if (messageText.trim() && !sendMutation.isPending) {
      sendMutation.mutate(messageText.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    setRealtimeMessages([]);
  }, [data]);

  const messages = data?.messages ? [...data.messages].reverse().concat(realtimeMessages) : realtimeMessages;

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shrink-0">
        {onBack && (
          <button 
            onClick={onBack} 
            data-testid="back-button"
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="relative">
          {participantPicture ? (
            <img
              src={participantPicture}
              alt={participantName || "User"}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white/30"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center ring-2 ring-white/30">
              <User className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-base">{participantName || "Unknown"}</h3>
          <p className="text-xs text-white/70">Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-muted-foreground mt-3 text-sm">Soo dejinaya...</p>
          </div>
        )}
        {error && (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-red-500 text-sm">Khalad ayaa dhacay</p>
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-muted-foreground text-sm">Ma jiraan fariimo</p>
            <p className="text-muted-foreground/70 text-xs mt-1">Dir fariinta kowaad!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender?.id === currentUserId;
          const isRead = messagesRead || msg.readAt;
          return (
            <div
              key={msg.id}
              data-testid={`message-${msg.id}`}
              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2.5 shadow-sm ${
                  isOwn
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md"
                    : "bg-white text-gray-800 rounded-2xl rounded-bl-md border border-gray-100"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                <div className={`flex items-center justify-end gap-1 mt-1 ${isOwn ? "text-white/60" : "text-gray-400"}`}>
                  <span className="text-[10px]">{formatMessageTime(msg.createdAt)}</span>
                  {isOwn && (
                    isRead ? (
                      <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="shrink-0 px-4 pt-3 pb-6 bg-white border-t border-gray-100 shadow-lg" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-3">
          <input
            data-testid="message-input"
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Fariintaada qor..."
            disabled={sendMutation.isPending}
            className="flex-1 px-4 py-3 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-gray-400"
          />
          <button
            data-testid="send-button"
            onClick={handleSend}
            disabled={!messageText.trim() || sendMutation.isPending}
            className="w-11 h-11 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        {sendMutation.isError && (
          <p className="text-xs text-red-500 mt-2 text-center">Fariinta lama dirin. Isku day mar kale.</p>
        )}
      </div>
    </div>
  );
}

function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("so-SO", { hour: "2-digit", minute: "2-digit" });
}
