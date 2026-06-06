# Hi-Hired Production Readiness Gap Analysis

**Date:** 2026-06-06
**Auditor:** Alex (caretaker agent)
**Context:** Pre-demo/launch readiness review against Asuria partnership, Melbourne casual jobs strategy, and general production requirements.

---

## Executive Summary

Hi-Hired has a strong functional core — swipe deck with real-time chat, hire confirmation, push notifications, employer interested list, job posting, compliance reporting foundation, and 29 database migrations. **However, the gap between a functional demo and a production launch is significant.** The app is roughly 60% toward MVP-complete in feature surface but **under 30% toward production-readiness** when legal, compliance, monetization, trust & safety, and operational maturity are factored in.

The Asuria demo meeting is achievable with the current codebase + some targeted work. A public App Store launch requires addressing most P0 and P1 items below.

---

## P0 — Launch Blockers (Must Fix Before Any Public or Provider Demo)

### 1. No Payment / Monetization Infrastructure

| Item | Status | Details |
|------|--------|---------|
| Stripe integration | ❌ None | No Stripe SDK, no Edge Function webhooks, no product IDs configured |
| Subscription management | ❌ None | No subscription tiers, no plan switching, no billing history |
| Sponsored job purchasing | ❌ None | "Local Boost" ($49/wk) and "City Boost" ($129/wk) from BUSINESS_MODEL.md are unimplemented |
| Recruiter Pro tiers | ❌ None | Free tier caps (2 active jobs) not enforced; no upgrade flow |
| Pricing screen | 🟡 Placeholder | `pricing.tsx` is a static UI with "COMING SOON" badge — no actual payment logic |

**Impact:** Cannot generate any revenue. The business model (BUSINESS_MODEL.md) calls for $2,000 MRR by month 3 via sponsored jobs + provider contracts. Without Stripe, this is zero.

**Files to create:**
- `supabase/functions/stripe-webhook/index.ts` — handle checkout.session.completed, invoice.paid, subscription events
- `apps/mobile/lib/stripe.ts` — Stripe Checkout/payment sheet integration
- Migration: `subscriptions` table, `sponsored_jobs` table, job visibility priority ordering RLS
- Update `supabase/migrations/202605270013_rls.sql` for sponsored job ordering

---

### 2. No Privacy Policy, Terms of Service, or Consent Collection

| Item | Status | Details |
|------|--------|---------|
| Privacy policy screen | ❌ None | No in-app privacy policy display or link |
| Terms of service | ❌ None | Required for App Store, especially for a hiring platform |
| Consent collection during onboarding | ❌ None | No checkbox or screen for data processing consent |
| Bulk-swipe consent flag (profiles table) | ✅ Migrated | `bulk_swipe_consent` column exists in migration 022, but **not surfaced in any UI** |
| Data retention/purge policy | ❌ None | No automated cleanup of old swipes, matches, or messages |

**Impact:** App Store rejection risk (Apple requires privacy policy for apps collecting personal data). Privacy Act 1988 violation risk — collecting swipes, matches, messages, work rights without explicit consent. Asuria partnership requires consent flag to be user-configurable.

**Files to create:**
- `apps/mobile/app/(onboarding)/consent.tsx` — consent/privacy screen during onboarding
- `apps/mobile/app/(legal)/privacy.tsx` — standalone privacy policy view
- `apps/mobile/app/(legal)/terms.tsx` — terms of service
- Migration: `consent_log` table for audit trail of consent changes
- Update `apps/mobile/app/(onboarding)/_layout.tsx` to include consent step

---

### 3. Fair Work Compliance — Incomplete

| Item | Status | Details |
|------|--------|---------|
| Pay minimum validation in JobForm | ✅ Present | `isBelowFairWorkMinimum()` warns employers if below minimum wage |
| Casual/fixed-term conversion notice | ❌ None | Fair Work requires informing casuals of conversion rights after 12 months |
| Award rate display on job cards | 🟡 Basic | `pay_display` shown but no award classification, no link to Fair Work pay guides |
| Superannuation guarantee disclosure | ❌ None | Job ads should mention super is additional |
| Employer ABN verification | ❌ None | No check that employer has a valid ABN before posting jobs |

