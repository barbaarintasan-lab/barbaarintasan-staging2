import { useState, useEffect } from 'react';
import { Smartphone, Share, Plus, MoreVertical, Check, ChevronRight, ArrowLeft, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import logoImage from "@assets/NEW_LOGO-BSU_1_1768990258338.png";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               (window.navigator as any).standalone === true;
    setIsStandalone(isInStandaloneMode);

    const wasInstalled = localStorage.getItem('pwa-installed') === 'true';
    setInstalled(wasInstalled);

    const iosCheck = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const androidCheck = /Android/i.test(navigator.userAgent);
    
    setIsIOS(iosCheck);
    setIsAndroid(androidCheck);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      localStorage.setItem('pwa-installed', 'true');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
        localStorage.setItem('pwa-installed', 'true');
      }
      setDeferredPrompt(null);
    }
  };

  if (isStandalone || installed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-green-800 mb-2">App-ka waa la install-garey!</h1>
        <p className="text-green-600 mb-6">BSA & Sheeko waxay ku jiraan taleefankaaga</p>
        <Link href="/">
          <Button className="bg-green-600 hover:bg-green-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Ku laabo App-ka
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-white pb-24">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="p-2 hover:bg-gray-100 rounded-full" data-testid="back-button" aria-label="Dib ku laabo">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="font-bold text-lg">App-ka Install Garee</h1>
      </div>

      <div className="p-4 space-y-6">
        <div className="text-center py-6">
          <div className="flex justify-center items-center gap-4 mb-4">
            <img src={logoImage} alt="BSA" className="w-16 h-16 rounded-2xl shadow-lg" />
            <div className="text-3xl font-bold text-gray-300">+</div>
            <div className="w-16 h-16 bg-red-500 rounded-2xl shadow-lg flex items-center justify-center">
              <Radio className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">BSA & Sheeko</h2>
          <p className="text-gray-600">Labada app ee waalidka loogu talagalay</p>
        </div>

        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 text-white">
          <h3 className="font-bold text-lg mb-2">Maxay kuu faa'iido leedahay?</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>Si degdeg ah u fur app-ka</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>Shaqee xitaa marka internet-ka la waayo</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>Hel digniino iyo xusuusino</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>Ma u baahna Play Store/App Store</span>
            </li>
          </ul>
        </div>

        {deferredPrompt && (
          <Button
            onClick={handleInstall}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-lg py-6 rounded-xl shadow-lg"
            data-testid="button-quick-install"
          >
            <Smartphone className="w-5 h-5 mr-2" />
            Hadda Install Garee
          </Button>
        )}

        {isIOS && (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="bg-blue-50 p-4 border-b">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg"></span>
                </div>
                <h3 className="font-bold text-blue-800">iPhone/iPad - Safari</h3>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-blue-600">1</div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800">Riix Share button-ka</p>
                  <p className="text-sm text-gray-500">Hoose browser-ka, sumcad ah - waa sanduuq leh fallaar sare u muuqata</p>
                  <div className="mt-2 flex items-center justify-center bg-gray-100 rounded-lg p-3">
                    <Share className="w-6 h-6 text-blue-500" />
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-blue-600">2</div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800">Hoos u scroll-garee</p>
                  <p className="text-sm text-gray-500">Dooro "Add to Home Screen"</p>
                  <div className="mt-2 bg-gray-100 rounded-lg p-3 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-300 rounded flex items-center justify-center">
                      <Plus className="w-5 h-5 text-gray-600" />
                    </div>
                    <span className="text-gray-700">Add to Home Screen</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-green-600">3</div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800">Riix "Add"</p>
                  <p className="text-sm text-gray-500">Geeska sare midig</p>
                  <div className="mt-2 bg-green-50 rounded-lg p-3 flex items-center justify-center">
                    <span className="text-green-600 font-bold">Add</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {(isAndroid || (!isIOS && !isAndroid)) && (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="bg-green-50 p-4 border-b">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">🤖</span>
                </div>
                <h3 className="font-bold text-green-800">Android - Chrome</h3>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-green-600">1</div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800">Riix Menu (⋮)</p>
                  <p className="text-sm text-gray-500">Geeska sare midig - saddex dhibcood</p>
                  <div className="mt-2 flex items-center justify-center bg-gray-100 rounded-lg p-3">
                    <MoreVertical className="w-6 h-6 text-gray-600" />
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-green-600">2</div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800">Dooro "Install app" ama "Add to Home screen"</p>
                  <p className="text-sm text-gray-500">Menu-ga gudahiisa</p>
                  <div className="mt-2 bg-gray-100 rounded-lg p-3 flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700">Install app</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-green-600">3</div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800">Riix "Install"</p>
                  <p className="text-sm text-gray-500">Pop-up-ka ka soo baxa</p>
                  <div className="mt-2 bg-green-50 rounded-lg p-3 flex items-center justify-center">
                    <span className="text-green-600 font-bold">Install</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
          <h3 className="font-bold text-purple-800 mb-2">Waxa aad helaysaa:</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-purple-700">
              <ChevronRight className="w-4 h-4" />
              <span>Sheeko Live Audio</span>
            </div>
            <div className="flex items-center gap-2 text-purple-700">
              <ChevronRight className="w-4 h-4" />
              <span>Maktabada</span>
            </div>
            <div className="flex items-center gap-2 text-purple-700">
              <ChevronRight className="w-4 h-4" />
              <span>Quraanka (20 Sheikh)</span>
            </div>
            <div className="flex items-center gap-2 text-purple-700">
              <ChevronRight className="w-4 h-4" />
              <span>Cashar Video</span>
            </div>
            <div className="flex items-center gap-2 text-purple-700">
              <ChevronRight className="w-4 h-4" />
              <span>Jadwalka Salaada</span>
            </div>
            <div className="flex items-center gap-2 text-purple-700">
              <ChevronRight className="w-4 h-4" />
              <span>Qibla Finder</span>
            </div>
            <div className="flex items-center gap-2 text-purple-700">
              <ChevronRight className="w-4 h-4" />
              <span>Shahaado</span>
            </div>
            <div className="flex items-center gap-2 text-purple-700">
              <ChevronRight className="w-4 h-4" />
              <span>Imtixaano</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
