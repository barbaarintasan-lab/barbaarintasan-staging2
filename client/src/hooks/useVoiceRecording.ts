import { useState, useRef, useCallback, useEffect } from "react";

interface UseVoiceRecordingOptions {
  onRecordingComplete?: (blob: Blob, duration: number) => void;
  onError?: (error: Error) => void;
}

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  error: string | null;
}

export function useVoiceRecording({
  onRecordingComplete,
  onError,
}: UseVoiceRecordingOptions = {}): UseVoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setDuration(0);
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        
        if (onRecordingComplete) {
          onRecordingComplete(audioBlob, finalDuration);
        }
        
        cleanup();
      };
      
      mediaRecorder.onerror = (event: any) => {
        const err = new Error(event.error?.message || "Recording failed");
        setError(err.message);
        if (onError) onError(err);
        cleanup();
      };
      
      startTimeRef.current = Date.now();
      mediaRecorder.start(1000);
      setIsRecording(true);
      
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      
    } catch (err: any) {
      const errorMsg = err.name === 'NotAllowedError' 
        ? "Microphone permission denied"
        : err.name === 'NotFoundError'
          ? "No microphone found"
          : err.message || "Failed to start recording";
      
      setError(errorMsg);
      if (onError) onError(new Error(errorMsg));
      cleanup();
    }
  }, [onRecordingComplete, onError, cleanup]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    error,
  };
}
