# Mobile Strategy — Swipe Job Search

## 1. Approach: Web-First, Capacitor for Native

Start with a responsive Next.js web app optimised for mobile browsers. Once the web MVP is validated, wrap it with **Capacitor** for native iOS/Android builds. This avoids maintaining two codebases while still delivering native device features (haptics, push notifications, camera).

| Phase | Target | Tech |
|-------|--------|------|
| MVP (Month 1-3) | Mobile web (PWA) | Next.js responsive, manifest.json |
| Phase 2 (Month 4-6) | Native iOS + Android | Capacitor 6 wrapping the Next.js app |
| Phase 3 (Month 9+) | App Store / Play Store | EAS Build or Capacitor + Fastlane |

**Why Capacitor over React Native / Expo:**
- We already have a Next.js app — no full rewrite
- Supabase JS SDK works identically in the browser and Capacitor webview
- Framer Motion gestures work natively in webview
- Smaller team overhead (one codebase)

---

## 2. PWA Setup (Month 1-3)

Make the web app installable before the native app ships.

### `public/manifest.json`
```json
{
  "name": "Swipe Job Search",
  "short_name": "SwipeJobs",
  "description": "Find your next job with a swipe",
  "start_url": "/swipe",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#6366f1",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Service Worker
Use `next-pwa` or Workbox for:
- Offline fallback page ("You're offline — your swipes will sync when you reconnect")
- Cache job card images (last 50 cards) for smooth offline browsing
- Background sync for swipes made offline

---

## 3. Capacitor Setup (Month 4-6)

### Installation
```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npm install @capacitor/haptics @capacitor/push-notifications @capacitor/camera @capacitor/filesystem

npx cap init "Swipe Job Search" "au.com.swipejobs" --web-dir=out
```

### `capacitor.config.ts`
```typescript
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'au.com.swipejobs',
  appName: 'Swipe Job Search',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      showSpinner: false,
    },
  },
}
export default config
```

### Build Flow
```bash
# Build Next.js static export
npm run build  # next build + next export → /out directory

# Sync to Capacitor projects
npx cap sync

# Open in Xcode / Android Studio
npx cap open ios
npx cap open android
```

---

## 4. Haptic Feedback

Haptics make swipes feel physical and satisfying — critical for the Tinder-like feel.

```typescript
// lib/haptics.ts
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

export const haptics = {
  // Light tap when card is picked up
  cardGrab: () => Haptics.impact({ style: ImpactStyle.Light }),
  
  // Medium bump at the swipe threshold (when indicator appears)
  swipeThreshold: () => Haptics.impact({ style: ImpactStyle.Medium }),
  
  // Heavy thud on swipe completion
  swipeComplete: (direction: 'left' | 'right' | 'up') => {
    if (direction === 'right' || direction === 'up') {
      Haptics.notification({ type: NotificationType.Success })
    } else {
      Haptics.impact({ style: ImpactStyle.Heavy })
    }
  },
  
  // Double buzz on match
  matchCelebration: async () => {
    await Haptics.notification({ type: NotificationType.Success })
    await new Promise(r => setTimeout(r, 100))
    await Haptics.notification({ type: NotificationType.Success })
  },
}
```

```typescript
// In SwipeDeck component — integrate with Framer Motion drag callbacks
onDragStart={() => haptics.cardGrab()}
onDrag={(_, info) => {
  if (Math.abs(info.offset.x) > SWIPE_THRESHOLD && !thresholdTriggered) {
    setThresholdTriggered(true)
    haptics.swipeThreshold()
  }
}}
onDragEnd={(_, info) => {
  const direction = getSwipeDirection(info.offset)
  if (direction) haptics.swipeComplete(direction)
}}
```

---

## 5. Push Notifications

### Architecture
```
Match detected (DB trigger)
  → Supabase Edge Function (match-notification)
    → OneSignal API (or Expo Push / APNs direct)
      → iOS / Android device
