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

// Minimum height threshold for showing landscape warning on small screens
const MIN_PORTRAIT_HEIGHT = 600;

// Create accessible landscape warning overlay
const createLandscapeWarning = () => {
  // Prevent multiple overlays
  if (document.getElementById('landscape-warning')) {
    return;
  }
  
  const overlay = document.createElement('div');
  overlay.id = 'landscape-warning';
  overlay.setAttribute('role', 'alert');
  overlay.setAttribute('aria-live', 'assertive');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
    color: white;
    display: none;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 1.25rem;
    font-weight: 600;
    padding: 2rem;
    z-index: 999999;
    font-family: 'Poppins', sans-serif;
  `;
  overlay.textContent = 'Fadlan u jeedi taleefanka si fiican | Please rotate your device to portrait mode ⤵️';
  document.body.appendChild(overlay);
  
  const checkOrientation = () => {
    const isLandscape = window.matchMedia(`(orientation: landscape) and (max-height: ${MIN_PORTRAIT_HEIGHT}px)`).matches;
    const root = document.getElementById('root');
    
    if (isLandscape) {
      overlay.style.display = 'flex';
      if (root) root.style.display = 'none';
    } else {
      overlay.style.display = 'none';
      if (root) root.style.display = '';
    }
  };
  
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);
  checkOrientation();
  
  // Return cleanup function
  return () => {
    window.removeEventListener('resize', checkOrientation);
    window.removeEventListener('orientationchange', checkOrientation);
    overlay.remove();
  };
};

// Attempt to lock orientation and create warning overlay when app loads
lockOrientation();
createLandscapeWarning();

// Detect if we're in Sheeko standalone mode
const isSheekoPWA = () => {
  const isSheekoPath = window.location.pathname.startsWith('/sheeko');
  const urlParams = new URLSearchParams(window.location.search);
  const standaloneParam = urlParams.get('standalone') === '1';
  const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = (window.navigator as any).standalone === true;
  
  // We only load SheekoApp if we are on the /sheeko path AND in standalone mode.
  // This prevents the white screen on the main app.
  return isSheekoPath && (standaloneParam || displayModeStandalone || iosStandalone);
};

const hideSplash = () => {
  if ((window as any).__hideSplash) {
    (window as any).__hideSplash();
  }
};

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  
  if (isSheekoPWA()) {
    import('./SheekoApp').then(({ SheekoApp }) => {
      root.render(<SheekoApp />);
      hideSplash();
    }).catch(err => {
      console.error("Failed to load SheekoApp:", err);
      // Fallback to main App if Sheeko fails
      root.render(<App />);
      hideSplash();
    });
  } else {
    root.render(<App />);
    hideSplash();
  }
} else {
  console.error("Root element not found!");
}
