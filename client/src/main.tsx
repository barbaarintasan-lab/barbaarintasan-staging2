import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";

// Lock screen orientation to portrait
const lockOrientation = async () => {
  try {
    if ('screen' in window && 'orientation' in window.screen) {
      const orientation = window.screen.orientation;
      if ('lock' in orientation && typeof orientation.lock === 'function') {
        await orientation.lock('portrait');
        console.log('[Orientation] Locked to portrait mode');
      }
    }
  } catch (error) {
    console.log('[Orientation] Lock not supported or already locked:', error);
  }
};

// Attempt to lock orientation when app loads
lockOrientation();

// Detect if we're in Sheeko standalone mode
const isSheekoPWA = () => {
  const isSheekoPath = window.location.pathname.startsWith('/sheeko');
  const urlParams = new URLSearchParams(window.location.search);
  const standaloneParam = urlParams.get('standalone') === '1';
  const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = (window.navigator as any).standalone === true;
  
  return isSheekoPath && (standaloneParam || displayModeStandalone || iosStandalone);
};

// For Sheeko PWA standalone mode, we use a minimal shell
if (isSheekoPWA()) {
  // Lazy load Sheeko-only components for standalone mode
  import('./SheekoApp').then(({ SheekoApp }) => {
    createRoot(document.getElementById("root")!).render(<SheekoApp />);
  });
} else {
  // Normal app rendering
  createRoot(document.getElementById("root")!).render(<App />);
}
