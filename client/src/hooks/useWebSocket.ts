import { useState, useRef, useCallback, useEffect } from "react";

interface NewMessageEvent {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface PresenceUpdateEvent {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}

interface VoiceRoomUpdateEvent {
  id: string;
  event?: string;
  participants?: any[];
  participantCount?: number;
  speakerCount?: number;
  targetParentId?: string;
  newRole?: string;
  forceMute?: boolean;
}

interface VoiceReactionEvent {
  roomId: string;
  senderId: string;
  emoji: string;
  senderName: string;
  timestamp: string;
}

interface VoiceAppreciationEvent {
  roomId: string;
  receiverId: string;
  points: number;
  emojiType: 'heart' | 'clap';
  giverName: string;
  timestamp: string;
}

interface MessageStatusEvent {
  messageId: string;
  conversationId: string;
  status: "delivered" | "read";
  timestamp: string;
}

interface UseWebSocketOptions {
  onMessage?: (message: NewMessageEvent) => void;
  onPresence?: (presence: PresenceUpdateEvent) => void;
  onVoiceRoomUpdate?: (update: VoiceRoomUpdateEvent) => void;
  onMessageStatus?: (status: MessageStatusEvent) => void;
  onReaction?: (reaction: VoiceReactionEvent) => void;
  onAppreciation?: (appreciation: VoiceAppreciationEvent) => void;
  autoReconnect?: boolean;
}

const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const optionsRef = useRef(options);
  const userIdRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const manualDisconnectRef = useRef(false);
  optionsRef.current = options;

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (manualDisconnectRef.current || !userIdRef.current) return;
    if (optionsRef.current.autoReconnect === false) return;

    setIsReconnecting(true);
    clearReconnectTimeout();

    reconnectTimeoutRef.current = setTimeout(() => {
      if (userIdRef.current && !manualDisconnectRef.current) {
        reconnectDelayRef.current = Math.min(
          reconnectDelayRef.current * 2,
          MAX_RECONNECT_DELAY
        );
        connectInternal(userIdRef.current);
      }
    }, reconnectDelayRef.current);
  }, []);

  const connectInternal = useCallback((userId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws?userId=${userId}`);

    ws.onopen = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      wsRef.current = null;
      
      if (!manualDisconnectRef.current && !event.wasClean) {
        scheduleReconnect();
      }
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "new_message" && optionsRef.current.onMessage) {
          optionsRef.current.onMessage(data.payload);
        }
        
        if (data.type === "presence_update" && optionsRef.current.onPresence) {
          optionsRef.current.onPresence(data.payload);
        }

        if (data.type === "voice-room-update" && optionsRef.current.onVoiceRoomUpdate) {
          optionsRef.current.onVoiceRoomUpdate(data.room);
        }

        if (data.type === "message_status" && optionsRef.current.onMessageStatus) {
          optionsRef.current.onMessageStatus(data);
        }

        if (data.type === "voice-reaction" && optionsRef.current.onReaction) {
          optionsRef.current.onReaction(data);
        }

        if (data.type === "voice-appreciation" && optionsRef.current.onAppreciation) {
          optionsRef.current.onAppreciation(data);
        }
      } catch {
        // Ignore parse errors
      }
    };

    wsRef.current = ws;
  }, [scheduleReconnect]);

  const connect = useCallback((userId: string) => {
    manualDisconnectRef.current = false;
    userIdRef.current = userId;
    connectInternal(userId);
  }, [connectInternal]);

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    clearReconnectTimeout();
    setIsReconnecting(false);
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }
  }, [clearReconnectTimeout]);

  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && userIdRef.current && !manualDisconnectRef.current) {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
          connectInternal(userIdRef.current);
        }
      }
    };

    const handleOnline = () => {
      if (userIdRef.current && !manualDisconnectRef.current) {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
          connectInternal(userIdRef.current);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      clearReconnectTimeout();
    };
  }, [connectInternal, clearReconnectTimeout]);

  return { isConnected, isReconnecting, connect, disconnect, send };
}