**Impact:** Legal liability — platform could be facilitating non-compliant job ads under the Fair Work Act. The casual employment provisions (amended 2024-2026) require specific disclosures.

**Files to create:**
- `apps/mobile/components/forms/FairWorkDisclaimer.tsx` — shown on job posting form
- `backend/src/services/abn_lookup.py` — ABN verification via ABN Lookup API (free, public)
- Update `apps/mobile/components/deck/JobCard.tsx` to show "Super not included" or award rate indicator
- Update `apps/mobile/app/(employer)/(tabs)/post-job.tsx` to require ABN or verify via business name

---

### 4. Trust & Safety — No Automated Moderation

| Item | Status | Details |
|------|--------|---------|
| Report user | ✅ Implemented | `ReportSheet.tsx` + `submitReport()` lib function |
| Block user | ✅ Implemented | `BlockConfirm.tsx` + `blockUser()` lib function |
| Automated content moderation | ❌ None | No flagging of inappropriate job titles, descriptions, or profile text |
| Review queue for reported content | ❌ None | No admin dashboard or automated review flow |
| Image moderation | ❌ None | No NSFW/inappropriate image detection for job or profile photos |
| Rate limiting on reports | ❌ None | No abuse prevention for report/block spam |

**Impact:** Within hours of a public launch, a bad actor could post inappropriate job content that stays visible until manually reviewed. App Store requirement: apps with user-generated content must have content moderation.

**Files to create:**
- `supabase/functions/moderation-check/index.ts` — AI or pattern-based content flagging
- Admin moderation queue (web app or extends provider dashboard)
- Image moderation integration (AWS Rekognition or similar)
- Update `apps/mobile/components/forms/JobForm.tsx` with on-submit content screening

---

### 5. No Employer Verification or Trust Signals

| Item | Status | Details |
|------|--------|---------|
| Employer verification badge | ✅ DB field | `employer_profiles.verified` column exists |
| ABN verification flow | ❌ None | No way to become verified — badge cannot be earned |
| Employer reviews/ratings | ❌ None | No reputation system for employers |
| "Verified employer" shown | 🟡 Partial | `VerificationBadge` component exists in ProfileScreen but never activates (no verification flow) |

**Impact:** Candidates have no way to distinguish genuine employers from scammers or fake job posters. Kills trust in the marketplace. The Asuria partnership requires verified employers for DES candidates.

---

## P1 — Significant Gaps (Required Within 2-4 Weeks of Launch)

### 6. Asuria/Provider Portal — Bare Minimum Built

| Feature | Status | Details |
|---------|--------|---------|
| Compliance report generation | ✅ Basic | `ComplianceScreen` exists, generates reports via backend API |
| Compliance report PDF download | ✅ Basic | Download + share flow works |
| Compliance report rows (per-candidate) | ✅ Implemented | `compliance_report_rows` table + detail views |
| Mentor dashboard | ❌ None | The full caseload view with candidate activity monitoring |
| Bulk-swipe ("Blast") | ❌ None | Mentor applying on behalf of candidates |
| Private (pre-market) job feed | ❌ None | Asuria-only jobs visible only to their candidates |
| Mutual obligations logging | ❌ None | Every swipe logged as DSS activity point automatically |
| Support-person co-management | ❌ None | Co-manage profiles for candidates needing extra support |
| Asuria Verified badge integration | ❌ None | Badge showing provider endorsement on candidate profile |

**Impact:** Asuria demo will show compliance reports working, which is the key selling point. But the full enterprise value proposition (mentor dashboard, bulk-swipe, mutual obligations automation) cannot be demonstrated.

---

### 7. Accessibility & DES Compliance

