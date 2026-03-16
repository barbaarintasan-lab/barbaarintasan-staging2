import fs from "node:fs";
import path from "node:path";

interface ViteManifestEntry {
  file: string;
  css?: string[];
  imports?: string[];
}

interface ViteManifest {
  [key: string]: ViteManifestEntry;
}

interface TemplateCache {
  html: string;
  manifestMtime: number;
}

let cache: TemplateCache | null = null;

export function getSheekoHtml(distPath: string): string {
  const manifestPath = path.resolve(distPath, ".vite/manifest.json");
  
  // Check manifest mtime to invalidate cache on rebuild
  let currentMtime = 0;
  if (fs.existsSync(manifestPath)) {
    try {
      currentMtime = fs.statSync(manifestPath).mtimeMs;
    } catch {
      currentMtime = 0;
    }
  }
  
  // Return cached template if manifest hasn't changed
  if (cache && cache.manifestMtime === currentMtime && currentMtime > 0) {
    return cache.html;
  }
  
  let mainJsPath = "";
  let cssLinks = "";

  // Try to get assets from Vite manifest first
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest: ViteManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      const mainEntry = manifest["index.html"] || manifest["src/main.tsx"];
      
      if (mainEntry) {
        mainJsPath = `/${mainEntry.file}`;
        if (mainEntry.css) {
          cssLinks = mainEntry.css.map(css => `<link rel="stylesheet" href="/${css}" />`).join("\n    ");
        }
      }
    } catch (err) {
      console.error("[SHEEKO] Could not parse Vite manifest:", err);
    }
  }
  
  // Fallback: parse index.html to extract script/css tags if manifest failed
  if (!mainJsPath) {
    const indexHtmlPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexHtmlPath)) {
      try {
        const indexHtml = fs.readFileSync(indexHtmlPath, "utf-8");
        // Extract main script src
        const scriptMatch = indexHtml.match(/<script[^>]*type="module"[^>]*src="([^"]+)"[^>]*>/);
        if (scriptMatch) {
          mainJsPath = scriptMatch[1];
        }
        // Extract CSS links
        const cssRegex = /<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g;
        const cssArray: string[] = [];
        let cssMatch;
        while ((cssMatch = cssRegex.exec(indexHtml)) !== null) {
          cssArray.push(`<link rel="stylesheet" href="${cssMatch[1]}" />`);
        }
        cssLinks = cssArray.join("\n    ");
      } catch (err) {
        console.error("[SHEEKO] Could not parse index.html:", err);
      }
    }
  }
  
  // Final fallback - throw error if no assets found
  if (!mainJsPath) {
    console.error("[SHEEKO] No valid assets found - build may be corrupted");
    mainJsPath = "/assets/main.js"; // Last resort fallback
  }

  const generatedHtml = `<!DOCTYPE html>
<html lang="so">
  <head>
    <meta charset="UTF-8" />
    <title>Sheeko - Live Audio Rooms</title>
    <meta name="description" content="Sheeko - Live voice chat rooms for Somali parents. Connect and discuss parenting topics in real-time." />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="#1a1a2e" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Sheeko" />
    <meta name="mobile-web-app-capable" content="yes" />

    <meta property="og:type" content="website" />
    <meta property="og:title" content="Sheeko - Live Audio Rooms" />
    <meta property="og:description" content="Live voice chat rooms for Somali parents" />
    <meta property="og:image" content="/opengraph.jpg" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Sheeko - Live Audio Rooms" />
    <meta name="twitter:description" content="Live voice chat rooms for Somali parents" />

    <link rel="icon" type="image/png" href="/sheeko-icon-192.png" />
    <link rel="apple-touch-icon" href="/sheeko-icon-192.png" />
    <link rel="manifest" href="/sheeko-manifest.json" />
    ${cssLinks}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    <style>
      #sheeko-splash {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        transition: opacity 0.3s ease-out;
      }
      #sheeko-splash.hidden {
        opacity: 0;
        pointer-events: none;
      }
      .sheeko-logo {
        width: 100px;
        height: 100px;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        border-radius: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 20px;
        animation: pulse 2s ease-in-out infinite;
      }
      .sheeko-logo svg {
        width: 50px;
        height: 50px;
        color: white;
      }
      .sheeko-title {
        color: white;
        font-family: 'Poppins', sans-serif;
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 8px;
      }
      .sheeko-subtitle {
        color: rgba(255,255,255,0.7);
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      .loading-dots {
        display: flex;
        gap: 8px;
        margin-top: 24px;
      }
      .loading-dots span {
        width: 8px;
        height: 8px;
        background: #ef4444;
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out;
      }
      .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
      .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
      @keyframes bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
    </style>
  </head>
  <body>
    <div id="sheeko-splash">
      <div class="sheeko-logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="2"></circle>
          <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path>
        </svg>
      </div>
      <div class="sheeko-title">Sheeko</div>
      <div class="sheeko-subtitle">Live Audio Rooms</div>
      <div class="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
    <div id="root"></div>
    <script type="module" src="${mainJsPath}"></script>
    <script>
      window.addEventListener('load', function() {
        setTimeout(function() {
          var splash = document.getElementById('sheeko-splash');
          if (splash) {
            splash.classList.add('hidden');
            setTimeout(function() { splash.remove(); }, 300);
          }
        }, 500);
      });
    </script>
  </body>
</html>`;

  // Cache with mtime for invalidation
  cache = {
    html: generatedHtml,
    manifestMtime: currentMtime
  };

  return generatedHtml;
}

export function clearSheekoCache(): void {
  cache = null;
}
