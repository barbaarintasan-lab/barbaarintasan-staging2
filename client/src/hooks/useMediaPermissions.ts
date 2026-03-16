import { useState, useEffect, useCallback } from 'react';

export type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'checking';

interface UseMediaPermissionsResult {
  microphoneStatus: PermissionStatus;
  requestMicrophone: () => Promise<boolean>;
  hasRequestedOnce: boolean;
  error: string | null;
}

const PERMISSION_KEY = 'sheeko-mic-permission-requested';

export function useMediaPermissions(): UseMediaPermissionsResult {
  const [microphoneStatus, setMicrophoneStatus] = useState<PermissionStatus>('checking');
  const [hasRequestedOnce, setHasRequestedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkPermission = async () => {
      setHasRequestedOnce(localStorage.getItem(PERMISSION_KEY) === 'true');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicrophoneStatus('denied');
        setError('Your browser does not support microphone access');
        return;
      }

      try {
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setMicrophoneStatus(result.state as PermissionStatus);
          
          result.addEventListener('change', () => {
            setMicrophoneStatus(result.state as PermissionStatus);
          });
        } else {
          // Fallback for browsers without Permissions API (Safari)
          // Don't assume granted based on enumerateDevices - always start with prompt
          // The user must explicitly grant permission through requestMicrophone()
          setMicrophoneStatus('prompt');
        }
      } catch (err) {
        // If permissions query fails, default to prompt
        setMicrophoneStatus('prompt');
      }
    };

    checkPermission();
  }, []);

  const requestMicrophone = useCallback(async (): Promise<boolean> => {
    setError(null);
    localStorage.setItem(PERMISSION_KEY, 'true');
    setHasRequestedOnce(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      stream.getTracks().forEach(track => track.stop());
      
      setMicrophoneStatus('granted');
      return true;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicrophoneStatus('denied');
        setError('Microphone access was denied. Please enable it in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setMicrophoneStatus('denied');
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setMicrophoneStatus('denied');
        setError('Could not access microphone: ' + err.message);
      }
      return false;
    }
  }, []);

  return {
    microphoneStatus,
    requestMicrophone,
    hasRequestedOnce,
    error,
  };
}
