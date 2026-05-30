<wizard-report>
# PostHog post-wizard report

The wizard completed a deep, supplemental integration of PostHog into the Hi-Hired Expo app. The project already had a solid PostHog foundation — a web-safe client (`lib/posthog.ts`), an env-gated `usePostHog` hook, `PostHogProvider` + manual `expo-router` screen tracking in `app/_layout.tsx`, `identify()` on profile load and `reset()` on sign-out in `providers/AuthProvider.tsx`, plus ~11 product events (role/onboarding/job_posted/swipe/match/hire/unmatch/report/block).

This run filled the biggest measurement gaps without changing any architecture:

- **Authentication funnel (was completely untracked).** Instrumented the magic-link and OAuth flows in `app/(auth)/login.tsx` and the session-completion step in `app/(auth)/callback.tsx`, so the top of the conversion funnel is now visible end-to-end.
- **Login failure / friction signal.** `login_failed` is captured on every auth error path (rate-limit, OAuth error, cancellation, callback failure, exception) with `method` and `reason` properties.
- **Chat engagement.** `message_sent` now fires when a user sends a chat message to a match — the key post-match retention signal.
- **Supply-side churn.** `job_deck_emptied` fires once when a candidate swipes through every available job and hits an empty deck.
- **Employer review funnel.** `interested_candidates_viewed` fires when an employer opens a job's interested-candidate list.
- **Error tracking.** Added `$exception` capture in the auth, callback, and chat-send error paths (message, type, and context), complementing PostHog's automatic exception capture.

All additions reuse the existing `usePostHog()` hook and snake_case event-naming convention, are env-gated (no-op when PostHog isn't configured), and carry no PII in payloads. Verified with `tsc --noEmit`, `eslint .` (0 errors), `vitest run` (118 passing), and a successful `expo export` web bundle.

| Event | Description | File |
| --- | --- | --- |
| `magic_link_requested` | Email submitted to receive a passwordless magic link (top of auth funnel). | `apps/mobile/app/(auth)/login.tsx` |
| `magic_link_sent` | Supabase accepted the request and the magic-link email was dispatched. | `apps/mobile/app/(auth)/login.tsx` |
| `oauth_sign_in_started` | User tapped a social sign-in button (`provider`: google/apple). | `apps/mobile/app/(auth)/login.tsx` |
| `login_failed` | An auth attempt failed (`method`, `reason`, `rate_limited`). Friction/churn signal. | `apps/mobile/app/(auth)/login.tsx`, `apps/mobile/app/(auth)/callback.tsx` |
| `login_completed` | Auth callback established a session — user is signed in (`method`). | `apps/mobile/app/(auth)/callback.tsx` |
| `message_sent` | A user sent a chat message to a match (`match_id`). Engagement/retention. | `apps/mobile/app/chat/[matchId].tsx` |
| `job_deck_emptied` | Candidate exhausted the deck — no jobs left (`jobs_seen`). Churn signal. | `apps/mobile/hooks/useJobDeck.ts` |
| `interested_candidates_viewed` | Employer opened a job's interested-candidate list (`job_id`, `candidate_count`). | `apps/mobile/app/(employer)/(tabs)/jobs/[id]/interested.tsx` |
| `$exception` | Captured errors in auth, callback, and chat-send paths (message/type/context). | `login.tsx`, `callback.tsx`, `chat/[matchId].tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/1648183) — auth, activation, match-to-hire, and churn at a glance
- [Authentication funnel](/insights/LjOAfqkU) — magic-link requested → sent → signed in
- [Candidate activation funnel](/insights/l8HePjxp) — sign in → pick role → finish onboarding → first swipe
- [Match to hire funnel](/insights/WMbXuvbt) — match created → message sent → hire confirmed
- [Login failures by reason](/insights/V5qwHpZU) — failed logins over time, split by failure reason
- [Deck exhaustion (churn signal)](/insights/sByWVrAy) — candidates who swiped through every available job

> These insights will populate once the instrumented build sends events to PostHog project `251748`. They complement the earlier `Analytics basics` dashboard (`/dashboard/1639010`), which covers the hire funnel, swipe activity, onboarding, jobs posted, and unmatch/block churn.

### Agent skill

We've left an agent skill folder in your project (`.claude/skills/integration-expo`). You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
