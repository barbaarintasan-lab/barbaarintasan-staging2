import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { db } from "../db";
import { userPresence, voiceParticipants, voiceRooms } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
  currentRoomId?: string; // Voice room the user is in
}

interface NewMessagePayload {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

// Voice signaling types
interface VoiceSignal {
  type: "offer" | "answer" | "ice-candidate" | "join-room" | "leave-room" | "hand-raise" | "mute-toggle" | "role-change" | "room-status";
  roomId: string;
  senderId: string;
  targetId?: string;
  payload?: any;
}

const connectedUsers = new Map<string, Set<AuthenticatedWebSocket>>();
const voiceRoomParticipants = new Map<string, Set<AuthenticatedWebSocket>>(); // roomId -> participants
let wssInstance: WebSocketServer | null = null;

// Grace period for disconnected users (2 minutes)
const VOICE_ROOM_GRACE_PERIOD_MS = 2 * 60 * 1000;
// Tracks users in grace period: key = `userId:roomId`, value = { roomId, timeout, userId }
const pendingDisconnects = new Map<string, { roomId: string; timeout: NodeJS.Timeout; userId: string }>();
// Virtual participants during grace period - they should still be counted even though socket is closed
const gracePeriodParticipants = new Map<string, Set<string>>(); // roomId -> Set of userIds in grace period

export function initializeWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  wssInstance = wss;

  wss.on("connection", async (ws: AuthenticatedWebSocket, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      ws.close(4001, "userId required");
      return;
    }

    ws.userId = userId;
    ws.isAlive = true;

    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId)!.add(ws);

    await setUserOnline(userId, true);
    broadcastPresence(userId, true, wss);

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("close", async () => {
      const userSockets = connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(ws);
        if (userSockets.size === 0) {
          connectedUsers.delete(userId);
          await setUserOnline(userId, false);
          broadcastPresence(userId, false, wss);
        }
      }
      
      // Handle voice room grace period - don't immediately remove participant
      if (ws.currentRoomId) {
        const roomId = ws.currentRoomId;
        const pendingKey = `${userId}:${roomId}`;
        
        // Remove this socket from room participants
        const room = voiceRoomParticipants.get(roomId);
        if (room) {
          room.delete(ws);
        }
        
        // Only set up grace period if user has no other sockets in the room
        const hasOtherSocketInRoom = room && Array.from(room).some(s => s.userId === userId);
        
        if (!hasOtherSocketInRoom) {
          // Add user to grace period participants (they're still counted as "in room")
          if (!gracePeriodParticipants.has(roomId)) {
            gracePeriodParticipants.set(roomId, new Set());
          }
          gracePeriodParticipants.get(roomId)!.add(userId);
          
          // Start grace period - user has 2 minutes to reconnect
          const timeout = setTimeout(() => {
            pendingDisconnects.delete(pendingKey);
            
            // Remove from grace period participants
            const graceSet = gracePeriodParticipants.get(roomId);
            if (graceSet) {
              graceSet.delete(userId);
              if (graceSet.size === 0) {
                gracePeriodParticipants.delete(roomId);
              }
            }
            
            // Broadcast that user has left (after grace period expired)
            broadcastToRoom(roomId, {
              type: "voice",
              signal: {
                type: "participant-left",
                roomId,
                senderId: userId,
                payload: { userId, reason: "grace-period-expired" }
              }
            });
          }, VOICE_ROOM_GRACE_PERIOD_MS);
          
          pendingDisconnects.set(pendingKey, { roomId, timeout, userId });
        }
      }
    });

    ws.on("error", (error) => {
      console.error(`WebSocket error for user ${userId}:`, error.message);
    });

    // Handle incoming messages for voice signaling
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle voice room signaling
        if (message.type === "voice") {
          handleVoiceSignal(ws, message.signal, wss);
        }
        
        // Handle reactions (TikTok-style floating emojis)
        if (message.type === "reaction" && message.roomId && message.emoji) {
          broadcastReaction(message.roomId, ws.userId || "", message.emoji, message.senderName);
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  console.log("WebSocket server initialized on /ws");
  return wss;
}

async function setUserOnline(userId: string, isOnline: boolean) {
  try {
    await db
      .insert(userPresence)
      .values({
        userId,
        isOnline,
        lastSeen: new Date(),
      })
      .onConflictDoUpdate({
        target: userPresence.userId,
        set: {
          isOnline,
          lastSeen: new Date(),
        },
      });
  } catch (error) {
    console.error(`Failed to update presence for ${userId}:`, error);
  }
}

function broadcastPresence(userId: string, isOnline: boolean, wss: WebSocketServer) {
  const message = JSON.stringify({
    type: "presence",
    userId,
    isOnline,
    timestamp: new Date().toISOString(),
  });

  wss.clients.forEach((client: AuthenticatedWebSocket) => {
    if (client.readyState === WebSocket.OPEN && client.userId !== userId) {
      client.send(message);
    }
  });
}

export function getOnlineUsers(): string[] {
  return Array.from(connectedUsers.keys());
}

