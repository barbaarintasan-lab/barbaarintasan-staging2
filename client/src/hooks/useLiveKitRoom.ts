import { useState, useRef, useCallback, useEffect } from "react";
import {
  Room,
  RoomEvent,
  Track,
  Participant,
  RemoteParticipant,
  LocalParticipant,
  ConnectionState,
  TrackPublication,
  RemoteTrackPublication,
} from "livekit-client";

interface UseLiveKitRoomOptions {
  roomId: string;
  userId: string;
  onParticipantJoined?: (participantId: string) => void;
  onParticipantLeft?: (participantId: string) => void;
  onConnectionLost?: () => void;
  onSelfJoined?: () => void;
}

interface LiveKitTokenResponse {
  token: string;
  url: string;
  roomName: string;
  canPublish: boolean;
}

export function useLiveKitRoom(options: UseLiveKitRoomOptions) {
  const {
    roomId,
    userId,
    onParticipantJoined,
    onParticipantLeft,
    onConnectionLost,
    onSelfJoined,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const [canPublish, setCanPublish] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const updateParticipants = useCallback(() => {
    if (!roomRef.current) return;
    
    const allParticipants: string[] = [];
    roomRef.current.remoteParticipants.forEach((p) => {
      allParticipants.push(p.identity);
    });
    setParticipants(allParticipants);
  }, []);

  const handleTrackSubscribed = useCallback(
    (
      track: Track,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      if (track.kind === Track.Kind.Audio) {
        const existingAudio = audioElementsRef.current.get(participant.identity);
        if (existingAudio) {
          existingAudio.srcObject = null;
          existingAudio.remove();
        }

        const audio = document.createElement("audio");
        audio.id = `livekit-audio-${participant.identity}`;
        audio.autoplay = true;
        audio.muted = false;
        audio.volume = 1.0;
        audio.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
        
        track.attach(audio);
        document.body.appendChild(audio);
        audioElementsRef.current.set(participant.identity, audio);

        audio.play().catch((err) => {
          console.warn(`[LiveKit] Audio autoplay blocked for ${participant.identity}:`, err.message);
          const resumeAudio = () => {
            audio.muted = false;
            audio.play().catch(console.error);
            document.removeEventListener("click", resumeAudio);
            document.removeEventListener("touchstart", resumeAudio);
          };
          document.addEventListener("click", resumeAudio, { once: true });
          document.addEventListener("touchstart", resumeAudio, { once: true });
        });

        console.log(`[LiveKit] Audio track subscribed for ${participant.identity}`);
      }
    },
    []
  );

  const handleTrackUnsubscribed = useCallback(
    (track: Track, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      if (track.kind === Track.Kind.Audio) {
        const audio = audioElementsRef.current.get(participant.identity);
        if (audio) {
          track.detach(audio);
          audio.srcObject = null;
          audio.remove();
          audioElementsRef.current.delete(participant.identity);
        }
        console.log(`[LiveKit] Audio track unsubscribed for ${participant.identity}`);
      }
    },
    []
  );

  const handleActiveSpeakersChanged = useCallback((speakers: Participant[]) => {
    const speakingSet = new Set<string>();
    speakers.forEach((s) => speakingSet.add(s.identity));
    setSpeakingUsers(speakingSet);
  }, []);

  const connect = useCallback(async () => {
    if (!userId || userId.startsWith('guest-')) {
      console.log("[LiveKit] Skipping connect for unauthenticated/guest user");
      setConnectionError("Fadlan gal akoonkaaga si aad codka u maqlid");
      return;
    }

    try {
      setConnectionError(null);
      console.log(`[LiveKit] Connecting to room ${roomId}...`);

      const response = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ roomId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get LiveKit token");
      }

      const { token, url, roomName, canPublish: canPub }: LiveKitTokenResponse = await response.json();
      setCanPublish(canPub);

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        console.log(`[LiveKit] Connection state: ${state}`);
        if (state === ConnectionState.Connected) {
          setIsConnected(true);
          setIsReconnecting(false);
          setIsJoined(true);
          onSelfJoined?.();
          updateParticipants();
        } else if (state === ConnectionState.Reconnecting) {
          setIsReconnecting(true);
        } else if (state === ConnectionState.Disconnected) {
          setIsConnected(false);
          setIsJoined(false);
          onConnectionLost?.();
        }
      });

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log(`[LiveKit] Participant joined: ${participant.identity}`);
        updateParticipants();
        onParticipantJoined?.(participant.identity);
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log(`[LiveKit] Participant left: ${participant.identity}`);
        const audio = audioElementsRef.current.get(participant.identity);
        if (audio) {
          audio.srcObject = null;
          audio.remove();
          audioElementsRef.current.delete(participant.identity);
        }
        updateParticipants();
        onParticipantLeft?.(participant.identity);
      });

      room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      room.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged);

      await room.connect(url, token);
      roomRef.current = room;

      if (canPub) {
        await room.localParticipant.setMicrophoneEnabled(false);
        setIsMuted(true);
        console.log("[LiveKit] Microphone ready (muted by default)");
      }

      console.log(`[LiveKit] Connected to ${roomName} with ${room.remoteParticipants.size} participants`);
    } catch (error: any) {
      console.error("[LiveKit] Connection error:", error);
      setConnectionError(error.message);
      throw error;
    }
  }, [roomId, userId, onSelfJoined, onConnectionLost, onParticipantJoined, onParticipantLeft, updateParticipants, handleTrackSubscribed, handleTrackUnsubscribed, handleActiveSpeakersChanged]);

  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    audioElementsRef.current.forEach((audio) => {
      audio.srcObject = null;
      audio.remove();
    });
    audioElementsRef.current.clear();

    setIsConnected(false);
    setIsJoined(false);
    setIsReconnecting(false);
    setParticipants([]);
    setSpeakingUsers(new Set());
    setIsMuted(true);
    setConnectionError(null);
  }, []);

  const toggleMute = useCallback(async () => {
    if (!roomRef.current || !canPublish) return;

    const newMutedState = !isMuted;
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(!newMutedState);
      setIsMuted(newMutedState);
      console.log(`[LiveKit] Microphone ${newMutedState ? "muted" : "unmuted"}`);
    } catch (error) {
      console.error("[LiveKit] Failed to toggle mute:", error);
    }
  }, [isMuted, canPublish]);

  const raiseHand = useCallback((raised: boolean) => {
    console.log(`[LiveKit] Hand ${raised ? "raised" : "lowered"} (handled via HTTP API)`);
  }, []);

  const reconnect = useCallback(async () => {
    if (!userId || userId.startsWith('guest-')) {
      console.log("[LiveKit] Skipping reconnect for unauthenticated/guest user");
      return;
    }
    console.log("[LiveKit] Reconnecting to refresh permissions...");
    disconnect();
    await new Promise(resolve => setTimeout(resolve, 500));
    await connect();
  }, [disconnect, connect, userId]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    room: roomRef.current,
    isConnected,
    isReconnecting,
    isJoined,
    isMuted,
    isListenerOnly: !canPublish,
    participants,
    speakingUsers,
    connectionError,
    connect,
    disconnect,
    reconnect,
    toggleMute,
    raiseHand,
  };
}
