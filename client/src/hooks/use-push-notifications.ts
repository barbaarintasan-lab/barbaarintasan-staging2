import { useState, useEffect, useCallback } from 'react';

interface PushNotificationState {
  isSupported: boolean;
  isServerEnabled: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission | 'default';
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isServerEnabled: false,
    isSubscribed: false,
    isLoading: true,
    permission: 'default',
  });

  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      
      if (!isSupported) {
        setState(prev => ({ ...prev, isSupported: false, isLoading: false }));
        return;
      }

      const permission = Notification.permission;
      
      try {
        // Check if server has push notifications enabled
        const vapidRes = await fetch('/api/push/vapid-key');
        const vapidData = await vapidRes.json();
        const isServerEnabled = vapidData.enabled === true;

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        setState({
          isSupported: true,
          isServerEnabled,
          isSubscribed: !!subscription,
          isLoading: false,
          permission,
        });
      } catch (error) {
        setState(prev => ({ ...prev, isSupported: true, isServerEnabled: false, isLoading: false, permission }));
      }
    };

    checkSupport();
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !state.isServerEnabled) return false;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        setState(prev => ({ ...prev, isLoading: false, permission }));
        return false;
      }

      const vapidRes = await fetch('/api/push/vapid-key');
      const vapidData = await vapidRes.json();
      
      if (!vapidData.enabled || !vapidData.publicKey) {
        setState(prev => ({ ...prev, isLoading: false, isServerEnabled: false }));
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(subscription),
      });

      const result = await res.json();
      
      if (!res.ok || result.enabled === false) {
        // Server doesn't have push enabled, unsubscribe locally
        await subscription.unsubscribe();
        setState(prev => ({ ...prev, isLoading: false, isServerEnabled: false }));
        return false;
      }

      setState({
        isSupported: true,
        isServerEnabled: true,
        isSubscribed: true,
        isLoading: false,
        permission: 'granted',
      });

      return true;
    } catch (error) {
      console.error('Push subscription error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported, state.isServerEnabled]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Delete from server database first
        await fetch('/api/push/unsubscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        
        // Then unsubscribe from browser
        await subscription.unsubscribe();
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error('Push unsubscribe error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
