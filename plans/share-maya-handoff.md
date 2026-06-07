# Share Job Card + Invite Friend — UX/UI Handoff

**Author:** Maya (UX/UI + Product Experience)  
**Date:** 2026-06-07  
**Target:** Hi-Hired mobile app (Expo / React Native / NativeWind / Reanimated)  
**Theme system:** 5 accent themes (midnight, coast, bloom, hustle, slate) via `ThemeProvider`  
**Related docs:** `apps/mobile/app/(candidate)/job/[id].tsx`, `apps/mobile/components/screens/ProfileScreen.tsx`, `apps/mobile/lib/resume-export.ts`  
**App scheme:** `hi-hired://` (configured in `app.config.ts`)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Share Job Button — Swipe Card Overlay](#2-share-job-button--swipe-card-overlay)
3. [Share Job Button — Job Detail Header](#3-share-job-button--job-detail-header)
4. [Share Sheet Content Preview](#4-share-sheet-content-preview)
5. [Shared Card Image (Social Preview)](#5-shared-card-image-social-preview)
6. [Invite Friend Flow — Profile Screen](#6-invite-friend-flow--profile-screen)
7. [Post-Share Confirmation Toast](#7-post-share-confirmation-toast)
8. [Error States](#8-error-states)
9. [Data Layer & Hook](#9-data-layer--hook)
10. [Theme Compatibility](#10-theme-compatibility)
11. [Accessibility Summary](#11-accessibility-summary)
12. [Microcopy Reference](#12-microcopy-reference)
13. [Implementation Sequence](#13-implementation-sequence)

---

## 1. Overview

### Feature Summary

Two related share flows:

1. **Share Job Card** — Candidates share a job listing with friends, family, or social media. Triggers the native `Share.share()` API with a formatted text preview and deep link.
2. **Invite Friend** — Any user (candidate or employer) invites contacts to join Hi-Hired. Shows a personal referral code and triggers the native share sheet with an app download link.

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Share trigger** | Native `Share.share()` API | No custom bottom sheet needed. Native share sheet is familiar, supports all targets (Messages, WhatsApp, email, etc.), and is zero-maintenance. |
| **Share button icon** | `↗️` (top-right arrow emoji) | Universal "share" symbol. Distinct from bookmark `🔖`, heart, or apply actions. |
| **Share button placement** | Card overlay + header action | Accessible both from the swipe deck (quick share) and the detail screen (in-context share). |
| **Invite Friend entry** | Profile screen actions list | Natural location — the user is already in "their" space. Profile already has share-resume and other action rows. |
| **Referral code display** | Inline copy + share row | User can copy code manually or share the entire invite message. Avoids a separate modal. |
| **Post-share feedback** | Animated toast | Consistent with `StreakSuperApplyBonus` toast pattern. Bottom-anchored, auto-dismiss 3s. |
| **Image preview** | V1: omitted. V2: server-rendered OG image | Generating a real-time job card screenshot from RN is fragile, requires `react-native-view-shot`, and fails on share sheet on many platforms. V2 can use a server-side OG image (`/api/og/job/:id`). |

---

## 2. Share Job Button — Swipe Card Overlay

**File:** `apps/mobile/components/share/ShareButtonCard.tsx`  
**Used in:** `JobCard.tsx` overlay area (top-right, alongside BookmarkButton)

### 2.1 Component Interface

```tsx
interface ShareButtonCardProps {
  job: Job;
  /** Optional user info for personalising the share message */
  sharerName?: string | null;
}
```

### 2.2 Visual Design

**Single state (no toggle — always action trigger):**

| State | Icon | Visual |
|---|---|---|
| Default | `↗️` | `colors.accent` coloured emoji on semi-transparent dark pill |
| Pressed | — | `opacity-70` via Pressable |
| Disabled (no internet) | `↗️` | Greyed out (`opacity-30`), no press |

### 2.3 Layout

**On Swipe Card (JobCard.tsx content section):**

```
┌──────────────────────┐
│                      │  ←── Photo area (224px)
│   [suburb]           │
│   [hours]            │
│          [JOB TYPE]  │
│                      │
│  [dist] [commute]    │
├──────────────────────┤
│               🔖 ↗️  │  ←── Top-right corner: Bookmark + Share
│ Title                │       absolute positioned below photo area
│ $32/hr               │       right-aligned row, gap: 4
│                      │
│ suburb • hours       │
│ description...       │
└──────────────────────┘
```

**NativeWind placement in JobCard.tsx:**
```tsx
// Inside JobCard.tsx content section, next to BookmarkButton
<View style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
  <View className="flex-row items-center gap-2">
    <BookmarkButton jobId={job.id} isBookmarked={...} onToggle={...} size="md" variant="card" />
    <ShareButtonCard job={job} sharerName={user?.full_name} />
  </View>
</View>
```

### 2.4 Component Skeleton

```tsx
// apps/mobile/components/share/ShareButtonCard.tsx

import React, { useCallback } from 'react';
import { Pressable, Text } from '@/components/tw';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/providers/ThemeProvider';
import { useShareJob } from '@/hooks/useShareJob';  // See §9
import type { Job } from '@hi-hired/shared';

interface ShareButtonCardProps {
  job: Job;
  sharerName?: string | null;
}

export function ShareButtonCard({ job, sharerName }: ShareButtonCardProps) {
  const { colors } = useTheme();
  const { shareJob, isSharing } = useShareJob();

  const handlePress = useCallback(() => {
    if (isSharing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    shareJob({ job, sharerName });
  }, [job, sharerName, shareJob, isSharing]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={isSharing}
      className="w-9 h-9 rounded-full items-center justify-center active:opacity-70"
      style={{
        backgroundColor: isSharing
          ? `${colors.accent}20`
          : `${colors.background}CC`,
        opacity: isSharing ? 0.5 : 1,
      }}
      accessibilityRole="button"
      accessibilityLabel={`Share ${job.title} job`}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text className="text-base" accessibilityElementsHidden aria-hidden>
        ↗️
      </Text>
    </Pressable>
  );
}
```

### 2.5 Accessibility

| Attribute | Value |
|---|---|
| `accessibilityRole` | `button` |
| `accessibilityLabel` | "Share {job.title} job" |
| Hit area | 44×44 effective (`w-9 h-9` + `hitSlop` padding) |

---

## 3. Share Job Button — Job Detail Header

**File:** Placed directly in the candidate Job Detail screen (`app/(candidate)/job/[id].tsx`) as part of the `ScreenHeader` `actions` slot.  
**Reuses:** Share logic from `useShareJob` hook (shared with `ShareButtonCard`).

### 3.1 Visual

```
← Back               ↗️ 🔖 [Expired]
```

**Order (left to right):** Share button → Bookmark button → Status badge (if expired)

**Note:** Share and Bookmark are the same height (`.w-9 h-9`) so the header action row stays aligned.

### 3.2 Integration Code (in job detail)

```tsx
// Inside app/(candidate)/job/[id].tsx, ScreenHeader actions slot
<ScreenHeader
  ...
  actions={
    <View className="flex-row items-center gap-2">
      <ShareButtonCard job={job} sharerName={user?.full_name} />
      <BookmarkButton jobId={job.id} variant="header" size={24} />
      {isExpired && (
        <Text className="text-xs font-semibold px-2 py-1 rounded-full"
          style={{ backgroundColor: '#7f1d1d', color: '#fca5a5' }}>
          Expired
        </Text>
      )}
    </View>
  }
/>
```

### 3.3 Employer Job Detail

**Decision:** The employer's own job detail screen (`app/(employer)/(tabs)/jobs/[id].tsx`) does NOT get a share button. Employers manage jobs; sharing their own listing is less common. Add only if user research confirms demand.

---

## 4. Share Sheet Content Preview

**No custom UI** — this describes what appears when `Share.share()` is invoked.

### 4.1 Share Message Content

When the native share sheet opens, it shows:

```
📋 Job: {title}
👤 {employerName}
💰 {payDisplay}
📍 {suburb}
🕒 {jobTypeLabel}

Join Hi-Hired to browse local jobs: hi-hired://job/{id}
```

**Example output:**
```
📋 Job: Casual Kitchen Hand
👤 Fresh Food Co.
💰 $32–38/hr
📍 Fitzroy
🕒 Casual

Join Hi-Hired to browse local jobs: hi-hired://job/{id}
```

### 4.2 Share Options Configuration

```tsx
const result = await Share.share(
  {
    title: `Hi-Hired — ${job.title}`,
    message: shareText,
    url: deepLinkUrl,      // iOS only — opens as URL attachment
  },
  {
    dialogTitle: 'Share this job',
    subject: `${job.title} on Hi-Hired`,  // iOS email subject
  },
);
```

### 4.3 Deep Link URL

```
hi-hired://job/{jobId}
```

**Note:** `hi-hired://` is the registered URL scheme from `app.config.ts`. Expo Router handles the deep link; it maps to `app/(candidate)/job/[id].tsx`. The URL should also include a fallback web URL for non-app users:

```tsx
const appDeepLink = `hi-hired://job/${job.id}`;
const webFallback = `https://hihired.com.au/job/${job.id}`;
const shareMessage = `${textContent}\n\n${appDeepLink}\n${webFallback}`;
```

This ensures:
- App users: deep link opens directly in the app.
- Non-app users: web URL opens the public listing in their browser.

### 4.4 PostHog Tracking

```tsx
posthog.capture('job_shared', {
  job_id: job.id,
  source: 'card' | 'detail',     // where the share originated
  employer_id: job.employer_id,
});
```

---

## 5. Shared Card Image (Social Preview)

### V1 Decision (MVP): No image generation.

**Rationale:**
- `react-native-view-shot` + `Share.share()` with local image URIs is unreliable across iOS/Android.
- iOS share sheet supports `url` field which can include an image URL, but the image must be remotely hosted.
- MVP timeline: ship text + deep link first. The job details (pay, title) communicate enough value.
- Adding `react-native-view-shot` increases bundle size and adds rejection risk from Apple if the share image is low quality.

### V2 Recommendation: Server-rendered OG image

When ready, implement:

1. **Server endpoint:** `GET /api/og/job/:id` — generates an Open Graph image (1200×630) showing:
   - Hi-Hired logo (top-left)
   - Job title (large, bold)
   - Pay rate (accent colour)
   - Suburb
   - "Apply on Hi-Hired" CTA text
2. **Caching:** Vercel Edge or Supabase storage with CDN. Cache on job `updated_at`. Bust cache when job is modified.
3. **Inclusion in share:**
   ```tsx
   message: `${textContent}\n\n${appDeepLink}\n\n${ogImageUrl}`,
   ```
   iOS may render the image if set as `url`. Android mostly ignores it.

---

## 6. Invite Friend Flow — Profile Screen

**Files:**
- `apps/mobile/components/share/InviteFriendRow.tsx` — NEW standalone row component
- `apps/mobile/components/screens/ProfileScreen.tsx` — MODIFY add the new row

### 6.1 Entry Point

Add an `ActionButton` row between "Saved Jobs" and "Plans & pricing" in the ProfileScreen actions section. Visible for both candidate and employer roles.

```
┌──────────────────────────────────┐
│ 📤 Invite friends                ›│  ←── NEW row
├──────────────────────────────────┤
│ 🔖 Saved Jobs (3)                ›│
├──────────────────────────────────┤
│ 💎 Plans & pricing               ›│
└──────────────────────────────────┘
```

**Emoji:** `📤` ("outbox tray" — universal send/invite metaphor)

### 6.2 InviteFriendRow Component

```tsx
// apps/mobile/components/share/InviteFriendRow.tsx

interface InviteFriendRowProps {
  referralCode: string | null;   // From profiles table or generated client-side
  fullName: string | null;       // Personalize the invite message
  isLoading: boolean;
  error: string | null;
}
```

### 6.3 States

| State | Visual | Microcopy |
|-------|--------|-----------|
| **Default (code loaded)** | Referral code displayed + Share button | "Your referral code: **HIRED-ABC123**" + "📤 Invite friends" CTA |
| **Loading** | Skeleton placeholder for code | "Loading your referral code…" |
| **No code (fallback)** | Show generic invite | "📤 Invite friends" — share generic app link |
| **Copied** | Brief inline "Copied!" fade | Appears next to the code text |
| **Network error** | Inline error state | "Couldn't load referral code. Tap to retry." |

### 6.4 Visual Layout

```
┌──────────────────────────────────────────────┐
│ 📤 Invite friends                            │
│                                              │
│ Refer your friends and help them              │
│ find local work on Hi-Hired.                  │
│                                              │
│ ┌──────────────────────────────────────┐     │
│ │ Your code: HIRED-ABC123     📋 Copy │     │
│ └──────────────────────────────────────┘     │
│                                              │
│ [ 📤 Share invite link ]                     │
└──────────────────────────────────────────────┘
```

### 6.5 Referral Code Generation

**Where it lives:** Store in `profiles.referral_code` column in Supabase. Generate on sign-up (via DB trigger or Edge Function). Format: `HIRED-{6 random alphanumeric chars}`.

**Fallback (if no code stored):** Generate a client-side hash from the user's ID:
```tsx
function generateFallbackCode(userId: string): string {
  const hash = userId.replace(/-/g, '').slice(0, 6).toUpperCase();
  return `HIRED-${hash}`;
}
```

### 6.6 Invite Message Content

```tsx
const inviteText = [
  `${fullName || 'Someone'} invited you to join Hi-Hired! 🎉`,
  '',
  'Find local casual and part-time jobs near you.',
  'Swipe through roles, apply in one tap, and chat with employers.',
  '',
  `Use my referral code: ${referralCode}`,
  '',
  'Download Hi-Hired:',
  'https://hihired.com.au/download',
  '',
  `Or open the app: hi-hired://invite/${referralCode}`,
].join('\n');
```

### 6.7 Interaction Details

**Copy Code button:**
```tsx
// On press:
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
// Copy to clipboard
Clipboard.setStringAsync(referralCode);
// Show "Copied!" inline text for 2s
```

**Share Invite button:**
```tsx
// On press:
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
const result = await Share.share(
  { title: 'Join me on Hi-Hired', message: inviteText },
  { dialogTitle: 'Invite friends to Hi-Hired' },
);
```

### 6.8 Data Fetching

```tsx
// Fetch referral code from profile
const { data: profileData } = await supabase
  .from('profiles')
  .select('referral_code')
  .eq('id', userId)
  .maybeSingle();

const referralCode = profileData?.referral_code ?? generateFallbackCode(userId);
```

---

## 7. Post-Share Confirmation Toast

**File:** `apps/mobile/components/share/ShareToast.tsx`  
**Pattern:** Follows `StreakSuperApplyBonus` exactly (animated, bottom-anchored, auto-dismiss).

### 7.1 Component Interface

```tsx
interface ShareToastProps {
  visible: boolean;
  variant: 'job_shared' | 'invite_sent';
  onDismiss: () => void;
}
```

### 7.2 States

| Variant | Icon | Message |
|---------|------|---------|
| `job_shared` | `↗️` | "Job shared!" |
| `invite_sent` | `📤` | "Invite sent!" |

### 7.3 Visual Design

```
┌─────────────────────────────────────┐
│ ↗️ Job shared!                     │
│ (tap or 3s auto-dismiss)           │
└─────────────────────────────────────┘
```

### 7.4 Implementation

```tsx
// apps/mobile/components/share/ShareToast.tsx

import React, { useEffect } from 'react';
import { View, Text, Pressable } from '@/components/tw';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import * as Haptics from 'expo-haptics';

const CONFIG: Record<string, { icon: string; message: string }> = {
  job_shared:  { icon: '↗️', message: 'Job shared!' },
  invite_sent: { icon: '📤', message: 'Invite sent!' },
};

export interface ShareToastProps {
  visible: boolean;
  variant: 'job_shared' | 'invite_sent';
  onDismiss: () => void;
}

export function ShareToast({ visible, variant, onDismiss }: ShareToastProps) {
  const { colors } = useTheme();
  const translateY = useSharedValue(100);
  const toastOpacity = useSharedValue(0);
  const config = CONFIG[variant] ?? CONFIG.job_shared;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      translateY.value = withDelay(200, withTiming(0, { duration: 350 }));
      toastOpacity.value = withDelay(200, withTiming(1, { duration: 250 }));

      const timer = setTimeout(() => {
        translateY.value = withTiming(100, { duration: 250 });
        toastOpacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onDismiss)();
        });
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      translateY.value = withTiming(100, { duration: 200 });
      toastOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible, variant, translateY, toastOpacity, onDismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: toastOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 90,
          left: 16,
          right: 16,
          maxWidth: 400,
          alignSelf: 'center',
          borderRadius: 14,
          backgroundColor: colors.elevated,
          borderLeftWidth: 4,
          borderLeftColor: colors.accent,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
          zIndex: 100,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 10,
        },
        animatedStyle,
      ]}
      accessibilityRole="alert"
    >
      <Pressable
        onPress={() => {
          translateY.value = withTiming(100, { duration: 200 });
          toastOpacity.value = withTiming(0, { duration: 150 }, () => {
            runOnJS(onDismiss)();
          });
        }}
        className="flex-row items-center gap-3"
        accessibilityRole="button"
        accessibilityLabel={`${config.message} Tap to dismiss`}
      >
        <Text className="text-lg" accessibilityElementsHidden aria-hidden>
          {config.icon}
        </Text>
        <Text className="text-white font-semibold text-sm flex-1">
          {config.message}
        </Text>
        <Text className="text-slate-500 text-xs">✕</Text>
      </Pressable>
    </Animated.View>
  );
}
```

**Positioning Context:** The toast is rendered at the screen level (inside `AppScreen` or the parent layout) so it stays fixed above the tab bar, not scrolled with content.

---

## 8. Error States

### 8.1 Share API Failure

**Trigger:** `Share.share()` rejects or throws (rare — typically user cancelled is not an error; `result.action === Share.dismissedAction` is not an error either).

**What happens:**
- Log the error to PostHog: `posthog.capture('share_error', { error: error.message })`
- Show a brief toast: "Couldn't share — try again"
- No blocking alert — toast is non-modal and non-blocking

```tsx
// Inside useShareJob hook
try {
  const result = await Share.share({ ... });
  if (result.action === Share.sharedAction) {
    return { success: true, cancelled: false };
  }
  return { success: false, cancelled: true };
} catch (error) {
  console.error('[share] API failed:', error);
  posthog?.capture('share_error', { error: String(error) });
  return { success: false, cancelled: false, error };
}
```

### 8.2 No Internet

**Detection:** Check `NetInfo.fetch()` before calling `Share.share()`.

**Note:** `Share.share()` is a local API — it works offline. The failure only occurs if the user then chooses a target that requires internet (e.g., WhatsApp, email). No pre-check needed. However, if fetching the referral code or job data fails due to network, that's handled by React Query's error state.

```tsx
// Optional: lightweight network check before share
import NetInfo from '@react-native-community/netinfo';

async function handleShare() {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    // Show a toast: "No internet connection"
    return;
  }
  // Proceed with share...
}
```

**V1 Decision:** Skip the pre-check. The share sheet will show an error on the chosen target (e.g., WhatsApp will show "No internet") which is platform-expected. Add NetInfo check only if user testing shows confusion.

### 8.3 Content Unavailable

**Trigger:** Job was deleted or expired between loading the screen and pressing share.

**Handling:**
- The `job` object should already be loaded when the share button appears — this state is unreachable in practice.
- If `job` is null/undefined at press time, show a toast: "This job is no longer available."

### 8.4 Invite — Referral Code Load Failure

**Visual:** Inline error in the invite row (not a toast):

```
┌────────────────────────────────────┐
│ ⚠️ Couldn't load your referral     │
│    code. [Tap to retry]            │
└────────────────────────────────────┘
```

- Use React Query's `refetch` on tap
- Fall back to `generateFallbackCode(userId)` if retry fails too

### 8.5 Share Cancellation

**Not an error.** `Share.share()` returns `{ action: 'dismissedAction' }` when the user cancels. Do nothing — no toast, no tracking.

---

## 9. Data Layer & Hook

### 9.1 Hook: `useShareJob`

**File:** `apps/mobile/hooks/useShareJob.ts` — NEW

```tsx
// apps/mobile/hooks/useShareJob.ts

import { useCallback, useState } from 'react';
import { Share, Platform } from 'react-native';
import { usePostHog } from '@/hooks/usePostHog';
import type { Job } from '@hi-hired/shared';

interface ShareJobParams {
  job: Job;
  sharerName?: string | null;
  source?: 'card' | 'detail';
}

interface ShareResult {
  success: boolean;
  cancelled: boolean;
  error?: unknown;
}

export function useShareJob() {
  const [isSharing, setIsSharing] = useState(false);
  const posthog = usePostHog();

  const generateShareText = useCallback((job: Job, sharerName?: string | null): string => {
    const appDeepLink = `hi-hired://job/${job.id}`;
    const webFallback = `https://hihired.com.au/job/${job.id}`;
    const jobTypeLabel = job.job_type?.replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()) ?? '';

    const lines = [
      `📋 Job: ${job.title}`,
      `💰 ${job.pay_display || 'Rate not specified'}`,
      `📍 ${job.suburb}`,
      `🕒 ${jobTypeLabel}`,
      '',
      'Find local work on Hi-Hired:',
      appDeepLink,
      webFallback,
    ];

    if (sharerName) {
      lines.unshift(`👤 Shared by ${sharerName}\n`);
    }

    return lines.join('\n');
  }, []);

  const shareJob = useCallback(async (
    params: ShareJobParams,
  ): Promise<ShareResult> => {
    const { job, sharerName, source = 'card' } = params;

    if (!job) {
      return { success: false, cancelled: false };
    }

    setIsSharing(true);

    try {
      const text = generateShareText(job, sharerName);
      const deepLinkUrl = `hi-hired://job/${job.id}`;

      const result = await Share.share(
        {
          title: `Hi-Hired — ${job.title}`,
          message: Platform.OS === 'android'
            ? `${text}\n\n${deepLinkUrl}`
            : text,
          url: Platform.OS === 'ios' ? deepLinkUrl : undefined,
        },
        {
          dialogTitle: 'Share this job',
          subject: `${job.title} on Hi-Hired`,
        },
      );

      if (result.action === Share.sharedAction) {
        posthog?.capture('job_shared', {
          job_id: job.id,
          source,
          employer_id: job.employer_id,
        });
        return { success: true, cancelled: false };
      }

      return { success: false, cancelled: true }; // Dismissed
    } catch (error) {
      console.error('[useShareJob] Share failed:', error);
      posthog?.capture('share_error', {
        job_id: job.id,
        error: String(error),
        source,
      });
      return { success: false, cancelled: false, error };
    } finally {
      setIsSharing(false);
    }
  }, [generateShareText, posthog]);

  return { shareJob, isSharing };
}
```

### 9.2 Hook: `useReferralCode`

**File:** `apps/mobile/hooks/useReferralCode.ts` — NEW

```tsx
// apps/mobile/hooks/useReferralCode.ts

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

function generateFallbackCode(userId: string): string {
  const hash = userId.replace(/-/g, '').slice(0, 6).toUpperCase();
  return `HIRED-${hash}`;
}

export function useReferralCode() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['referral-code', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.referral_code ?? generateFallbackCode(user.id);
    },
    enabled: Boolean(user?.id),
    staleTime: Infinity, // Referral codes don't change
    retry: 2,
  });

  return {
    referralCode: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? 'Could not load referral code' : null,
    refetch: query.refetch,
  };
}
```

### 9.3 Supabase Schema Addition

Add a `referral_code` column to the `profiles` table:

```sql
ALTER TABLE profiles ADD COLUMN referral_code text UNIQUE;

-- Optional: auto-generate on signup via trigger
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS trigger AS $$
BEGIN
  NEW.referral_code := 'HIRED-' || upper(substr(md5(NEW.id::text), 1, 6));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION generate_referral_code();
```

---

## 10. Theme Compatibility

### 10.1 Token Usage

| Token | Usage |
|-------|-------|
| `colors.accent` | Share button icon colour (on dark pill), toast left border |
| `colors.background` | Share button pill background (`CC` opacity for translucency) |
| `colors.elevated` | Share toast background |
| `colors.border` | Share toast border |
| `colors.text` | Toast message text |
| `colors.muted` | Invite row description text |
| `colors.surface` | Invite row card background |

### 10.2 Theme-Specific Checks

| Variant | Behaviour |
|---------|-----------|
| **Midnight (default)** | Indigo accent — share icon reads well on dark background |
| **Coast** | Teal accent — same contrast, no issues |
| **Bloom** | Rose accent — warmer tone for the invite flow |
| **Hustle** | Amber accent — high contrast on dark backgrounds |
| **Slate** | Neutral grey — keep icon at `colors.accent` or bump to white for legibility |

**No background colour inversion needed.** The semi-transparent dark pill works across all themes because the card background is always dark (`colors.backgroundWash` or `colors.surface`).

### 10.3 Dark/Light Mode

- In dark mode (default): pill background `colors.backgroundCC` + accent icon = high contrast
- In light mode (future): pill background shifts to `rgba(255,255,255,0.9)` with the same accent icon

---

## 11. Accessibility Summary

| Element | Role | Label | Notes |
|---------|------|-------|-------|
| Share button (card) | `button` | "Share {job.title} job" | `hitSlop` ensures 44×44 touch target |
| Share button (detail) | `button` | "Share {job.title} job" | Same label, consistent experience |
| Invite friends row | `button` | "Invite friends" | Standard `ActionButton` pattern |
| Copy code button | `button` | "Copy referral code {code}" | Include the code in the label |
| Share invite button | `button` | "Share invite link" | — |
| Share toast | `alert` | "{message} Tap to dismiss" | Screen reader announces the alert |
| Share toast close | `button` | "Dismiss" | — |
| Error toast | `alert` | "Couldn't share — try again" | — |
| Referral code text | `text` | — | Static text, not interactive |

### Keyboard Navigation (Web)
- Tab order: share buttons in content reading order
- Enter/Space triggers share on focused button
- Escape dismisses toast if focused

---

## 12. Microcopy Reference

### Share Job

| Context | Text | Notes |
|---------|------|-------|
| Share button label | `Share {job.title} job` | `accessibilityLabel` |
| Share dialog title | `Share this job` | `dialogTitle` param |
| Share email subject | `{job.title} on Hi-Hired` | iOS email subject |
| Share title | `Hi-Hired — {job.title}` | Share sheet title |
| Share message (generated) | See §4.1 | Composed in `useShareJob` |
| Success toast | `Job shared!` | — |
| Share error toast | `Couldn't share — try again` | — |
| Job unavailable toast | `This job is no longer available.` | Edge case |

### Invite Friend

| Context | Text | Notes |
|---------|------|-------|
| Profile row label | `Invite friends` | ActionButton label |
| Profile row emoji | `📤` | Tab icon style |
| Description | `Refer your friends and help them find local work on Hi-Hired.` | Subtitle |
| Code label | `Your code:` | Before the code value |
| Copy button | `Copy` | Or tap the code itself |
| Copied feedback | `Copied!` | Inline, 2s |
| Share button | `Share invite link` | CTA |
| Share dialog title | `Invite friends to Hi-Hired` | — |
| Share title | `Join me on Hi-Hired` | Share sheet title |
| Success toast | `Invite sent!` | — |
| Code loading | `Loading your referral code…` | Skeleton text |
| Code error | `Couldn't load your referral code. Tap to retry.` | Inline error |

---

## 13. Implementation Sequence

### Phase 1: Core Share (Est. 2–3 days)

| Step | File / Area | Description |
|------|-------------|-------------|
| 1.1 | `apps/mobile/hooks/useShareJob.ts` | Create share hook with message composition, PostHog tracking |
| 1.2 | `apps/mobile/components/share/ShareButtonCard.tsx` | Create share button component for card overlay |
| 1.3 | `apps/mobile/components/deck/JobCard.tsx` | Add `ShareButtonCard` to content area (top-right, next to bookmark) |
| 1.4 | `apps/mobile/app/(candidate)/job/[id].tsx` | Add `ShareButtonCard` to `ScreenHeader` actions slot |
| 1.5 | `apps/mobile/components/share/ShareToast.tsx` | Create post-share toast component |
| 1.6 | Wire toast into job detail + card share flows | — |

### Phase 2: Invite Friend (Est. 1–2 days)

| Step | File / Area | Description |
|------|-------------|-------------|
| 2.1 | Supabase migration | Add `referral_code` column to `profiles`, trigger for auto-gen |
| 2.2 | `apps/mobile/hooks/useReferralCode.ts` | Create hook to fetch/generate referral code |
| 2.3 | `apps/mobile/components/share/InviteFriendRow.tsx` | Create invite row with copy + share |
| 2.4 | `apps/mobile/components/screens/ProfileScreen.tsx` | Add `InviteFriendRow` to actions section |
| 2.5 | Validate deep link `hi-hired://invite/:code` | Add Expo Router route if needed |

### Phase 3: Polish & Edge Cases (Est. 1 day)

| Step | Description |
|------|-------------|
| 3.1 | Manual QA: share from card, detail, invite — iOS, Android |
| 3.2 | Verify share toast dismisses correctly on both platforms |
| 3.3 | Test referral code generation and fallback |
| 3.4 | Test deep link opens correct job from share message |
| 3.5 | PostHog event verification for `job_shared` and `share_error` |
| 3.6 | Accessibility audit with VoiceOver / TalkBack |

### Phase 4: V2 Social Image (Future, no estimate)

| Step | Description |
|------|-------------|
| 4.1 | Implement `/api/og/job/:id` server endpoint |
| 4.2 | Cache images on CDN |
| 4.3 | Include OG image URL in share message |
| 4.4 | Add `react-native-view-shot` for fallback in-app capture |

---

## Appendix: Files Summary

### New Files

| File | Purpose |
|------|---------|
| `apps/mobile/components/share/ShareButtonCard.tsx` | Share button for swipe card overlay |
| `apps/mobile/components/share/ShareToast.tsx` | Animated post-share confirmation toast |
| `apps/mobile/components/share/InviteFriendRow.tsx` | Invite friends row with copy + share |
| `apps/mobile/hooks/useShareJob.ts` | Share job message composition + API call |
| `apps/mobile/hooks/useReferralCode.ts` | Fetch/generate referral code |

### Modified Files

| File | Change |
|------|--------|
| `apps/mobile/components/deck/JobCard.tsx` | Add `ShareButtonCard` in content section overlay |
| `apps/mobile/app/(candidate)/job/[id].tsx` | Add `ShareButtonCard` in `ScreenHeader` actions |
| `apps/mobile/components/screens/ProfileScreen.tsx` | Add `InviteFriendRow` after Saved Jobs row |
| Supabase migration | Add `referral_code` column + trigger |
