import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Bell, Sparkles } from 'lucide-react';

interface NotificationData {
  title: string;
  body: string;
}

interface NotificationModalContextType {
  showNotification: (data: NotificationData) => void;
}

const NotificationModalContext = createContext<NotificationModalContextType | null>(null);

export function useNotificationModal() {
  const context = useContext(NotificationModalContext);
  if (!context) {
    throw new Error('useNotificationModal must be used within NotificationModalProvider');
  }
  return context;
}

export function NotificationModalProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const showNotification = (data: NotificationData) => {
    setNotification(data);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setNotification(null);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const notificationParam = urlParams.get('notification');
    
    if (notificationParam) {
      try {
        const data = JSON.parse(decodeURIComponent(notificationParam));
        if (data.title || data.body) {
          showNotification(data);
        }
      } catch (e) {
        console.error('Failed to parse notification data:', e);
      }
      
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', newUrl || '/');
    }
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_NOTIFICATION_CLICK') {
        showNotification({
          title: event.data.title,
          body: event.data.body,
        });
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, []);

  return (
    <NotificationModalContext.Provider value={{ showNotification }}>
      {children}
      
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent className="max-w-sm mx-auto border-0 shadow-2xl overflow-hidden p-0 rounded-3xl">
          <div className="bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 p-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-2 left-4 w-2 h-2 bg-white rounded-full animate-pulse" />
              <div className="absolute top-8 right-8 w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-300" />
              <div className="absolute bottom-4 left-12 w-1 h-1 bg-white rounded-full animate-pulse delay-500" />
              <div className="absolute bottom-6 right-16 w-2 h-2 bg-white rounded-full animate-pulse delay-700" />
            </div>
            <div className="relative">
              <div className="w-20 h-20 mx-auto bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 shadow-lg border-2 border-white/40">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-inner">
                  <Bell className="w-8 h-8 text-amber-600" />
                </div>
              </div>
              <p className="text-white font-bold text-base mb-1 drop-shadow-md">Barbaarintasan Academy BSA.v1</p>
              <p className="text-white text-sm mb-3 drop-shadow-sm">Ayeey Fariintan kaaga timid</p>
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-white drop-shadow-md" />
                <span className="text-white text-sm font-bold uppercase tracking-wider drop-shadow-md">Wargelin Cusub</span>
                <Sparkles className="w-5 h-5 text-white drop-shadow-md" />
              </div>
            </div>
          </div>
          
          <AlertDialogHeader className="p-6 pb-2">
            <AlertDialogTitle className="text-xl font-bold text-gray-900 text-center">
              {notification?.title || 'Barbaarintasan Academy'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 text-base leading-relaxed mt-3 text-center">
              {notification?.body}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter className="p-6 pt-2">
            <AlertDialogAction 
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 hover:from-amber-600 hover:via-yellow-600 hover:to-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-amber-500/30 text-lg transition-all duration-200 active:scale-[0.98]"
            >
              Waan Fahmay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </NotificationModalContext.Provider>
  );
}