```

See `NOTIFICATIONS.md` for the full spec. The Capacitor side:

```typescript
// lib/push-notifications.ts
import { PushNotifications } from '@capacitor/push-notifications'

export async function registerPushNotifications(userId: string) {
  const permission = await PushNotifications.requestPermissions()
  if (permission.receive !== 'granted') return

  await PushNotifications.register()

  PushNotifications.addListener('registration', async ({ value: token }) => {
    // Save token to Supabase profiles table
    await supabase
      .from('profiles')
      .update({ push_token: token, push_platform: 'capacitor' })
      .eq('user_id', userId)
  })

  PushNotifications.addListener('pushNotificationReceived', notification => {
    // App is in foreground — show in-app toast instead of system notification
    showToast(notification.title ?? 'New notification')
  })

  PushNotifications.addListener('pushNotificationActionPerformed', action => {
    // App opened from notification — navigate to relevant screen
    const { match_id, type } = action.notification.data
    if (type === 'match') router.push(`/matches/${match_id}`)
    if (type === 'message') router.push(`/chat/${match_id}`)
  })
}
```

---

## 6. Camera & Image Upload

Used for candidate profile photos and recruiter job card photos.

```typescript
// lib/camera.ts
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

export async function takeOrPickPhoto(): Promise<Blob> {
  const photo = await Camera.getPhoto({
    quality: 80,
    allowEditing: true,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Prompt, // "Take Photo" or "Choose from Library"
    width: 800,
    correctOrientation: true,
  })
  
  // Convert dataUrl to Blob for Supabase upload
  const response = await fetch(photo.dataUrl!)
  return response.blob()
}

export async function uploadProfilePhoto(userId: string, blob: Blob): Promise<string> {
  const filename = `${userId}/${Date.now()}.jpg`
  const { error } = await supabase.storage
    .from('profile-photos')
    .upload(filename, blob, { contentType: 'image/jpeg', upsert: true })
  
  if (error) throw error
  
  const { data } = supabase.storage.from('profile-photos').getPublicUrl(filename)
  return data.publicUrl
}
```

---

## 7. Responsive Design Breakpoints

The swipe deck is primarily a mobile UI. Design breakpoints:

| Breakpoint | Layout |
|-----------|--------|
| `< 640px` (mobile) | Full-screen card stack, bottom action buttons |
| `640px–1024px` (tablet) | Centred card (480px max-width), side panels for matches |
| `> 1024px` (desktop) | Two-column: card deck left, matches/chat right; explicit ❌✅ buttons |

```css
/* Card sizing */
.job-card {
  @apply w-full max-w-sm mx-auto; /* mobile */
  @apply md:max-w-md;             /* tablet */
  @apply lg:max-w-sm;             /* desktop — fixed width beside sidebar */
  aspect-ratio: 3/4;              /* portrait card format */
}
```

---

## 8. App Store Submission Checklist

### iOS (App Store)
- [ ] Apple Developer account ($99 USD/yr)
- [ ] Sign in with Apple implemented (required if any social auth offered)
- [ ] Privacy Nutrition Labels filled (data collected: email, photos, location)
- [ ] App Review Guidelines: Section 5.1 (Privacy), Section 1.2 (User-Generated Content moderation)
- [ ] Screenshots: 6.7" iPhone, 12.9" iPad Pro (optional)
- [ ] App description: lead with "Find your next Melbourne job with a swipe"
- [ ] Age rating: 4+ (no objectionable content)
- [ ] Privacy Policy URL: `https://swipejobs.com.au/privacy`

### Android (Play Store)
- [ ] Google Play Developer account ($25 USD one-time)
- [ ] Target API Level 34 (Android 14)
- [ ] 64-bit APK/AAB
- [ ] Data Safety form filled
- [ ] Screenshots: Pixel 7, Pixel Tablet
- [ ] Content rating: Everyone

### Both Stores
- [ ] App icon: 1024x1024 PNG, no alpha, no rounded corners (stores add their own)
- [ ] Feature graphic: 1024x500 PNG
- [ ] Version naming: `1.0.0` (major.minor.patch)