export function broadcastNewMessage(recipientIds: string[], message: NewMessagePayload) {
  if (!wssInstance) {
    console.error("WebSocket server not initialized");
    return;
  }

  const payload = JSON.stringify({
    type: "new_message",
    ...message,
  });

  recipientIds.forEach((recipientId) => {
    const sockets = connectedUsers.get(recipientId);
    if (sockets) {
      sockets.forEach((socket) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(payload);
        }
      });
    }
  });
}

// Broadcast message status updates (delivered, read)
interface MessageStatusPayload {
  messageId: string;
  conversationId: string;
  status: "delivered" | "read";
  timestamp: string;
}

export function broadcastMessageStatus(recipientId: string, status: MessageStatusPayload) {
  if (!wssInstance) {
    return;
  }

  const payload = JSON.stringify({
    type: "message_status",
    ...status,
  });

  const sockets = connectedUsers.get(recipientId);
  if (sockets) {
    sockets.forEach((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
      }
    });
  }
}

// ============================================
// BSAv.1 SHEEKO - VOICE SIGNALING
// ============================================

function handleVoiceSignal(ws: AuthenticatedWebSocket, signal: VoiceSignal, wss: WebSocketServer) {
  const { type, roomId, senderId, targetId, payload } = signal;
  
  console.log(`[Voice] Signal received: ${type} from ${ws.userId} in room ${roomId}${targetId ? ` to ${targetId}` : ''}`);

  switch (type) {
    case "join-room":
      joinVoiceRoom(ws, roomId);
      break;
    case "leave-room":
      leaveVoiceRoom(ws, roomId);
      break;
    case "offer":
    case "answer":
    case "ice-candidate":
      // Forward WebRTC signaling to specific peer
      if (targetId) {
        console.log(`[Voice] Forwarding ${type} from ${ws.userId} to ${targetId}`);
        sendToUser(targetId, {
          type: "voice",
          signal: { type, roomId, senderId: ws.userId, payload }
        });
      }
      break;
    case "hand-raise":
    case "mute-toggle":
    case "role-change":
    case "room-status":
      // Broadcast to all room participants
      broadcastToRoom(roomId, {
        type: "voice",
        signal: { type, roomId, senderId: ws.userId, payload }
      }, ws.userId);
      break;
  }
}

function joinVoiceRoom(ws: AuthenticatedWebSocket, roomId: string) {
  if (ws.currentRoomId && ws.currentRoomId !== roomId) {
    leaveVoiceRoom(ws, ws.currentRoomId);
  }

  // Cancel any pending disconnect timeout for this user in this room (grace period reconnection)
  const pendingKey = `${ws.userId}:${roomId}`;
  const pendingDisconnect = pendingDisconnects.get(pendingKey);
  const wasInGracePeriod = !!pendingDisconnect;
  if (pendingDisconnect) {
    clearTimeout(pendingDisconnect.timeout);
    pendingDisconnects.delete(pendingKey);
    
    // Remove from grace period participants since they're now properly connected
    const graceSet = gracePeriodParticipants.get(roomId);
    if (graceSet) {
      graceSet.delete(ws.userId!);
      if (graceSet.size === 0) {
        gracePeriodParticipants.delete(roomId);
      }
    }
    
    console.log(`User ${ws.userId} reconnected within grace period to room ${roomId}`);
  }

  ws.currentRoomId = roomId;
  
  if (!voiceRoomParticipants.has(roomId)) {
    voiceRoomParticipants.set(roomId, new Set());
  }
  voiceRoomParticipants.get(roomId)!.add(ws);

  // Notify existing participants about new joiner
  const existingParticipants: string[] = [];
  voiceRoomParticipants.get(roomId)!.forEach((participant) => {
    if (participant.userId !== ws.userId && participant.userId) {
      existingParticipants.push(participant.userId);
    }
  });

  // Send list of existing participants to the new joiner
  ws.send(JSON.stringify({
    type: "voice",
    signal: {
      type: "room-participants",
      roomId,
      payload: { participants: existingParticipants }
    }
  }));

  // Always notify others about joins (including grace period reconnects)
  // Grace period reconnects need this so peers can re-establish WebRTC connections
  broadcastToRoom(roomId, {
    type: "voice",
    signal: {
      type: "participant-joined",
      roomId,
      senderId: ws.userId,
      payload: { userId: ws.userId, isReconnect: wasInGracePeriod }
    }
  }, ws.userId);
}