| Item | Status | Details |
|------|--------|---------|
| Screen-reader support (basic) | 🟡 Partial | `accessibilityRole` and `accessibilityLabel` on many but not all components |
| High-contrast modes | ❌ None | Theme system exists but no high-contrast variant |
| Font scaling / dynamic type | ❌ None | Many `text-sm` / `text-base` hardcoded |
| WCAG 2.2 AA audit | ❌ None | No formal accessibility audit performed |
| VoiceOver/TalkBack testing | ❌ None | No testing documented |
| Focus management for modals/sheets | ❌ None | ReportSheet, BlockConfirm, UnmatchSheet — no focus trapping |

**Impact:** Since Asuria does DES work, the app **must** be accessible per DDA (Disability Discrimination Act) requirements. This is a hard requirement for the partnership, not optional.

---

### 8. Job Search & Discovery Limitations

| Item | Status | Details |
|------|--------|---------|
| Radius filter | ✅ Implemented | `RadiusFilter.tsx` works |
| Category/industry filter | ❌ None | All jobs shown in single deck |
| Keyword search | ❌ Deliberate | By design (v1 MVP says no search) |
| Saved/bookmarked jobs | ❌ Deliberate | By design (deck IS the bookmark) |
| Suburb-specific browsing | 🟡 Partial | Location shown on cards, but no suburb selector on deck |
| "Recently posted" sort | ❌ None | Deck ordering appears random |
| Commute distance badge | ✅ Implemented | `CommuteBadge.tsx` shows proximity |

**Impact:** As the job count grows (currently 40+ Adzuna imported jobs), the single-deck model breaks down. Candidates can't filter to "hospitality only" or "northern suburbs only." This is a UX problem for retention, not a launch blocker.

---

### 9. Employer Experience — Missing Self-Serve Tools

| Item | Status | Details |
|------|--------|---------|
| Post job | ✅ Implemented | JobForm + post-job screen |
| View interested candidates | ✅ Implemented | InterestedList screen |
| Match / start chat | ✅ Implemented | createMatch mutation |
| Job pause/archive | ✅ Implemented | Toggle status button |
| Job edit | ✅ Implemented | Edit job screen |
| Bulk actions on interested candidates | ❌ None | No select-all, batch message, batch mark as reviewed |
| Candidate filtering/sorting | ❌ None | No sort by skills, experience, distance, or recency |
| Analytics dashboard | ❌ None | No job view counts, swipe statistics, match rates |
| CSV export of interested candidates | ❌ None | No data export for employer's own records |
| Trial shift scheduling | ❌ Planned | `onProposeTrialShift` callback exists in `MatchCelebration` but does nothing |
| Job renewal/republish | ❌ None | Expired jobs have no "Republish" button |
| Job performance metrics | ❌ None | How many views, how many swipes, how many matches |

**Impact:** The employer experience is functional but bare-bones compared to candidate side. Employers who post a job and see 50 interested candidates have no tools to manage that pipeline efficiently. This directly affects retention and the "Recruiter Pro" subscription proposition.

---

### 10. Onboarding Completeness

| Item | Status | Details |
|------|--------|---------|
| Role select screen | ✅ Implemented | `role.tsx` |
| Candidate profile form | ✅ Implemented | `candidate-profile.tsx` |
| Employer profile form | ✅ Implemented | `employer-profile.tsx` |
| Work rights collection | ✅ Present | `work_rights` field in profile |
| Privacy consent step | ❌ Missing | No consent collection during signup |
| Employer ABN validation | ❌ Missing | No check that employer has valid Australian business registration |
| Email verification requirement | ❌ Not enforced | Magic link sent but employer can post jobs without confirmation |
| Profile photo upload | ✅ Implemented | `avatar-upload.ts` |
| Circle assignment on signup | ❌ Not implemented | New employers don't auto-join a circle — prevents job posting |
| "Complete later" path | ❌ None | No skip/complete-later for onboarding |

