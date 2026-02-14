import { useState, useEffect } from 'react';
import { X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [location] = useLocation();
  const [showFab, setShowFab] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);

  // Don't show on auth pages
  const isAuthPage = location === "/register" || location === "/login" || 
                     location === "/forgot-password" || location.startsWith("/reset-password");

  useEffect(() => {
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               (window.navigator as any).standalone === true;
    setIsStandalone(isInStandaloneMode);

    if (isInStandaloneMode) {
      return;
    }

    const wasInstalled = localStorage.getItem('pwa-installed') === 'true';
    if (wasInstalled) {
      setInstalled(true);
      return;
    }

    const iosCheck = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iosCheck);

    const mobileCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      setShowFab(false);
      setShowModal(false);
      setInstalled(true);
      localStorage.setItem('pwa-installed', 'true');
    });

    if (mobileCheck) {
      setTimeout(() => setShowFab(true), 1500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowFab(false);
        setShowModal(false);
        localStorage.setItem('pwa-installed', 'true');
      }
      setDeferredPrompt(null);
    } else {
      setShowModal(true);
    }
  };

  const handleFabClick = () => {
    if (deferredPrompt) {
      handleInstall();
    } else {
      setShowModal(true);
    }
  };

  if (isStandalone || installed || isAuthPage) return null;

  return (
    <>
      {showFab && !showModal && (
        <button
          onClick={handleFabClick}
          className="fixed bottom-24 right-3 z-50 w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-full shadow-xl flex items-center justify-center text-white animate-bounce hover:scale-110 transition-transform"
          data-testid="button-pwa-fab"
          aria-label="Add to Home Screen"
        >
          <Smartphone className="w-7 h-7" />
        </button>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4" onClick={() => setShowModal(false)}>
          <div 
            className="w-full max-w-sm bg-white rounded-t-3xl rounded-b-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 text-center text-white relative">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-2 right-2 text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
              <Smartphone className="w-12 h-12 mx-auto mb-2" />
              <h3 className="font-bold text-lg">📲 Ku Dar Home Screen</h3>
              <p className="text-sm text-white/90">BSA App-ka taleefankaaga ku kaydi</p>
            </div>

            <div className="p-4">
              {deferredPrompt ? (
                <Button
                  onClick={handleInstall}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold text-lg py-6 rounded-xl"
                  data-testid="button-install-pwa"
                >
                  <Smartphone className="w-5 h-5 mr-2" />
                  Install Now
                </Button>
              ) : isIOS ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl">1</div>
                    <div>
                      <p className="font-bold text-gray-800">Riix Share button</p>
                      <p className="text-sm text-gray-500">Hoose browser-ka ⬆️</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl">2</div>
                    <div>
                      <p className="font-bold text-gray-800">Dooro "Add to Home Screen"</p>
                      <p className="text-sm text-gray-500">Hoos u scroll-garee si aad u aragto</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl">✓</div>
                    <div>
                      <p className="font-bold text-gray-800">Riix "Add"</p>
                      <p className="text-sm text-gray-500">BSA wuu ku dari doonaa Home Screen</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl">1</div>
                    <div>
                      <p className="font-bold text-gray-800">Riix Menu ⋮</p>
                      <p className="text-sm text-gray-500">Geeska sare midig</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl">2</div>
                    <div>
                      <p className="font-bold text-gray-800">Dooro "Add to Home Screen"</p>
                      <p className="text-sm text-gray-500">Ama "Install App"</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl">✓</div>
                    <div>
                      <p className="font-bold text-gray-800">Riix "Add" ama "Install"</p>
                      <p className="text-sm text-gray-500">BSA wuu ku dari doonaa Home Screen</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