function leaveVoiceRoom(ws: AuthenticatedWebSocket, roomId: string) {
  // Clear any pending disconnect timeout (user explicitly leaving)
  const pendingKey = `${ws.userId}:${roomId}`;
  const pendingDisconnect = pendingDisconnects.get(pendingKey);
  if (pendingDisconnect) {
    clearTimeout(pendingDisconnect.timeout);
    pendingDisconnects.delete(pendingKey);
  }
  
  // Remove from grace period participants
  const graceSet = gracePeriodParticipants.get(roomId);
  if (graceSet) {
    graceSet.delete(ws.userId!);
    if (graceSet.size === 0) {
      gracePeriodParticipants.delete(roomId);
    }
  }

  const room = voiceRoomParticipants.get(roomId);
  if (room) {
    room.delete(ws);
    if (room.size === 0) {
      voiceRoomParticipants.delete(roomId);
    }
    
    // Check if user has no other sockets in the room and not in grace period
    const hasOtherSocketInRoom = Array.from(room).some(s => s.userId === ws.userId);
    const isInGracePeriod = gracePeriodParticipants.get(roomId)?.has(ws.userId!) || false;
    
    if (!hasOtherSocketInRoom && !isInGracePeriod) {
      // Notify others that someone left
      broadcastToRoom(roomId, {
        type: "voice",
        signal: {
          type: "participant-left",
          roomId,
          senderId: ws.userId,
          payload: { userId: ws.userId }
        }
      });
    }
  }
  ws.currentRoomId = undefined;
}

function broadcastToRoom(roomId: string, message: any, excludeUserId?: string) {
  const room = voiceRoomParticipants.get(roomId);
  if (!room) return;

  const payload = JSON.stringify(message);
  room.forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN && socket.userId !== excludeUserId) {
      socket.send(payload);
    }
  });
}

function sendToUser(userId: string, message: any) {
  const sockets = connectedUsers.get(userId);
  if (!sockets) return;

  const payload = JSON.stringify(message);
  sockets.forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  });
}

// Broadcast voice room status updates to all connected users
export function broadcastVoiceRoomUpdate(room: any) {
  if (!wssInstance) return;

  const payload = JSON.stringify({
    type: "voice-room-update",
    room
  });

  wssInstance.clients.forEach((client: AuthenticatedWebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Broadcast reactions (TikTok-style floating emojis) to all room participants
// Uses connectedUsers to reach ALL sockets (including useWebSocket connections, not just useVoiceRoom)
function broadcastReaction(roomId: string, senderId: string, emoji: string, senderName?: string) {
  // Get list of userIds in the room from voiceRoomParticipants
  const roomSockets = voiceRoomParticipants.get(roomId);
  if (!roomSockets || roomSockets.size === 0) return;
  
  // Collect unique userIds from the voice room
  const userIdsInRoom = new Set<string>();
  roomSockets.forEach(socket => {
    if (socket.userId) userIdsInRoom.add(socket.userId);
  });
  
  // Also include grace period participants
  const graceSet = gracePeriodParticipants.get(roomId);
  if (graceSet) {
    graceSet.forEach(userId => userIdsInRoom.add(userId));
  }

  const payload = JSON.stringify({
    type: "voice-reaction",
    roomId,
    senderId,
    emoji,
    senderName: senderName || "Someone",
    timestamp: new Date().toISOString()
  });

  // Send to ALL sockets of each user in the room (from connectedUsers, not just voiceRoomParticipants)
  userIdsInRoom.forEach(userId => {
    const userSockets = connectedUsers.get(userId);
    if (userSockets) {
      userSockets.forEach(socket => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(payload);
        }
      });
    }
  });
}

// Broadcast appreciation points to all room participants
export function broadcastAppreciation(
  roomId: string, 
  receiverId: string, 
  points: number, 
  emojiType: 'heart' | 'clap',
  giverName?: string
) {
  const roomSockets = voiceRoomParticipants.get(roomId);
  if (!roomSockets || roomSockets.size === 0) return;
  
  const userIdsInRoom = new Set<string>();
  roomSockets.forEach(socket => {
    if (socket.userId) userIdsInRoom.add(socket.userId);
  });
  
  const graceSet = gracePeriodParticipants.get(roomId);
  if (graceSet) {
    graceSet.forEach(userId => userIdsInRoom.add(userId));
  }

  const payload = JSON.stringify({
    type: "voice-appreciation",
    roomId,
    receiverId,
    points,
    emojiType,
    giverName: giverName || "Someone",
    timestamp: new Date().toISOString()
  });

  userIdsInRoom.forEach(userId => {
    const userSockets = connectedUsers.get(userId);
    if (userSockets) {
      userSockets.forEach(socket => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(payload);
        }
      });
    }
  });
}

// Get number of participants in a voice room (including those in grace period)
export function getVoiceRoomParticipantCount(roomId: string): number {
  const activeCount = voiceRoomParticipants.get(roomId)?.size || 0;
  const graceCount = gracePeriodParticipants.get(roomId)?.size || 0;
  return activeCount + graceCount;
}

// Get list of user IDs in a voice room (including those in grace period)
export function getVoiceRoomParticipantIds(roomId: string): string[] {
  const userIds = new Set<string>();
  
  const room = voiceRoomParticipants.get(roomId);
  if (room) {
    room.forEach(socket => {
      if (socket.userId) userIds.add(socket.userId);
    });
  }
  
  const graceSet = gracePeriodParticipants.get(roomId);
  if (graceSet) {
    graceSet.forEach(userId => userIds.add(userId));
  }
  
  return Array.from(userIds);
}