**Impact:** Employer onboarding has a hard failure path: if `circle_id` is null, job posting throws a confusing error. Missing consent step is a privacy compliance gap. Missing ABN validation is a trust/safety gap.

---

### 11. Push Notifications — Edge Cases

| Item | Status | Details |
|------|--------|---------|
| Expo push registration | ✅ Implemented | `usePushRegistration.ts` — token registration |
| Notification processor Edge Function | ✅ Implemented | Queue-based processing with retries |
| Notification types (interest, match, message, hire) | ✅ Implemented | All 4 types handled |
| Android notification channels | ❌ None | No Android-specific channel configuration |
| Notification preferences screen | 🟡 Partial | Settings screen exists but notif toggles may not be wired to `notification_preferences` table |
| Notification deep links | ❌ None | Tapping a notification doesn't navigate to the specific chat/match |
| Badge count | ❌ None | No app icon badge count |
| Daily re-engagement nudge | ❌ None | PRD specifies personalised "23 new barista roles" notification |
| Streak reminder notification | ❌ None | PRD spec: "Streak at risk!" at 22:00 AEDT |

**Impact:** Notifications work for core flows but lack the retention mechanics (streak reminders, re-engagement nudges) described in PRD.md. Android users get a degraded experience (all notifications on one default channel).

---

### 12. Analytics PostHog Implementation

| Item | Status | Details |
|------|--------|---------|
| PostHog client init | ✅ Implemented | `usePostHog.ts` + `lib/posthog.ts` |
| Event tracking (swipe, match, message, hire) | ✅ Implemented | `posthog.capture()` calls in key flows |
| User identity tracking | 🟡 Partial | `posthog.identify()` likely called but not verified in auth flow |
| Feature flags | ❌ None | No PostHog feature flags for gradual rollouts |
| Funnel analysis setup | ❌ None | No funnels configured for onboarding, swipe-to-match, match-to-hire |
| Retention tracking | ❌ None | No cohort/retention tracking configured |
| Dashboard/reporting | ❌ None | No PostHog dashboard defined |
| ANZ data residency | ❌ Unknown | PostHog Cloud EU or US? May need AU data sovereignty for DES compliance |

**Impact:** Hard to measure success metrics (D7 retention, match rate, onboarding completion) without proper analytics setup. The metrics in PRD.md (Table in §5) are untrackable.

---

## P2 — Important but Deferrable (Post-Launch Improvement)

### 13. Market-Specific Melbourne Features

| Feature | Status | Detail |
|---------|--------|--------|
| Public transport proximity badge | ✅ Implemented | CommuteBadge.tsx shows tram/train proximity |
| Hospitality-specific skill tags | 🟡 Present | Generic skills list includes barista/customer service but no "La Marzocco" or "latte art" |
| Suburb vibe/description | ❌ None | No suburb context (e.g. "Fitzroy — creative hub") |
| Adzuna data integration | ✅ Implemented | 40 imported Melbourne jobs in seed |
| Adzuna data freshness | ❌ Unknown | No re-sync mechanism for imported jobs |
| Melbourne tech hub focus (Cremorne/Richmond) | ❌ None | No special handling for "Melbourne Tech" sector |
| Trial shift booking | 🟡 Stub | `onProposeTrialShift` is a no-op callback |

### 14. Internationalization (i18n)

| Item | Status |
|------|--------|
| Multi-language support | ❌ None |
| Right-to-left layout | ❌ None |
| Currency formatting (AUD) | 🟡 Hardcoded `$` prefix |

**Impact:** Low priority for Melbourne-only launch but needed for national expansion.

### 15. SRE / Operational Maturity

