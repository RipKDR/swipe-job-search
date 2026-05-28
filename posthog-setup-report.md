<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Hi-Hired Expo mobile app. The integration wires `posthog-react-native` into the root layout, identifies users from Supabase Auth sessions, tracks all critical business events across the candidate and employer journeys, and captures churn signals in the chat screen.

**Files created:**
- `apps/mobile/lib/posthog.ts` — PostHog singleton client (env-gated, debug mode in dev)

**Files modified:**
- `apps/mobile/app/_layout.tsx` — Added `PostHogProvider` wrapping the app, and `useEffect` for manual screen tracking via `posthog.screen()` on every Expo Router pathname change
- `apps/mobile/providers/AuthProvider.tsx` — Added `posthog.identify()` with role/email/suburb on session restore, and `posthog.reset()` + `user_signed_out` capture on sign-out
- `apps/mobile/lib/analytics.ts` — Updated stub to call the real PostHog client via the singleton
- `apps/mobile/app/(onboarding)/role.tsx` — `role_selected` on Continue press
- `apps/mobile/app/(onboarding)/candidate-profile.tsx` — `candidate_onboarding_completed` on successful profile submit
- `apps/mobile/app/(onboarding)/employer-profile.tsx` — `employer_onboarding_completed` on successful profile submit
- `apps/mobile/hooks/useJobDeck.ts` — `job_swiped` with direction and job_id after each successful swipe
- `apps/mobile/app/(employer)/(tabs)/post-job.tsx` — `job_posted` with job_type, pay_period, has_photo, has_description
- `apps/mobile/hooks/useCreateMatch.ts` — `match_created` in `useMutation` onSuccess callback
- `apps/mobile/app/chat/[matchId].tsx` — `hire_confirmed`, `user_unmatched`, `user_reported`, `user_blocked`

## Events

| Event | Description | File |
|-------|-------------|------|
| `role_selected` | Candidate or employer selects their role during onboarding | `app/(onboarding)/role.tsx` |
| `candidate_onboarding_completed` | Candidate successfully submits their profile | `app/(onboarding)/candidate-profile.tsx` |
| `employer_onboarding_completed` | Employer successfully submits their profile | `app/(onboarding)/employer-profile.tsx` |
| `job_swiped` | Candidate swipes left (skip) or right (interested) on a job card | `hooks/useJobDeck.ts` |
| `job_posted` | Employer successfully posts a new job listing | `app/(employer)/(tabs)/post-job.tsx` |
| `match_created` | Employer initiates a match with an interested candidate | `hooks/useCreateMatch.ts` |
| `hire_confirmed` | A hire confirmation is submitted in the chat | `app/chat/[matchId].tsx` |
| `user_unmatched` | A user unmatch action is completed in the chat | `app/chat/[matchId].tsx` |
| `user_reported` | A user submits a report against another user | `app/chat/[matchId].tsx` |
| `user_blocked` | A user blocks another user from the chat screen | `app/chat/[matchId].tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/1639010)
- [Hire conversion funnel](/insights/uMHFWalU) — Onboarding → Swipe → Match → Hire step-by-step drop-off
- [Swipe activity over time](/insights/qcT2M75N) — Right vs left swipes per day
- [Onboarding completions by role](/insights/72gOhUwa) — Candidate and employer signups over time
- [Jobs posted over time](/insights/yV8lEIK3) — Employer job post volume per day
- [Churn signals: unmatches and blocks](/insights/uLeWL9C7) — Unmatch, block, and report trends

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-expo/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
