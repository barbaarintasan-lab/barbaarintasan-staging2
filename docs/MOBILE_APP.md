# Mobile App Platform - Barbaarintasan Academy

## Platform Strategy

App-ka **Barbaarintasan Academy** ma aha Flutter, mana aha React Native.

App-ka waa **React + TypeScript PWA (Progressive Web App)** — websayd ka shaqeysa dhammaan aaladaha (telefoonka, tablet-ka, iyo kombiyuutarka), oo sidoo kale la rakibi karo si app ah.

---

## Teknoolajiyada App-ka (Tech Stack)

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Express.js + Node.js |
| Database | PostgreSQL (Neon serverless) |
| Mobile | PWA + Android TWA (Trusted Web Activity) |

---

## Mobile Platforms

### ✅ Android (Google Play Store)
App-ka Android-ka ah waxaa lagu sameeyaa **Trusted Web Activity (TWA)** adiga oo isticmaalaya [Bubblewrap CLI](https://github.com/GoogleChromeLabs/bubblewrap).

**TWA** waa hab u oggolaanaya in PWA la rakibo Play Store-ka sida app dhab ah — isticmaalayaashu ma arki doonaan browser-ka, wayna la mid tahay app asaasi ah.

**Package Name:** `com.barbaarintasan.academy`

**SHA-256 Fingerprint (assetlinks.json):**
```
01:EE:60:F0:E1:0D:8D:C4:B5:EE:C2:B1:F5:50:33:B1:D0:6B:A0:C5:95:E4:36:E4:80:7C:BB:EB:E8:AF:DD:C5
```

### ✅ iOS (Add to Home Screen)
iOS-ka waxaa loo isticmaalaa Safari **"Add to Home Screen"** (PWA install). App-ka waxa uu si buuxda u shaqeeyaa iPhone-ka iyo iPad-ka iyada oo la isticmaalayo Safari.

### ✅ Web (All Browsers)
App-ka asal ahaan waa websayd ka shaqeysa dhammaan browser-yada casriga ah.

---

## Building the Android App

### Prerequisites
```bash
# Install Bubblewrap CLI globally
npm install -g @bubblewrap/cli

# Install Android SDK & Java (JDK 11+)
# See: https://developer.android.com/studio
```

### Build Steps
```bash
# 1. Initialize TWA project from twa-manifest.json
bubblewrap init --manifest https://appbarbaarintasan.com/manifest.json

# 2. Build the Android APK/AAB
bubblewrap build

# 3. Output files:
#    app-release-signed.apk  (for sideloading / testing)
#    app-release-bundle.aab  (for Google Play Store upload)
```

### Configuration File
The Bubblewrap configuration is stored in [`twa-manifest.json`](../twa-manifest.json) at the project root.

---

## Why Not Flutter or React Native?

| Option | Decision | Reason |
|--------|----------|--------|
| **Flutter** | ❌ Not used | Requires separate Dart codebase; duplicates all web logic |
| **React Native** | ❌ Not used | Requires separate RN codebase; app is primarily web-first |
| **PWA + TWA** | ✅ Chosen | Single codebase; works on web, Android (Play Store), and iOS |

### Benefits of PWA + TWA Approach
- **One codebase** — same React code powers web + Android + iOS
- **Instant updates** — no app store review needed for content/feature updates
- **Play Store ready** — TWA apps are accepted by Google Play Store
- **Full web APIs** — access to all browser capabilities (notifications, camera, etc.)
- **Smaller size** — no native code bundled in the APK

---

## PWA Features Implemented

- ✅ **Service Worker** — offline support, background sync
- ✅ **Web App Manifest** (`/manifest.json`) — install prompt, splash screen, icons
- ✅ **Push Notifications** — via Web Push API
- ✅ **App Shortcuts** — Koorsooyin, Sheeko Live, Maktabada
- ✅ **Maskable Icons** — for Android adaptive icons
- ✅ **Digital Asset Links** — `/well-known/assetlinks.json` for TWA verification
- ✅ **IARC Rating** — content rating for Play Store
- ✅ **Screenshots** — Play Store listing screenshots

---

## Digital Asset Links

The file at `/client/public/.well-known/assetlinks.json` links the web domain to the Android app package. This is required for TWA to work without showing the browser URL bar.

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.barbaarintasan.academy",
    "sha256_cert_fingerprints": ["01:EE:..."]
  }
}]
```

This file is served at: `https://appbarbaarintasan.com/.well-known/assetlinks.json`
