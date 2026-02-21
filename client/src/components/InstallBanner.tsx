import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               (window.navigator as any).standalone === true;
    setIsStandalone(isInStandaloneMode);

    if (isInStandaloneMode) {
      return;
    }

    const wasDismissed = sessionStorage.getItem('install-banner-dismissed') === 'true';
    const wasInstalled = localStorage.getItem('pwa-installed') === 'true';
    
    if (wasDismissed || wasInstalled) {
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      setShowBanner(false);
      localStorage.setItem('pwa-installed', 'true');
    });

    const mobileCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (mobileCheck) {
      setTimeout(() => setShowBanner(true), 500);
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
        setShowBanner(false);
        localStorage.setItem('pwa-installed', 'true');
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('install-banner-dismissed', 'true');
  };

  if (isStandalone || !showBanner) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white px-3 py-2 relative" data-testid="install-banner">
      <div className="flex items-center justify-between gap-2 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">📲 App-ka Install Garee!</p>
            <p className="text-xs text-white/90 truncate">BSA & Sheeko taleefankaaga ku kaydi</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {deferredPrompt ? (
            <Button
              onClick={handleInstall}
              size="sm"
              className="bg-white text-orange-800 hover:bg-white/90 font-bold text-xs px-3 h-8"
              data-testid="button-install-banner"
            >
              <Download className="w-3 h-3 mr-1" />
              Install
            </Button>
          ) : (
            <Link href="/install">
              <Button
                size="sm"
                className="bg-white text-orange-800 hover:bg-white/90 font-bold text-xs px-3 h-8"
                data-testid="button-install-guide"
              >
                <Download className="w-3 h-3 mr-1" />
                Sida loo sameeyo
              </Button>
            </Link>
          )}
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Xir"
            data-testid="button-dismiss-banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
