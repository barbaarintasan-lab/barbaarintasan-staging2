import { useState, useRef, useCallback, useEffect } from "react";
import { Room, RoomEvent, Track, RemoteTrackPublication, RemoteParticipant, LocalTrack } from "livekit-client";

interface UseLiveKitRecordingOptions {
  room: Room | null;
  onRecordingComplete?: (blob: Blob, duration: number) => void;
  onError?: (error: Error) => void;
}

interface UseLiveKitRecordingReturn {
  isRecording: boolean;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  error: string | null;
}

export function useLiveKitRecording({
  room,
  onRecordingComplete,
  onError,
}: UseLiveKitRecordingOptions): UseLiveKitRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sourceNodesRef = useRef<Map<string, MediaStreamAudioSourceNode>>(new Map());
  const isRecordingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const roomRef = useRef<Room | null>(null);
  const handlersRef = useRef<{
    trackSubscribed: ((track: Track, publication: RemoteTrackPublication, participant: RemoteParticipant) => void) | null;
    trackUnsubscribed: ((track: Track, publication: RemoteTrackPublication, participant: RemoteParticipant) => void) | null;
    localTrackPublished: ((publication: any, participant: any) => void) | null;
    localTrackUnpublished: ((publication: any, participant: any) => void) | null;
  }>({ trackSubscribed: null, trackUnsubscribed: null, localTrackPublished: null, localTrackUnpublished: null });
  const mimeTypeRef = useRef<string>('audio/webm');
  const onRecordingCompleteRef = useRef(onRecordingComplete);
  
  // Keep callback ref updated
  useEffect(() => {
    onRecordingCompleteRef.current = onRecordingComplete;
  }, [onRecordingComplete]);

  const addTrackToMix = useCallback((trackId: string, mediaStreamTrack: MediaStreamTrack) => {
    if (!audioContextRef.current || !destinationRef.current || !isRecordingRef.current) {
      console.warn(`[Recording] Cannot add track ${trackId}: no active recording context`);
      return;
    }
    
    if (sourceNodesRef.current.has(trackId)) {
      return;
    }

    try {
      const stream = new MediaStream([mediaStreamTrack]);
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(destinationRef.current);
      sourceNodesRef.current.set(trackId, source);
    } catch (e) {
      console.warn(`[Recording] Failed to add track ${trackId}:`, e);
    }
  }, []);

  const removeTrackFromMix = useCallback((trackId: string) => {
    const source = sourceNodesRef.current.get(trackId);
    if (source) {
      try { source.disconnect(); } catch (e) {}
      sourceNodesRef.current.delete(trackId);
    }
  }, []);

  const removeEventListeners = useCallback(() => {
    const currentRoom = roomRef.current;
    const handlers = handlersRef.current;
    
    if (currentRoom) {
      if (handlers.trackSubscribed) currentRoom.off(RoomEvent.TrackSubscribed, handlers.trackSubscribed);
      if (handlers.trackUnsubscribed) currentRoom.off(RoomEvent.TrackUnsubscribed, handlers.trackUnsubscribed);
      if (handlers.localTrackPublished) currentRoom.off(RoomEvent.LocalTrackPublished, handlers.localTrackPublished);
      if (handlers.localTrackUnpublished) currentRoom.off(RoomEvent.LocalTrackUnpublished, handlers.localTrackUnpublished);
    }
    
    handlersRef.current = { trackSubscribed: null, trackUnsubscribed: null, localTrackPublished: null, localTrackUnpublished: null };
    roomRef.current = null;
  }, []);

  const cleanupResources = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    sourceNodesRef.current.forEach((source) => {
      try { source.disconnect(); } catch (e) {}
    });
    sourceNodesRef.current.clear();

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;
    destinationRef.current = null;
    mediaRecorderRef.current = null;
    
    isRecordingRef.current = false;
    isStoppingRef.current = false;
    setIsRecording(false);
    setDuration(0);
  }, []);

  const finalizeRecording = useCallback(() => {
    removeEventListeners();
    
    const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const audioBlob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
    
    // Clear chunks after creating blob
    chunksRef.current = [];
    
    if (onRecordingCompleteRef.current && audioBlob.size > 0) {
      onRecordingCompleteRef.current(audioBlob, finalDuration);
    }
    
    cleanupResources();
  }, [removeEventListeners, cleanupResources]);

  const abortRecording = useCallback(() => {
    // Called on unmount while recording - stop without saving
    removeEventListeners();
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Clear handlers to prevent finalization callback
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.onerror = null;
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    
    chunksRef.current = [];
    cleanupResources();
  }, [removeEventListeners, cleanupResources]);

  useEffect(() => {
    return () => {
      if (isRecordingRef.current) {
        if (isStoppingRef.current) {
          // Already stopping - let the onstop handler finish, just clean up listeners
          removeEventListeners();
        } else {
          // Recording but not stopping - auto-finalize to preserve the recording
          isStoppingRef.current = true;
          const mediaRecorder = mediaRecorderRef.current;
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            // Stop the recorder - onstop will call finalizeRecording
            mediaRecorder.stop();
          } else {
            // Recorder not active, finalize with what we have
            finalizeRecording();
          }
        }
      }
    };
  }, [abortRecording, removeEventListeners, finalizeRecording]);

  const startRecording = useCallback(async () => {
    if (!room) {
      setError("Room not connected");
      onError?.(new Error("Room not connected"));
      return;
    }

    if (isRecordingRef.current) {
      return;
    }

    try {
      setError(null);
      chunksRef.current = [];
      isRecordingRef.current = true;
      isStoppingRef.current = false;
      roomRef.current = room;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const destination = audioContext.createMediaStreamDestination();
      destinationRef.current = destination;

      // Add existing remote audio tracks
      room.remoteParticipants.forEach((participant) => {
        participant.audioTrackPublications.forEach((publication) => {
          if (publication.track && publication.track.mediaStreamTrack) {
            const trackId = `${participant.identity}-${publication.track.sid}`;
            addTrackToMix(trackId, publication.track.mediaStreamTrack);
          }
        });
      });

      // Add local audio track if publishing
      const localPubs = Array.from(room.localParticipant.audioTrackPublications.values());
      if (localPubs[0]?.track?.mediaStreamTrack) {
        const trackId = `local-${localPubs[0].track.sid}`;
        addTrackToMix(trackId, localPubs[0].track.mediaStreamTrack);
      }

      // Create event handlers
      const handleTrackSubscribed = (track: Track, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio && track.mediaStreamTrack) {
          addTrackToMix(`${participant.identity}-${track.sid}`, track.mediaStreamTrack);
        }
      };

      const handleTrackUnsubscribed = (track: Track, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) {
          removeTrackFromMix(`${participant.identity}-${track.sid}`);
        }
      };

      const handleLocalTrackPublished = (publication: any) => {
        const track = publication.track as LocalTrack;
        if (track?.kind === Track.Kind.Audio && track.mediaStreamTrack) {
          addTrackToMix(`local-${track.sid}`, track.mediaStreamTrack);
        }
      };

      const handleLocalTrackUnpublished = (publication: any) => {
        const track = publication.track as LocalTrack;
        if (track?.kind === Track.Kind.Audio) {
          removeTrackFromMix(`local-${track.sid}`);
        }
      };

      handlersRef.current = {
        trackSubscribed: handleTrackSubscribed,
        trackUnsubscribed: handleTrackUnsubscribed,
        localTrackPublished: handleLocalTrackPublished,
        localTrackUnpublished: handleLocalTrackUnpublished,
      };

      room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      room.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
      room.on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';
      mimeTypeRef.current = mimeType;

      const mediaRecorder = new MediaRecorder(destination.stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && isRecordingRef.current) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (isStoppingRef.current) {
          finalizeRecording();
        }
        // If not stopping (aborted), do nothing - abortRecording handles cleanup
      };

      mediaRecorder.onerror = (event: any) => {
        const err = new Error(event.error?.message || "Recording failed");
        setError(err.message);
        onError?.(err);
        abortRecording();
      };

      startTimeRef.current = Date.now();
      mediaRecorder.start(1000);
      setIsRecording(true);

      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

    } catch (err: any) {
      const errorMsg = err.message || "Failed to start recording";
      setError(errorMsg);
      onError?.(new Error(errorMsg));
      abortRecording();
    }
  }, [room, onError, addTrackToMix, removeTrackFromMix, finalizeRecording, abortRecording]);

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current || isStoppingRef.current) {
      return;
    }

    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      cleanupResources();
      return;
    }

    isStoppingRef.current = true;
    mediaRecorder.stop();
  }, [cleanupResources]);

  return {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    error,
  };
}
