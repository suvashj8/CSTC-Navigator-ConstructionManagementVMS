# Mobile (Android & iOS)

VMS uses a **single React codebase** for web, installable PWA, and native apps via [Capacitor](https://capacitorjs.com/).

```
┌─────────────────────────────────────────┐
│           React + Vite UI               │
│  (responsive layout, same as web)       │
└──────────────┬──────────────────────────┘
               │
     ┌─────────┼─────────┐
     ▼         ▼         ▼
   Web PWA   Android    iOS
  (browser)  (Capacitor) (Capacitor)
```

## Prerequisites

### All platforms
- Node.js 20+
- `npm install` in `frontend/`

### Android
- [Android Studio](https://developer.android.com/studio) (SDK 34+)
- JDK 17

### iOS (macOS only)
- Xcode 15+
- CocoaPods: `sudo gem install cocoapods`
- Apple Developer account (for device testing & App Store)

## Build & run

### 1. Web / PWA (mobile browser)
```bash
cd frontend
npm run dev          # dev server — test responsive UI in Chrome device mode
npm run build        # production build + service worker
npm run preview      # test production PWA locally
```

On a phone: open the deployed HTTPS URL → browser menu → **Add to Home Screen**.

### 2. Android app
```bash
cd frontend
npm run cap:android   # build web assets, sync, open Android Studio
```

In Android Studio: select a device/emulator → **Run**.

Or from CLI:
```bash
npm run cap:run:android
```

### 3. iOS app (Mac)
```bash
cd frontend
npm run cap:ios       # build, sync, open Xcode
```

In Xcode: select simulator or device → **Run**.

```bash
npm run cap:run:ios
```

After any UI change:
```bash
npm run cap:sync
```

## API URL on real devices

Phones cannot reach `localhost` on your PC. For native builds set:

```env
# frontend/.env.production
VITE_USE_MOCK=false
VITE_API_URL=https://api.your-domain.com
```

Rebuild before sync:
```bash
npm run cap:sync
```

For local device testing against your machine's API, use your LAN IP:
```env
VITE_API_URL=http://192.168.1.50:3000
```
(Android emulator: use `http://10.0.2.2:3000` for host machine.)

## App identity

| Setting | Value |
|---------|--------|
| App ID | `com.navigator.vms` |
| App name | Navigator VMS |
| Config | `frontend/capacitor.config.ts` |

Change `appId` before publishing to stores.

## Mobile UX included

- **Single codebase** — same features on web, PWA, Android, and iOS (no separate mobile app logic)
- Custom catalog pickers (location type, insurance, asset type, **Custom Make**, etc.) in dialogs
- Asset **Decommission / Delete** flows with mobile-stacked confirmation buttons
- **No leading minus** on text inputs (global `Input` / `Textarea` rule)
- Responsive sidebar → sheet menu on phones
- Card-based lists on screens &lt; 7 inch (assets, allocations, insurance, reports, …)
- Full-width touch targets on phone (44px min); compact density only on desktop
- Dialog / alert safe-area padding for notched devices
- Safe area insets (notch / home indicator)
- Android hardware back button handling
- Status bar styling (iOS / Android)
- Keyboard resize for forms
- PWA manifest + installable icons
- Service worker for offline shell (API still needs network)

## Store release checklist

1. Set production `VITE_API_URL` (HTTPS)
2. Replace icons in `public/icons/` (192, 512, maskable)
3. Add splash screens: `npx @capacitor/assets generate --iconBackgroundColor '#0f172a'`
4. Android: signing key, `android/app/build.gradle` versionCode
5. iOS: provisioning profile, App Store Connect metadata
6. Privacy policy URL (required for both stores)
7. Push notifications (future): `@capacitor/push-notifications` + FCM/APNs

## Optional next native features

- **Push notifications** — allocation alerts, insurance expiry
- **Camera / QR** — asset scanning at site
- **Geolocation** — verify asset at work location
- **Biometric login** — `@capacitor-community/biometric-auth`
- **Offline queue** — sync allocations when back online
