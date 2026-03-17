import { useState, useRef, useCallback, useEffect } from "react";

interface VoiceSignal {
  type: string;
  roomId: string;
  senderId?: string;
  targetId?: string;
  payload?: any;
}

interface PeerConnection {
  userId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

interface UseVoiceRoomOptions {
  roomId: string;
  userId: string;
  isListenerOnly?: boolean;
  onParticipantJoined?: (userId: string) => void;
  onParticipantLeft?: (userId: string) => void;
  onConnectionLost?: () => void;
  onSelfJoined?: () => void;
}

// Default STUN servers - TURN will be fetched from API if configured
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
];

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 15000;

export function useVoiceRoom(options: UseVoiceRoomOptions) {
  const { roomId, userId, isListenerOnly = false, onParticipantJoined, onParticipantLeft, onConnectionLost, onSelfJoined } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const manualDisconnectRef = useRef(false);
  const savedMuteStateRef = useRef(true);
  const iceServersRef = useRef<RTCIceServer[]>(DEFAULT_ICE_SERVERS);
  const iceServersFetchedRef = useRef(false);
  const iceServersFetchPromiseRef = useRef<Promise<void> | null>(null);

  // Fetch ICE servers from API (includes TURN credentials if configured)
  const fetchIceServers = useCallback(async (): Promise<void> => {
    // Return existing promise if fetch is in progress
    if (iceServersFetchPromiseRef.current) {
      return iceServersFetchPromiseRef.current;
    }
    
    // Skip if already fetched
    if (iceServersFetchedRef.current) {
      return;
    }
    
    const fetchPromise = (async () => {
      try {
        const res = await fetch('/api/ice-servers');
        if (res.ok) {
          const data = await res.json();
          if (data.iceServers && data.iceServers.length > 0) {
            iceServersRef.current = data.iceServers;
            const hasTurn = data.iceServers.some((s: RTCIceServer) => 
              Array.isArray(s.urls) 
                ? s.urls.some(u => u.startsWith('turn'))
                : String(s.urls).startsWith('turn')
            );
            console.log(`[VoiceRoom] ICE servers loaded: ${data.iceServers.length} servers${hasTurn ? ' (TURN enabled)' : ''}`);
          }
        }
      } catch (error) {
        console.warn('[VoiceRoom] Failed to fetch ICE servers, using defaults:', error);
      } finally {
        iceServersFetchedRef.current = true;
        iceServersFetchPromiseRef.current = null;
      }
    })();
    
    iceServersFetchPromiseRef.current = fetchPromise;
    return fetchPromise;
  }, []);

  const sendSignal = useCallback((signal: VoiceSignal) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log(`[VoiceRoom] Sending signal: ${signal.type}${signal.targetId ? ` to ${signal.targetId}` : ''}`);
      wsRef.current.send(JSON.stringify({ type: "voice", signal }));
    } else {
      console.warn(`[VoiceRoom] Cannot send signal: WebSocket not open (state: ${wsRef.current?.readyState})`);
    }
  }, []);

  const createPeerConnection = useCallback(async (targetUserId: string, initiator: boolean) => {
    console.log(`[VoiceRoom] Creating peer connection to ${targetUserId}, initiator=${initiator}, isListenerOnly=${isListenerOnly}`);
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });

    // For listener-only mode, add a receive-only audio transceiver
    if (isListenerOnly) {
      console.log(`[VoiceRoom] Adding recvonly transceiver for ${targetUserId}`);
      pc.addTransceiver("audio", { direction: "recvonly" });
    } else if (localStreamRef.current) {
      // Add local stream tracks for speakers
      console.log(`[VoiceRoom] Adding ${localStreamRef.current.getTracks().length} local tracks for ${targetUserId}`);
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    } else {
      console.warn(`[VoiceRoom] ⚠️ No local stream available for peer ${targetUserId}`);
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: "ice-candidate",
          roomId,
          senderId: userId,
          targetId: targetUserId,
          payload: event.candidate,
        });
      }
    };

    // Handle incoming streams
    pc.ontrack = (event) => {
      console.log(`[VoiceRoom] ontrack fired for ${targetUserId}:`, {
        streamsCount: event.streams.length,
        trackKind: event.track.kind,
        trackState: event.track.readyState,
        trackEnabled: event.track.enabled,
        trackMuted: event.track.muted
      });
      
      if (!event.streams.length) {
        console.warn(`[VoiceRoom] ⚠️ No streams in ontrack event for ${targetUserId}`);
        return;
      }
      
      const [stream] = event.streams;
      const peer = peersRef.current.get(targetUserId);
      if (!peer) {
        console.warn(`[VoiceRoom] ⚠️ No peer found for ${targetUserId} in ontrack handler`);
        return;
      }
      
      peer.stream = stream;
      
      // Remove existing audio element if any
      const existingAudio = audioElementsRef.current.get(targetUserId);
      if (existingAudio) {
        existingAudio.srcObject = null;
        existingAudio.remove();
        audioElementsRef.current.delete(targetUserId);
      }
      
      // Create audio element and attach to DOM for browser compatibility
      const audio = document.createElement('audio');
      audio.id = `audio-${targetUserId}`;
      audio.srcObject = stream;
      audio.autoplay = true;
      audio.muted = false;
      audio.defaultMuted = false;
      audio.volume = 1.0;
      (audio as any).playsInline = true;
      audio.setAttribute('playsinline', '');
      audio.setAttribute('webkit-playsinline', '');
      audio.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
      document.body.appendChild(audio);
      audioElementsRef.current.set(targetUserId, audio);
      
      console.log(`[VoiceRoom] Audio element created for peer ${targetUserId}, stream active: ${stream.active}, tracks: ${stream.getAudioTracks().length}`);
      
      // Play audio - user interaction from join button should satisfy autoplay policy
      audio.play().then(() => {
        console.log(`[VoiceRoom] ✅ Playing audio for peer ${targetUserId}`);
      }).catch((err) => {
        console.warn(`[VoiceRoom] ⚠️ Audio autoplay blocked for ${targetUserId}:`, err.message);
        // Set up fallback for next user interaction
        const resumeAudio = () => {
          audio.muted = false;
          audio.play().then(() => {
            console.log(`[VoiceRoom] ✅ Audio resumed after user interaction for ${targetUserId}`);
          }).catch(console.error);
          document.removeEventListener('click', resumeAudio);
          document.removeEventListener('touchstart', resumeAudio);
        };
        document.addEventListener('click', resumeAudio, { once: true });
        document.addEventListener('touchstart', resumeAudio, { once: true });
      });

      // Set up audio analysis for speaking detection
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const analyser = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyser);
      analyzersRef.current.set(targetUserId, analyser);
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[VoiceRoom] ICE connection state for ${targetUserId}: ${pc.iceConnectionState}`);
    };
    
    pc.onicegatheringstatechange = () => {
      console.log(`[VoiceRoom] ICE gathering state for ${targetUserId}: ${pc.iceGatheringState}`);
    };
    
    pc.onsignalingstatechange = () => {
      console.log(`[VoiceRoom] Signaling state for ${targetUserId}: ${pc.signalingState}`);
    };

    pc.onconnectionstatechange = () => {
      console.log(`[VoiceRoom] Connection state for ${targetUserId}: ${pc.connectionState}`);
      // When connection fails, close and remove the RTCPeerConnection but keep user in participants list
      // This allows for grace period reconnections - new offer will create fresh connection
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        console.log(`WebRTC connection ${pc.connectionState} for peer ${targetUserId}, cleaning up connection`);
        // Close and remove the peer connection (but NOT from participants array)
        // A new connection will be created when they reconnect and send a new offer
        const peer = peersRef.current.get(targetUserId);
        if (peer) {
          peer.connection.close();
          peersRef.current.delete(targetUserId);
          analyzersRef.current.delete(targetUserId);
        }
      }
    };

    peersRef.current.set(targetUserId, { userId: targetUserId, connection: pc });

    if (initiator) {
      console.log(`[VoiceRoom] Creating and sending offer to ${targetUserId}`);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal({
        type: "offer",
        roomId,
        senderId: userId,
        targetId: targetUserId,
        payload: offer,
      });
    }

    return pc;
  }, [roomId, userId, isListenerOnly, sendSignal]);

  const removePeer = useCallback((targetUserId: string) => {
    const peer = peersRef.current.get(targetUserId);
    if (peer) {
      peer.connection.close();
      peersRef.current.delete(targetUserId);
      analyzersRef.current.delete(targetUserId);
      
      // Clean up audio element
      const audio = audioElementsRef.current.get(targetUserId);
      if (audio) {
        audio.srcObject = null;
        audio.remove();
        audioElementsRef.current.delete(targetUserId);
      }
      
      setParticipants((prev) => prev.filter((id) => id !== targetUserId));
      onParticipantLeft?.(targetUserId);
    }
  }, [onParticipantLeft]);

  const handleSignal = useCallback(async (signal: VoiceSignal) => {
    switch (signal.type) {
      case "room-participants": {
        const { participants: existingParticipants } = signal.payload;
        console.log(`[VoiceRoom] Received room-participants: ${existingParticipants.length} existing participants`, existingParticipants);
        setParticipants(existingParticipants);
        // Notify that self has joined (or reconnected)
        onSelfJoined?.();
        // Create peer connections to all existing participants
        for (const participantId of existingParticipants) {
          if (!peersRef.current.has(participantId)) {
            console.log(`[VoiceRoom] Creating peer connection to existing participant ${participantId}`);
            await createPeerConnection(participantId, true);
          }
        }
        break;
      }

      case "participant-joined": {
        const { userId: joinedUserId } = signal.payload;
        if (joinedUserId !== userId) {
          // Deduplicate participants array
          setParticipants((prev) => {
            if (prev.includes(joinedUserId)) return prev;
            return [...prev, joinedUserId];
          });
          
          // Don't create peer connection here - wait for the joiner to send an offer
          // This prevents WebRTC glare where both sides try to send offers simultaneously
          // The joiner will initiate via "room-participants" handler
          
          onParticipantJoined?.(joinedUserId);
        }
        break;
      }

      case "participant-left": {
        const { userId: leftUserId } = signal.payload;
        removePeer(leftUserId);
        break;
      }

      case "offer": {
        const senderId = signal.senderId!;
        console.log(`[VoiceRoom] Received offer from ${senderId}`);
        let pc = peersRef.current.get(senderId)?.connection;
        if (!pc) {
          pc = await createPeerConnection(senderId, false);
        }
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log(`[VoiceRoom] Sending answer to ${senderId}`);
          sendSignal({
            type: "answer",
            roomId,
            senderId: userId,
            targetId: senderId,
            payload: answer,
          });
        } catch (err) {
          console.error(`[VoiceRoom] Error handling offer from ${senderId}:`, err);
        }
        break;
      }

      case "answer": {
        const senderId = signal.senderId!;
        console.log(`[VoiceRoom] Received answer from ${senderId}`);
        const pc = peersRef.current.get(senderId)?.connection;
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
            console.log(`[VoiceRoom] Answer applied for ${senderId}`);
          } catch (err) {
            console.error(`[VoiceRoom] Error applying answer from ${senderId}:`, err);
          }
        }
        break;
      }

      case "ice-candidate": {
        const senderId = signal.senderId!;
        const pc = peersRef.current.get(senderId)?.connection;
        if (pc && signal.payload) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
          } catch (err) {
            console.error(`[VoiceRoom] Error adding ICE candidate:`, err);
          }
        }
        break;
      }
    }
  }, [userId, roomId, createPeerConnection, removePeer, sendSignal, onParticipantJoined, onSelfJoined]);

  const scheduleReconnect = useCallback(() => {
    if (manualDisconnectRef.current) return;
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.log("Max reconnection attempts reached");
      setIsReconnecting(false);
      onConnectionLost?.();
      return;
    }

    setIsReconnecting(true);
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
      MAX_RECONNECT_DELAY
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      connectInternal(true);
    }, delay);
  }, [onConnectionLost]);

  const connectInternal = useCallback(async (isReconnect = false) => {
    try {
      console.log(`[VoiceRoom] Connecting... isReconnect=${isReconnect}, isListenerOnly=${isListenerOnly}`);
      
      // Fetch ICE servers (including TURN credentials) before connecting
      await fetchIceServers();
      
      if (!isReconnect || !localStreamRef.current) {
        if (!isListenerOnly) {
          console.log('[VoiceRoom] Requesting microphone access...');
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          localStreamRef.current = stream;
          console.log(`[VoiceRoom] ✅ Got microphone access, ${stream.getAudioTracks().length} audio tracks`);
          
          stream.getAudioTracks().forEach((track) => {
            track.enabled = !savedMuteStateRef.current;
          });
        } else {
          console.log('[VoiceRoom] Listener mode - skipping mic request');
        }
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      console.log(`[VoiceRoom] Connecting WebSocket to ${protocol}//${window.location.host}/ws?userId=${userId}`);
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws?userId=${userId}`);

      ws.onopen = () => {
        console.log('[VoiceRoom] ✅ WebSocket connected');
        setIsConnected(true);
        setIsReconnecting(false);
        reconnectAttemptsRef.current = 0;
        wsRef.current = ws;
        console.log(`[VoiceRoom] Sending join-room signal for room ${roomId}`);
        sendSignal({ type: "join-room", roomId, senderId: userId });
        setIsJoined(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "voice") {
            console.log(`[VoiceRoom] Received signal: ${data.signal.type}${data.signal.senderId ? ` from ${data.signal.senderId}` : ''}`);
            handleSignal(data.signal);
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        setIsJoined(false);
        wsRef.current = null;
        
        if (!manualDisconnectRef.current && !event.wasClean) {
          scheduleReconnect();
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error("Failed to connect to voice room:", error);
      if (!manualDisconnectRef.current) {
        scheduleReconnect();
      }
      throw error;
    }
  }, [roomId, userId, isListenerOnly, sendSignal, handleSignal, scheduleReconnect, fetchIceServers]);

  const connect = useCallback(async () => {
    manualDisconnectRef.current = false;
    reconnectAttemptsRef.current = 0;
    await connectInternal(false);
  }, [connectInternal]);

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendSignal({ type: "leave-room", roomId, senderId: userId });
    }

    peersRef.current.forEach((peer) => {
      peer.connection.close();
    });
    peersRef.current.clear();
    
    // Clean up all audio elements
    audioElementsRef.current.forEach((audio) => {
      audio.srcObject = null;
      audio.remove();
    });
    audioElementsRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsConnected(false);
    setIsReconnecting(false);
    setIsJoined(false);
    setParticipants([]);
  }, [roomId, userId, sendSignal]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMuteState = !audioTrack.enabled;
        setIsMuted(newMuteState);
        savedMuteStateRef.current = newMuteState;
        
        sendSignal({
          type: "mute-toggle",
          roomId,
          senderId: userId,
          payload: { isMuted: newMuteState },
        });
      }
    }
  }, [roomId, userId, sendSignal]);

  const raiseHand = useCallback((raised: boolean) => {
    sendSignal({
      type: "hand-raise",
      roomId,
      senderId: userId,
      payload: { handRaised: raised },
    });
  }, [roomId, userId, sendSignal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isReconnecting,
    isJoined,
    isMuted,
    isListenerOnly,
    participants,
    speakingUsers,
    connect,
    disconnect,
    toggleMute,
    raiseHand,
  };
}