| Item | Status | Details |
|------|--------|---------|
| Sentry integration | ✅ Configured | `lib/sentry.ts`, `Sentry.init` in app |
| Error boundary | ✅ Implemented | `ErrorBoundary.tsx` in UI components |
| CI/CD (GitHub Actions) | ✅ Present | Typecheck, lint, test run on push |
| E2E tests (Maestro) | 🟡 Present | `.maestro/` directory exists but unknown coverage |
| Load testing | ❌ None | No performance testing for matching or notification queue |
| Error monitoring dashboard | ❌ None | No Sentry dashboard or alert rules configured |
| Uptime monitoring | ❌ None | No synthetic checks for auth, job posting, or chat flows |
| Database backup verification | ❌ Unknown | Supabase backups should be configured in project settings |
| Incident runbook | ❌ None | No documented procedure for notification failures, match errors, or auth outages |

### 16. Candidate Profile Depth

| Feature | Status |
|---------|--------|
| Photo upload | ✅ Implemented |
| Experience text | ✅ Implemented |
| Skills tags (up to 5) | ✅ Implemented |
| Availability text | ✅ Implemented |
| Work rights | ✅ Implemented |
| Resume upload | ❌ Deliberately excluded in v1 |
| Video introduction | ❌ Deferred |
| LinkedIn import | ❌ Deferred |
| Employment history (structured) | ❌ Not in MVP |
| Education history | ❌ Not in MVP |

### 17. Anti-Ghosting & Candidate Experience

| Feature | Status | Details |
|---------|--------|---------|
| Anti-ghosting tables | ✅ Implemented | Migration 026 creates anti-ghosting infrastructure |
| Anti-ghosting notifications | ❌ Not triggered | Tables exist but no automated nudges to employers |
| Rejection feedback | ✅ Implemented | Migration 025 + component exists |
| Streak mechanic | ❌ Not implemented | PRD describes streaks but no code exists |
| Super Apply | ❌ Not implemented | PRD describes scarcity mechanic (3/day) but no code |
| Jobs applied list | ✅ Implemented | `applied.tsx` tab |
| Share job card | ❌ Not implemented | No viral loop mechanics |
| Daily job quota notification | ❌ Not implemented | Re-engagement nudge described in PRD |

---

## Asuria Meeting Readiness Assessment

**Scenario:** You need to demo to Asuria next week. Here's what they'd see.

### ✅ What Works Now (Demo-Ready)

1. **Candidate flows:** Sign up (magic link), build profile, swipe deck with Melbourne jobs, view job details, see commute badges, filter by radius
2. **Match flow:** Employer sees interested candidates, creates a match, both parties enter chat
3. **Chat:** Real-time messaging, hire confirmation (both parties), unmatch with confirmation
4. **Employer flow:** Post job (title, type, pay, hours, suburb), see interested candidates, start chat
5. **Push notifications:** Interest received, match created, message received, hire confirmed
6. **Compliance reports:** Generate a report for a candidate showing swipe activity, matches, hires. Download as PDF.

### ❌ What Doesn't Work (Needs Prep)

1. **No provider/mentor login flow:** The `(provider)` route group exists with a compliance screen but there's no provider-specific auth. You'd need to demo from a "candidate" or "employer" account.
2. **No mentor dashboard:** Can't show "your 50 candidates at a glance"
3. **No bulk-swipe:** Can't demonstrate mentor applying on behalf of a candidate
4. **No mutual obligations automation:** Can't show DSS activity code logging
5. **No Asuria branding/mention in app:** No "Asuria Verified" badge, no Asuria logo anywhere
6. **No private job feed:** Can't show "Asuria-exclusive" jobs

### Recommended Asuria Demo Prep (1-2 Weeks)

| Week | Task | Effort |
|------|------|--------|
| Wk 1 | Wire up provider role auth; create a demo provider account with 5-10 candidate profiles | 2 days |
| Wk 1 | Build a basic mentor dashboard page (candidate list → swipe activity per candidate) | 3 days |
| Wk 1 | Add "Asuria Mentor" badge to candidate profile cards (static, no real backend) | 0.5 day |
| Wk 2 | Polish compliance report UX; pre-generate a demo report with realistic data | 1 day |
| Wk 2 | Rehearse the pitch: compliance automation saves 3-5 hrs/week per mentor | 0.5 day |

