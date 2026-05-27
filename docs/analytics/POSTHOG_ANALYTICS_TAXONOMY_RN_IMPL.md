# PostHog Analytics Taxonomy & RN Implementation 2026

> **Status:** FULL 2026-05-28 by sam (qa/analytics) via swarm SHOULD batch. Per design spec SHOULD (analytics expand) + gap §5 + §4 (docs/analytics/ subdir) + §7 (sam owner). Builds on ANALYTICS_PLAN.md (full taxonomy + KPIs), STACK.md (PostHog 2026-05-27 + RN), GUARDRAILS (optimistic swipe tracking), new INCIDENT/RETENTION (event retention), TESTING (Maestro + feature flag tests).

## Rationale
PostHog is the 2026 primary for product analytics, funnels (onboarding → first swipe → match → hire), session replay, feature flags (swipe weight variants per GUARDRAILS), A/B for beachhead. RN/Expo implementation differs from web (no auto web vitals; manual capture for gestures/haptics; SecureStore + Supabase user identify; background flush). This closes the "no impl" gap in ANALYTICS_PLAN for Expo RN TS monorepo. Enables data-driven iteration on North Star "Weekly Active Swipers" without hunting PostHog RN SDK docs or re-deriving events from 02-mvp / plans.

## 2026 Facts & Sources
- ANALYTICS_PLAN.md (2026-05-27, 84ln + 136 more): Full taxonomy (auth, swipe `job_card_swiped`, match, messaging, recruiter); North Star D1/D7 retention targets; PostHog capture() examples (Next.js style).
- STACK.md 2026-05-27: "PostHog" in analytics stack (self-hosted/cloud); RN compatible; feature flags + replay.
- gap §8 2026-05-28: Context7 expo_dev 86.3 for haptics/notifs (track as events); local Shell confirms PostHog in plan; no new MCP for PostHog but use 2026-05-28 date.
- Supabase 82.6 MCP: realtime for live funnels (e.g. match_created broadcast → PostHog).
- Privacy tie-in (new RETENTION + PRIVACY legal): 30d session recording auto-delete; consent for analytics in onboarding.

## RN/Expo Implementation (2026 SDK)
Install (per STACK monorepo apps/mobile):
```bash
cd apps/mobile
npx expo install posthog-react-native expo-constants  # or @posthog/react-native if preferred 2026
```

Init in `app/_layout.tsx` (Expo Router, cross EXPO_ doc):
```tsx
import { PostHogProvider } from 'posthog-react-native';
import Constants from 'expo-constants';

const posthog = new PostHog(Constants.expoConfig?.extra?.posthogApiKey || '', {
  host: 'https://app.posthog.com', // or self-hosted
  // RN specific 2026: enable session replay if supported, flush interval
});

export default function RootLayout() {
  return (
    <PostHogProvider client={posthog}>
      <Slot />
    </PostHogProvider>
  );
}
```

Identify on auth (after Supabase session, cross EXPO_ SecureStore + AUTH_FLOWS_EXPO):
```ts
posthog.identify(supabaseUser.id, { role: 'candidate', suburb: profile.suburb });
```

Capture adapted taxonomy (from ANALYTICS_PLAN §3, RN-ified for gestures/haptics/notifs per MCP 2026):
```ts
// Swipe (optimistic per GUARDRAILS)
posthog.capture('job_card_swiped', {
  job_id,
  direction: 'right',
  time_to_swipe_ms,
  haptics_triggered: true, // from expo-haptics callback
  position_in_deck,
  used_super: false
});

// Match + notif (cross INCIDENT for delivery tracking)
posthog.capture('match_created', { match_id, job_id, notification_delivered: true /* from listener */ });

// Feature flag for swipe UX experiment (GUARDRAILS weight)
const weight = posthog.getFeatureFlag('swipe_deck_weight_variant') || 'medium';
```

Background / lifecycle (Expo 2026):
- Use `AppState` listener (cross EXPO_ gotchas iOS background): `posthog.flush()` on 'background'.
- For notif deep links: in useNotificationObserver (EXPO_ doc), capture 'notification_opened' + deep link path.

## Funnels & Dashboards (2026)
- Onboarding funnel: signed_up → onboarding_step_completed (1/2/3) → onboarding_completed (target <60s per 02-mvp).
- Swipe → Match: job_card_viewed → job_card_swiped (right) → match_created → match_notification_seen → match_chat_opened.
- Retention cohorts in PostHog UI (D1/D7/D30 per ANALYTICS KPIs).
- Feature flag analytics: % users on 'heavy' haptics variant + swipe rate lift.
- Export to Supabase for custom SQL (e.g. beachhead suburb performance).

## Privacy / Retention / Compliance 2026
- Opt-out: respect PostHog do-not-track + app settings toggle (cross RETENTION plan + PRIVACY legal consent).
- Session replay: 30d auto-delete (config in PostHog + Edge purge hook); PII redaction for job titles if needed.
- Events contain no raw PII beyond user_id (hashed where possible).
- Cross new SENTRY for error correlation with analytics events.

## Testing (Cross TESTING_STRATEGY 2026 RN Update)
- Unit: Vitest mock PostHog client, assert capture on swipe hook.
- E2E Maestro: full onboarding → 3 swipes → assert events in PostHog test project (or capture spy).
- Feature flags: test variant in preview build (EAS checklist).
- a11y: replay + analytics events announced? (low priority, cross a11y checklist).

## Gotchas 2026 (RN/Expo + Supabase)
- No auto pageviews: manual `capture('$pageview')` on router changes (Expo Router useFocusEffect).
- Cold starts / notifs: capture 'app_opened_from_notification' in observer hook before identify (use anon until auth).
- Queue backpressure: if PostHog ingest slow, events buffer locally (RN SDK handles); tie to INCIDENT if >1k unsent.
- Expo Constants extra for keys (never secrets in bundle; EAS env).
- Realtime + analytics dual: match_created DB trigger → Edge → PostHog + push (idempotent).

## References (DRY)
- ANALYTICS_PLAN.md (taxonomy source of truth; this is RN/impl only).
- gap-analysis-2026-05-28.md §5 SHOULD analytics, §8 2026-05-28 MCP (expo_dev for haptics tracking, tool rules), §4 Structure B (analytics/ subdir).
- STACK.md (PostHog decision 2026-05-27, RN/Expo).
- GUARDRAILS.md (2026-05-28 haptics update + optimistic swipe).
- New: docs/ops/INCIDENT_RESPONSE... (event delivery tracking), DATA_RETENTION... (replay purge), docs/a11y/... , docs/testing/... (Maestro), docs/stack/EXPO_... (observer/haptics integration), AUTH_FLOWS_EXPO (identify on login).
- 02-mvp + plans/2026-05-27-001 (funnels for U1-U8).

**New dev test:** Reads this + ANALYTICS_PLAN + STACK + gap §8 + EXPO_ doc; implements capture on swipe deck + identify + flag in <30min, no PostHog docs hunt, events appear in project with correct properties for retention funnel.

*2026 RN patterns + full taxonomy adaptation + privacy hooks + testing. All cites from canonicals + gap. DRY. Ready for scaffold + first PostHog project setup per EAS checklist.*