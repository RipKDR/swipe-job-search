# Analytics Plan — Swipe Job Search

## 1. Analytics Stack

| Tool | Purpose |
|------|---------|
| **PostHog** (self-hosted or cloud) | Product analytics, funnels, session recordings, feature flags, A/B tests |
| **Supabase** | Source of truth for business metrics (swipes, matches, hires) |
| **Vercel Analytics** | Web vitals, edge performance |
| **Stripe Dashboard** | Revenue metrics |

PostHog is the primary analytics tool. All events below are PostHog `capture()` calls.

---

## 2. Core KPIs

### North Star Metric
**Weekly Active Swipers** — users who make at least 10 swipes in a 7-day period. This best captures "the app is doing its job."

### Candidate KPIs

| KPI | Target (Month 3) | Target (Month 12) |
|-----|-----------------|------------------|
| D1 Retention | 40% | 55% |
| D7 Retention | 20% | 35% |
| D30 Retention | 10% | 22% |
| Swipes per session | 8 | 15 |
| Sessions per week | 2.5 | 4 |
| Time to first swipe (onboarding) | < 90 seconds | < 60 seconds |
| Onboarding completion rate | 60% | 75% |
| Match rate (% right swipes → match) | 8% | 12% |
| Time to application (card seen → swipe) | < 5 seconds | < 3 seconds |

### Recruiter KPIs

| KPI | Target (Month 6) | Target (Month 12) |
|-----|-----------------|------------------|
| Job posting completion rate | 70% | 82% |
| Candidate reviews per week | 20 | 35 |
| Match-to-interview rate | 40% | 55% |
| Match-to-hire rate | 15% | 25% |
| Time to first match | < 48 hours | < 24 hours |
| Recruiter D30 retention | 55% | 70% |

### Business KPIs

| KPI | Target (Month 6) | Target (Month 12) |
|-----|-----------------|------------------|
| MRR | $8,000 | $35,000 |
| Sponsored job take rate | 3% | 8% |
| Recruiter Pro conversion | 5% | 12% |
| Provider churn | <5%/yr | <3%/yr |
| NPS (candidate) | 30 | 45 |
| NPS (recruiter) | 35 | 50 |

---

## 3. PostHog Event Taxonomy

### Authentication Events
```typescript
posthog.capture('user_signed_up', { method: 'magic_link' | 'google' | 'apple', role: 'candidate' | 'recruiter' | 'provider' })
posthog.capture('user_logged_in', { method: 'magic_link' | 'google' | 'apple' })
posthog.capture('onboarding_step_completed', { step: 1 | 2 | 3, role: string, time_spent_seconds: number })
posthog.capture('onboarding_completed', { role: string, total_time_seconds: number, used_cv_upload: boolean })
posthog.capture('onboarding_abandoned', { step: number, role: string })
```

### Swipe Events
```typescript
posthog.capture('job_card_viewed', { job_id: string, position_in_deck: number, time_on_card_ms: number })
posthog.capture('job_card_swiped', { job_id: string, direction: 'left' | 'right' | 'up', position_in_deck: number, time_to_swipe_ms: number })
posthog.capture('job_details_expanded', { job_id: string, time_on_details_seconds: number })
posthog.capture('deck_exhausted', { jobs_seen: number, jobs_applied: number, session_length_minutes: number })
posthog.capture('swipe_undone', { job_id: string, original_direction: string })
```

### Match Events
```typescript
posthog.capture('match_created', { match_id: string, job_id: string, time_since_candidate_swipe_hours: number })
posthog.capture('match_notification_seen', { match_id: string })
posthog.capture('match_chat_opened', { match_id: string, time_to_open_minutes: number })
```

### Messaging Events
```typescript
posthog.capture('message_sent', { match_id: string, sender_role: string, is_first_message: boolean })
posthog.capture('interview_scheduled', { match_id: string })
posthog.capture('trial_shift_sent', { match_id: string })
posthog.capture('trial_shift_accepted', { match_id: string })
posthog.capture('hire_confirmed', { match_id: string, days_since_match: number })
```