**Total:** ~7 development days for a credible Asuria demo. Do NOT try to demo Stripe/monetization.

---

## App Store Submission Readiness

| Requirement | Status | Gap |
|-------------|--------|-----|
| Apple Developer Program account | ❌ Unknown | Not mentioned in any doc |
| Google Play Developer account | ❌ Unknown | Not mentioned |
| Privacy policy URL | ❌ Missing | Required by both stores |
| Terms of service | ❌ Missing | Required |
| Age rating (17+ for work info?) | ❌ Not configured | App Store Connect |
| Screenshots (iPhone 6.7" + iPad) | ❌ Missing | For store listing |
| App description + keywords | ❌ Missing | For ASO |
| Content moderation system | ❌ Missing | Apple requires user-generated content moderation |
| Account deletion flow | ❌ Missing | Required by Apple since 2022 |
| Data export (GDPR/privacy) request handling | ❌ Missing | Not mentioned |

**Impact:** Even if the app is feature-complete, App Store submission would fail privacy policy check. Account deletion is a hard requirement.

---

## Effort Estimates Summary

| Priority | Area | Estimated Effort | Key Deliverable |
|----------|------|------------------|-----------------|
| P0 | Stripe/payments | 5-7 days | Stripe webhook + checkout + subscription tables |
| P0 | Privacy/consent/TOS | 3-5 days | Consent screen, privacy view, terms, consent_log table |
| P0 | Fair Work compliance | 3-5 days | ABN lookup, award rate display, super disclosure |
| P0 | Trust & safety moderation | 5-7 days | Content moderation, admin review queue, image scanning |
| P0 | Employer verification flow | 2-3 days | ABN check → verified badge flow |
| P1 | Provider portal (full) | 10-15 days | Mentor dashboard, bulk-swipe, private feed, mutual obligations |
| P1 | Accessibility for DES | 5-7 days | Full WCAG audit, high-contrast theme, dynamic type, focus management |
| P1 | Search/discovery filters | 3-5 days | Category filter, suburb selector, recently posted sort |
| P1 | Employer tools | 5-7 days | Candidate filtering, bulk actions, CSV export, job analytics |
| P1 | Onboarding completeness | 3-5 days | Consent step, ABN validation, email verification, circle auto-join |
| P1 | Notifications polish | 3-5 days | Android channels, deep links, badge count, streak reminders |
| P1 | Analytics setup | 3-5 days | PostHog funnels, retention tracking, dashboards |
| P2 | Melbourne-specific features | 5-7 days | Skill tags, trial shift booking, tech hub focus |
| P2 | Ops/runbooks/SRE | 5-7 days | Incident docs, load testing, monitoring |
| P2 | App Store material | 3-5 days | Screenshots, description, age rating, account deletion |
| P2 | Streaks/Super Apply/viral | 5-7 days | Retention mechanics from PRD |

### Total For Production Launch: ~55-80 days (12-16 weeks with 1 full-time dev)

### Total For Asuria Demo (credible): ~7 days targeted prep

---

## Recommended Immediate Next Steps

1. **Create the Asuria demo checklist** and execute against it (7 days) — this is the most time-sensitive deliverable
2. **Implement consent collection during onboarding** (2 days) — minimum privacy compliance for demo
3. **Set up Stripe test mode + webhook** (3 days) — unblock monetization path
4. **Implement employer ABN verification + verified badge flow** (2 days) — trust signal for demo
5. **Hire/assign a part-time legal reviewer** for Fair Work compliance, privacy policy, and terms of service text — do not write these yourself
6. **Pause all new feature development** until P0 items have engineering estimates and owners
7. **Escalate**: The current codebase is not ready for public App Store release. The Asuria demo is achievable. Make a go/no-go decision on which to target.

---

*Generated by Alex (caretaker agent) — 2026-06-06*
