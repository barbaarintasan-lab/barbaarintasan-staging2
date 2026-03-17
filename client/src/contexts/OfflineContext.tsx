import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getUnsyncedProgress, markProgressSynced, saveProgress, OfflineProgress } from '@/lib/offlineStorage';

interface OfflineContextType {
  isOnline: boolean;
  isStandalone: boolean;
  syncProgress: () => Promise<void>;
  saveOfflineProgress: (lessonId: string, progress: number, completed: boolean) => Promise<void>;
  pendingSyncCount: number;
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  isStandalone: false,
  syncProgress: async () => {},
  saveOfflineProgress: async () => {},
  pendingSyncCount: 0
});

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isStandalone, setIsStandalone] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const updatePendingCount = useCallback(async () => {
    try {
      const unsynced = await getUnsyncedProgress();
      setPendingSyncCount(unsynced.length);
    } catch (error) {
      console.error('Failed to get unsynced progress count:', error);
    }
  }, []);

  const syncProgress = useCallback(async () => {
    if (!navigator.onLine) return;
    
    try {
      const unsyncedProgress = await getUnsyncedProgress();
      
      for (const progress of unsyncedProgress) {
        try {
          const response = await fetch('/api/lessons/progress/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              lessonId: parseInt(progress.lessonId),
              progress: progress.progress,
              completed: progress.completed
            })
          });
          
          if (response.ok) {
            await markProgressSynced(progress.lessonId);
          }
        } catch (error) {
          console.error('Failed to sync progress for lesson:', progress.lessonId, error);
        }
      }
      
      await updatePendingCount();
    } catch (error) {
      console.error('Failed to sync offline progress:', error);
    }
  }, [updatePendingCount]);

  const saveOfflineProgress = useCallback(async (lessonId: string, progress: number, completed: boolean) => {
    const offlineProgress: OfflineProgress = {
      lessonId,
      progress,
      completed,
      timestamp: new Date(),
      synced: false
    };
    
    await saveProgress(offlineProgress);
    await updatePendingCount();
    
    if (navigator.onLine) {
      await syncProgress();
    }
  }, [updatePendingCount, syncProgress]);

  useEffect(() => {
    const standalone = (window.navigator as any).standalone === true || 
                       window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);
    
    updatePendingCount();
    
    const handleOnline = () => {
      setIsOnline(true);
      syncProgress();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncProgress, updatePendingCount]);

  return (
    <OfflineContext.Provider value={{ isOnline, isStandalone, syncProgress, saveOfflineProgress, pendingSyncCount }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  return useContext(OfflineContext);
}