### Recruiter Events
```typescript
posthog.capture('job_created', { job_id: string, industry: string, employment_type: string, has_photos: boolean, tags_count: number })
posthog.capture('job_published', { job_id: string, is_boosted: boolean })
posthog.capture('candidate_reviewed', { job_id: string, decision: 'pass' | 'match' | 'super' })
posthog.capture('job_closed', { job_id: string, reason: 'hired' | 'filled_elsewhere' | 'cancelled' })
```

### Revenue Events
```typescript
posthog.capture('sponsored_job_purchased', { plan: string, price_aud: number, job_id: string })
posthog.capture('pro_subscription_started', { plan: string, mrr_aud: number })
posthog.capture('pro_subscription_cancelled', { plan: string, months_active: number, reason: string })
```

---

## 4. Key Funnels to Track in PostHog

### Candidate Activation Funnel
```
user_signed_up
  → onboarding_step_completed (step: 1)
  → onboarding_step_completed (step: 2)  
  → onboarding_completed
  → job_card_viewed (first)
  → job_card_swiped (first right swipe)    ← Activation event
  → match_created (first match)
```

### Recruiter Activation Funnel
```
user_signed_up (role: recruiter)
  → job_created
  → job_published                          ← Activation event
  → candidate_reviewed (first)
  → match_created (first)
  → message_sent
  → hire_confirmed                         ← Success event
```

### Sponsored Job Conversion Funnel
```
job_published
  → [boost CTA seen]
  → [boost page opened]
  → sponsored_job_purchased                ← Revenue event
```

---

## 5. A/B Test Framework

### Running Experiments (PostHog Feature Flags)

```typescript
// In component
const variant = posthog.getFeatureFlag('onboarding_variant')

if (variant === 'cv_upload_first') {
  return <CVUploadStep />
} else {
  return <PhotosFirstStep />
}
```

### Planned A/B Tests (Priority Order)

| Test | Hypothesis | Metric | Sample Size |
|------|-----------|--------|-------------|
| Onboarding: CV upload vs photos-first | CV upload → better match quality | Match rate | 500/arm |
| Super Apply daily limit: 3 vs 5 | More supers → more engagement | Swipes/session | 1,000/arm |
| Job card: salary front vs detail view | Visible salary → higher right swipe rate | Right swipe % | 2,000/arm |
| Match modal: "Message now" vs "Browse more" CTA | Immediate message prompt → faster first contact | Time to first message | 300/arm |
| Streak mechanic: 3-day vs 7-day | Shorter streak → more achievable → higher D7 retention | D7 retention | 1,000/arm |

---

## 6. Provider Compliance Reporting Metrics

For Asuria and DES providers, a separate compliance dashboard tracks:

| Metric | Description | DSS Reporting Field |
|--------|-------------|-------------------|
| Job search activities | Count of right swipes per candidate per week | "Job applications made" |
| Application methods | "Used job search app" | Activity type |
| Employer contacts | Count of matches (reciprocal interest) | "Employer contacts" |
| Interview attendance | Trial shifts accepted | "Interviews attended" |
| Placement outcome | `hire_confirmed` events | "Employment commenced" |

**Weekly Export Format:**
- PDF: formatted for DSS/DES submission, one page per candidate
- JSON: structured for direct API integration if DSS opens an API
- CSV: bulk export for provider's own reporting tools

---

## 7. Session Recording & Heatmaps

PostHog session recordings are enabled for:
- New users in their first 3 sessions (opt-in during onboarding with clear privacy notice)
- Any user who abandons the onboarding flow
- Recruiter job creation flow (identify drop-off points)

Recordings are automatically deleted after 30 days. No recordings in the chat or profile view (privacy).

---

## 8. PostHog Setup

```typescript
// lib/analytics.ts
import posthog from 'posthog-js'

export function initAnalytics() {
  if (typeof window !== 'undefined') {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
      capture_pageview: false, // manual pageview control in App Router
      session_recording: {
        maskAllInputs: true,     // never record passwords/personal data
        maskInputFn: (text, element) => {
          // mask salary fields and personal info
          if (element?.getAttribute('data-sensitive')) return '***'
          return text
        }
      }
    })
  }
}

// Identify user after auth
export function identifyUser(userId: string, role: string) {
  posthog.identify(userId, { role, platform: 'web' })
}
```

```typescript
// app/layout.tsx — PostHog provider wrapper
// Use posthog-js/react PostHogProvider with the above config
```
