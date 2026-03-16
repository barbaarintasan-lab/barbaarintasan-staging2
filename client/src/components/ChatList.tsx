import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { User, MessageSquare } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";

interface Participant {
  id: string;
  name: string;
  picture: string | null;
  isOnline: boolean;
  lastSeen: string | null;
}

interface LastMessage {
  content: string;
  createdAt: string;
  senderId: string;
}

interface Conversation {
  id: string;
  participant: Participant | null;
  lastMessage: LastMessage | null;
  lastMessageAt: string | null;
}

interface ChatListProps {
  onSelectConversation?: (conversationId: string, participantName?: string, participantPicture?: string | null) => void;
  selectedConversationId?: string;
  currentUserId?: string;
}

export function ChatList({ onSelectConversation, selectedConversationId, currentUserId }: ChatListProps) {
  const [presenceUpdates, setPresenceUpdates] = useState<Record<string, boolean>>({});

  const handlePresence = useCallback((presence: { userId: string; isOnline: boolean }) => {
    setPresenceUpdates((prev) => ({ ...prev, [presence.userId]: presence.isOnline }));
  }, []);

  const { connect, disconnect } = useWebSocket({ onPresence: handlePresence });

  useEffect(() => {
    if (currentUserId) {
      connect(currentUserId);
    }
    return () => disconnect();
  }, [currentUserId, connect, disconnect]);

  const { data: conversations, isLoading, error } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await fetch("/api/conversations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
  });

  const getIsOnline = (conv: Conversation): boolean => {
    if (!conv.participant) return false;
    if (conv.participant.id in presenceUpdates) {
      return presenceUpdates[conv.participant.id];
    }
    return conv.participant.isOnline;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-muted-foreground mt-4 text-sm">Soo dejinaya...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-3">
          <MessageSquare className="w-7 h-7 text-red-500" />
        </div>
        <p className="text-red-500 text-sm">Khalad ayaa dhacay</p>
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center mb-4">
          <MessageSquare className="w-10 h-10 text-blue-500" />
        </div>
        <h3 className="font-semibold text-gray-800 mb-1">Ma jiraan wada hadallo</h3>
        <p className="text-sm text-muted-foreground text-center">La hadal macalimiinta iyo waalidiinta kale</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {conversations.map((conv) => {
        const isOnline = getIsOnline(conv);
        return (
          <div
            key={conv.id}
            data-testid={`chat-item-${conv.id}`}
            onClick={() => onSelectConversation?.(conv.id, conv.participant?.name, conv.participant?.picture)}
            className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-blue-50/50 transition-all active:bg-blue-100/50 ${
              selectedConversationId === conv.id ? "bg-blue-50" : ""
            }`}
          >
            <div className="relative flex-shrink-0">
              {conv.participant?.picture ? (
                <img
                  src={conv.participant.picture}
                  alt={conv.participant.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-500" />
                </div>
              )}
              <span
                data-testid={`status-indicator-${conv.id}`}
                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${
                  isOnline ? "bg-green-500" : "bg-gray-300"
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold text-gray-800 truncate">
                  {conv.participant?.name || "Unknown"}
                </span>
                {conv.lastMessage && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatTime(conv.lastMessage.createdAt)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${isOnline ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                  {isOnline ? "Online" : "Offline"}
                </span>
                {conv.lastMessage && (
                  <p className="text-sm text-muted-foreground truncate flex-1">
                    {conv.lastMessage.content}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Hadda";
  if (diffMins < 60) return `${diffMins}d`;
  if (diffHours < 24) return `${diffHours}s`;
  if (diffDays < 7) return `${diffDays}m`;
  return date.toLocaleDateString("so-SO");
}
