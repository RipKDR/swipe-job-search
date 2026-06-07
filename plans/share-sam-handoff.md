# Sam Handoff: Share Job Card + Invite Friend Referral

**Author:** Sam (QA + Release + Analytics + Growth Operations)
**Date:** 2026-06-07
**Target:** Hi-Hired — Expo/React Native mobile app + Supabase backend
**Feature:** Share Job Cards Externally + Invite-to-App Referral Programme

**Related docs:**
- [Product Handoff](share-alex-handoff.md)
- [UX Handoff](share-maya-handoff.md)
- [Architecture Handoff](share-jordan-handoff.md)
- [Migration](file:///home/admin/swipe-job-search/supabase/migrations/202606070005_share_invite.sql)

---

## Table of Contents

1. [QA Test Plan](#1-qa-test-plan)
   - [Share Job Card — Functional Tests](#11-share-job-card--functional-tests)
   - [Invite Friend — Functional Tests](#12-invite-friend--functional-tests)
   - [Referral Rewards — Functional Tests](#13-referral-rewards--functional-tests)
   - [Edge Cases](#14-edge-cases)
   - [Integration Points](#15-integration-points)
   - [Regression Tests](#16-regression-tests)
   - [Automated Test Plan (Vitest)](#17-automated-test-plan-vitest)
   - [Accessibility Tests](#18-accessibility-tests)
   - [Performance Tests](#19-performance-tests)
   - [Security Tests](#110-security-tests)
2. [Analytics Event Schemas](#2-analytics-event-schemas)
   - [PostHog Event Definitions](#21-posthog-event-definitions)
   - [Implementation Guidance](#22-implementation-guidance)
3. [Success Criteria Checklist](#3-success-criteria-checklist)
4. [Release Notes Draft](#4-release-notes-draft)

---

## 1. QA Test Plan

### 1.1 Share Job Card — Functional Tests

#### 1.1.1 Share Button Visibility

| ID | Scenario | Prerequisites | Steps | Expected Result | Priority | Type |
|----|----------|---------------|-------|-----------------|----------|------|
| SHARE-FUNC-001 | Share button visible on job detail screen | Job loaded, user authenticated | 1. Navigate to any job detail page<br>2. Look at header action row (top-right) | Share icon (↗️) visible next to bookmark star. Same height as BookmarkButton (w-9 h-9). Not overlapping or hidden. | P0 | Manual + Automated |
| SHARE-FUNC-002 | Share button visible on swipe deck card | Deck has cards loaded | 1. Open swipe deck<br>2. Look at top-right of any card's content area | Share icon (↗️) visible in action area. Positioned next to BookmarkButton in a flex-row with gap-2. Not overlapping bookmark or other elements. | P0 | Manual + Automated |
| SHARE-FUNC-003 | Share button disabled while sharing in progress | IsSharing = true | 1. Tap share button<br>2. Rapidly tap share button again before share sheet opens | Button disabled (opacity 0.5). No double-share. `isSharing` guard prevents second call. | P0 | Manual |
| SHARE-FUNC-004 | Share button accessible via keyboard (web) | Web platform | 1. Tab to share button | Button receives focus. Enter/Space triggers share. `accessibilityRole="button"` set. | P1 | Manual |

#### 1.1.2 Native Share Sheet Content

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| SHARE-FUNC-010 | Tap share opens native share sheet | 1. Tap share icon (card or detail) | Native OS share sheet opens. `Share.share()` API called. Dialog title: "Share this job". Subject: "{job.title} on Hi-Hired". Title: "Hi-Hired — {job.title}". | P0 |
| SHARE-FUNC-011 | Share sheet contains job title | 1. Open share sheet for a job | Message body includes 📋 "Job: {title}". | P0 |
| SHARE-FUNC-012 | Share sheet contains employer name | 1. Open share sheet | Message body includes "👤 {employerName}" line. | P0 |
| SHARE-FUNC-013 | Share sheet contains pay rate | 1. Open share sheet for a job with pay | Message body includes "💰 {payDisplay}" line. Falls back to "💰 Rate not specified" if no pay data. | P0 |
| SHARE-FUNC-014 | Share sheet contains suburb | 1. Open share sheet | Message body includes "📍 {suburb}" line. | P0 |
| SHARE-FUNC-015 | Share sheet contains job type label | 1. Open share sheet for job with job_type | Message body includes "🕒 {jobTypeLabel}" line. Labels formatted: underscores → spaces, title-cased. | P0 |
| SHARE-FUNC-016 | Share sheet contains deep link URL | 1. Open share sheet | Message body includes: `hi-hired://job/{jobId}` deep link and `https://hihired.app/job/{jobId}` web fallback URL. URL is last item in message (not truncated by preview). | P0 |
| SHARE-FUNC-017 | Share sheet includes sharer name when available | 1. User has full_name set<br>2. Open share sheet | Message includes "👤 Shared by {full_name}" at the top of message. | P1 |
| SHARE-FUNC-018 | Share sheet functions without sharer name | 1. User has no full_name<br>2. Open share sheet | Message excludes the "Shared by" line. No crash, no blank line artifact. | P0 |
| SHARE-FUNC-019 | iOS: URL passed as separate `url` param | 1. Run on physical iOS device<br>2. Open share sheet | `Share.share()` called with `url: deepLinkUrl` param (iOS only). URL rendered as rich preview when available. | P0 |
| SHARE-FUNC-020 | Android: URL included in message text | 1. Run on physical Android device<br>2. Open share sheet | `Share.share()` called without `url` param. URL appended to message text with newlines. | P0 |
| SHARE-FUNC-021 | Job type label formatting works | 1. job_type = 'casual' | Renders as "Casual". | P0 |
| SHARE-FUNC-022 | Job type label handles multi-word | 1. job_type = 'part_time' | Renders as "Part Time". | P0 |
| SHARE-FUNC-023 | Job type label handles null job_type | 1. job_type = null | Falls back to "" (empty string). No crash. | P0 |

#### 1.1.3 Share Completion & Return to App

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| SHARE-FUNC-030 | Share completes successfully | 1. Tap share<br>2. Select a share target (e.g., Messages)<br>3. Complete the share | `result.action === Share.sharedAction`. App returns to previous screen. Share toast appears: "Job shared!" | P0 |
| SHARE-FUNC-031 | Share dismissed returns to app without event | 1. Tap share<br>2. Cancel/dismiss the share sheet | `result.action === Share.dismissedAction`. No PostHog event. No toast. No share_events row. App returns to previous screen. | P0 |
| SHARE-FUNC-032 | Share toast auto-dismisses after 3s | 1. Share completes successfully | Toast slides up from bottom. After 3s, toast slides down and dismisses. | P0 |
| SHARE-FUNC-033 | Share toast can be manually dismissed | 1. Toast visible<br>2. Tap toast | Toast dismisses immediately. Runs onDismiss callback. | P0 |

#### 1.1.4 Share Event Recording

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| SHARE-FUNC-040 | Share event recorded in share_events on success | 1. Share completes successfully | `record_share_event` RPC called first (before share sheet opens). RPC returns `allowed: true`, `share_token`. Row inserted in `share_events` with `share_type='job'`. | P0 |
| SHARE-FUNC-041 | Share event NOT recorded on dismiss/cancel | 1. Share sheet dismissed | No `record_share_event` RPC call (or no share_events row created for the share action). | P0 |
| SHARE-FUNC-042 | share_events contains correct sharer_id | 1. Share completes | `sharer_id = auth.uid()` in share_events row. | P0 |
| SHARE-FUNC-043 | share_events contains correct job_id | 1. Share a job | `job_id = job.id` in share_events row. | P0 |
| SHARE-FUNC-044 | share_events contains share_token | 1. Share completes | `share_token` is a 12-char hex string. Unique per share. | P0 |
| SHARE-FUNC-045 | share_events contains share_type='job' | 1. Share a job card | `share_type = 'job'`. | P0 |
| SHARE-FUNC-046 | share_events RLS prevents reading others' shares | 1. User A logs in<br>2. Try to query User B's share_events | Returns empty set. RLS allows SELECT only where `sharer_id = auth.uid()`. | P0 |

#### 1.1.5 Share from Card vs Detail

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| SHARE-FUNC-050 | Share from card has source='card' | 1. Share from swipe deck card | PostHog event fires with `source: 'card'`. Same RPC flow. | P0 |
| SHARE-FUNC-051 | Share from detail has source='detail' | 1. Share from job detail header | PostHog event fires with `source: 'detail'`. Same RPC flow. | P0 |
| SHARE-FUNC-052 | Share from card includes same content as detail | 1. Share same job from card vs detail | Both produce identical share message content. | P0 |

#### 1.1.6 Share Error Handling

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| SHARE-FUNC-060 | Share with missing job data | 1. Attempt share with null/undefined job | Returns `{ shared: false, error: 'Missing job or user data' }`. No native share sheet. No crash. | P0 |
| SHARE-FUNC-061 | RPC fails during share recording | 1. Network error on RPC call | Returns `{ shared: false, error: 'Failed to record share' }`. No share attempt. Toast: "Couldn't share — try again". Error logged to console. | P0 |
| SHARE-FUNC-062 | Share API throws exception | 1. Mock Share.share() to throw | Error caught. PostHog `share_error` event fires with error details. Returns `{ shared: false, error: String(error) }`. | P0 |

### 1.2 Invite Friend — Functional Tests

#### 1.2.1 Invite Friend Row Visibility

| ID | Scenario | Prerequisites | Steps | Expected Result | Priority |
|----|----------|---------------|-------|-----------------|----------|
| INVITE-FUNC-001 | Invite Friend row visible in Profile screen | User logged in, profile screen loaded | 1. Navigate to Profile tab<br>2. Scroll to actions section | Row labeled "📤 Invite friends" visible between Saved Jobs and Plans & pricing. Shows referral code and Share invite link button. | P0 | Manual + Automated |
| INVITE-FUNC-002 | Invite Friend row visible for both candidate and employer | Candidate and employer accounts | 1. Login as candidate → check Profile<br>2. Login as employer → check Profile | Both roles see the Invite Friend row. | P0 |
| INVITE-FUNC-003 | Invite Friend row shows loading state | Slow network | 1. Throttle network to Slow 3G<br>2. Navigate to Profile | Row shows "Loading your referral code…" while data fetches. No blank space. | P0 |

#### 1.2.2 Referral Code Display & Generation

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| INVITE-FUNC-010 | Referral code displayed in Invite Friend row | 1. Navigate to Profile<br>2. View Invite Friend row | Shows "Your code: HIRED-XXXX" with code displayed in monospace font, tracking-wider. Copy button beside it. | P0 |
| INVITE-FUNC-011 | Referral code generated on first visit (lazy generation) | 1. User has no referral_code in DB<br>2. Navigate to Profile | `generate_referral_code()` RPC called. Code generated (8-char alphanumeric). Displayed in UI. Code now stored in `profiles.referral_code`. | P0 |
| INVITE-FUNC-012 | Referral code generated at signup | 1. Sign up as new user | `generate_referral_code()` called during signup or via trigger. Code stored on profiles row. | P0 |
| INVITE-FUNC-013 | Referral code persists across app restarts | 1. Referral code visible<br>2. Force-close and reopen app<br>3. Navigate to Profile | Same referral code shown. RPC returns existing code (idempotent). No re-generation. | P0 |
| INVITE-FUNC-014 | Referral code is unique per user | 1. Check User A's code<br>2. Check User B's code | Both codes are different. `referral_code` column in profiles has UNIQUE constraint. | P0 |
| INVITE-FUNC-015 | Referral code format is correct | 1. View generated code | Format: "HIRED-" prefix + 8 uppercase alphanumeric chars (e.g., "HIRED-A1B2C3D4"). No hyphens inside the 8-char portion. | P0 |
| INVITE-FUNC-016 | Copy code button copies to clipboard | 1. Tap "Copy" button | `Clipboard.setStringAsync(referralCode)` called. Button text changes to "Copied!" for 2s, then reverts. Haptic: Light impact. | P0 |

#### 1.2.3 Invite Share Sheet

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| INVITE-FUNC-020 | Tap "Share invite link" opens native share sheet | 1. Tap "Share invite link" button | Native OS share sheet opens. Dialog title: "Invite friends to Hi-Hired". Title: "Join me on Hi-Hired". | P0 |
| INVITE-FUNC-021 | Invite message includes referral code | 1. Open invite share sheet | Message body includes "Use my referral code: {referralCode}" line. | P0 |
| INVITE-FUNC-022 | Invite message includes sharer name | 1. User has full_name<br>2. Open invite share sheet | Message begins with "{full_name} invited you to join Hi-Hired! 🎉". Falls back to "Someone invited you to join Hi-Hired! 🎉" if no name. | P0 |
| INVITE-FUNC-023 | Invite message includes app download links | 1. Open invite share sheet | Message includes web URL (`https://hihired.app/join?ref={code}&uid={userId}`) and deep link (`hi-hired://invite/{code}`). | P0 |
| INVITE-FUNC-024 | Copy code button copies referral code only | 1. Tap "Copy" button | Only the code string is copied (e.g., "HIRED-A1B2C3D4"). Not the full invite message. | P0 |
| INVITE-FUNC-025 | share_event type='app' recorded on invite share | 1. Share invite link completes | `record_share_event` RPC called with `p_share_type: 'app'`. Row inserted in share_events with `share_type='app'`. | P0 |

#### 1.2.4 Invite Error Handling

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| INVITE-FUNC-030 | RPC error fetching referral code — inline error shown | 1. Mock RPC failure<br>2. Navigate to Profile | Error state renders: "⚠️ Couldn't load your referral code. Tap to retry." Tap triggers `refetch()`. | P0 |
| INVITE-FUNC-031 | RPC error on retry — fallback code generated | 1. RPC fails twice<br>2. React Query retry exhausted | Falls back to client-side `generateFallbackCode(userId)` (hash-based). Generic invite without code attribution shared. | P0 |
| INVITE-FUNC-032 | Invite share error logged but not blocking | 1. Share fails during invite | Error caught. PostHog `invite_friend_error` fires. No crash. No blocking alert. | P0 |

### 1.3 Referral Rewards — Functional Tests

#### 1.3.1 Claim Reward Flow

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| REWARD-FUNC-001 | Pending rewards banner visible on deck | 1. User has pending_rewards > 0 in DB<br>2. Open deck screen | `ReferralRewardBanner` renders above swipe cards. Shows reward card with emoji, label, amount, "Claim →" button. | P0 |
| REWARD-FUNC-002 | Pending rewards banner visible on profile | 1. User has pending_rewards > 0<br>2. Open profile screen | Banner renders at top of profile action section. Same content as deck. | P0 |
| REWARD-FUNC-003 | No banner when no pending rewards | 1. User has 0 pending_rewards<br>2. Open deck or profile | Banner renders `null`. Zero layout shift. | P0 |
| REWARD-FUNC-004 | Banner shows loading state | 1. Slow network<br>2. Open deck | `isLoadingPending` = true → banner renders `null` (don't show loading state for banner). | P0 |
| REWARD-FUNC-005 | Tap banner claims reward | 1. Pending reward visible<br>2. Tap reward card | `claimReward(rewardId)` called. Haptic success feedback. Reward updated to `status='claimed'`, `claimed_at` set. | P0 |
| REWARD-FUNC-006 | Claimed reward removed from pending list | 1. Tap claim on reward<br>2. Banner re-renders | Reward no longer in pending list. Banner re-fetches via invalidated query. If no more pending rewards, banner disappears. | P0 |
| REWARD-FUNC-007 | ClaimAll works for batch claiming (if implemented) | 1. Multiple pending rewards<br>2. Tap "Claim All" (if available) | All rewards marked as claimed. Queries invalidated. Banner disappears. | P1 |
| REWARD-FUNC-008 | Claim error doesn't break UI | 1. Mock claim mutation failure | Error logged. Button stays enabled. User can retry tap. Banner remains visible. | P0 |

#### 1.3.2 Referral Signup Attribution

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| REWARD-FUNC-020 | Referral code input visible on signup | 1. Open signup screen | Collapsible section: "Have a referral code?" Tap to expand. Text input with placeholder "e.g. HIRED-A1B2C3D4". autoCapitalize="characters", maxLength=13. | P0 |
| REWARD-FUNC-021 | Valid referral code creates referral_reward row | 1. Referrer has referral_code 'HIRED-TEST1'<br>2. New user enters 'HIRED-TEST1' on signup<br>3. Complete signup | After `supabase.auth.signUp()` succeeds, `claim_referral` RPC called. `referral_rewards` row created: `referrer_id = referrer_id`, `reward_type = 'super_applies'`, `reward_amount = 1`, `status = 'pending'`. | P0 |
| REWARD-FUNC-022 | Referred user's referred_by set on profile | 1. Claim referral succeeds | New user's profile.referred_by = referrer's UUID. | P0 |
| REWARD-FUNC-023 | Invalid referral code silently fails | 1. Enter invalid code 'HIRED-INVALID'<br>2. Complete signup | `claim_referral` returns `{ error: 'Invalid referral code', success: false }`. No reward created. No blocking alert. Onboarding continues. | P0 |
| REWARD-FUNC-024 | Empty referral code field — no call made | 1. Leave referral code blank<br>2. Complete signup | No `claim_referral` RPC call. Signup proceeds normally. | P0 |
| REWARD-FUNC-025 | Self-referral prevented | 1. User A enters their own referral code on signup | `claim_referral` checks `id != v_new_user_id`. Returns `{ error: 'Invalid referral code' }`. No reward. | P0 |
| REWARD-FUNC-026 | Already-referred user cannot claim again | 1. User was previously referred (referred_by set)<br>2. User enters new referral code | `claim_referral` returns `{ success: true, message: 'Already claimed a referral' }`. referred_by unchanged. | P0 |

#### 1.3.3 Referral Stats

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| REWARD-FUNC-030 | Referral stats query returns correct counts | 1. User has 3 share_events rows, 2 referral_rewards rows, 0 pending | `stats` shows: invites_sent=3, friends_joined=2, pending_rewards=0. | P0 |
| REWARD-FUNC-031 | Stats update after referral | 1. New referral completed<br>2. Stats refetched | friends_joined increments by 1, pending_rewards increments by 1. | P0 |

### 1.4 Edge Cases

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| SHARE-EDGE-001 | Share while offline | 1. Enable airplane mode<br>2. Tap share button | `Share.share()` is a local API — native share sheet opens immediately. RPC call (`record_share_event`) fails silently (fire-and-forget). Share event not recorded. Acceptable for MVP. | P0 |
| SHARE-EDGE-002 | Share rate limit exceeded (30/day) | 1. Generate 30 share events in 24h window<br>2. Attempt 31st share | RPC returns `{ allowed: false, error: 'Daily share limit reached (30)' }`. Toast: "Share limit reached". Share button remains visible but press returns early. No share sheet. | P0 |
| SHARE-EDGE-003 | Fraud detection — >100 shares in 1h | 1. Generate >100 share events within 1h | `profiles.shares_suspended_until` set to `now() + 24h`. Next share RPC returns `{ allowed: false, error: 'Shares suspended until ...' }`. Toast with suspension message. | P0 |
| SHARE-EDGE-004 | Rapid share tapping | 1. Rapidly tap share button 10x in 2s | First tap calls `isSharing` guard → subsequent taps ignored. `isSharing` remains true until share sheet returns. Single share sheet opens. Single RPC call. | P0 |
| SHARE-EDGE-005 | Invalid referral code entered on signup | 1. Enter non-existent code<br>2. Complete signup | `claim_referral` returns error. Silent failure. User proceeds with onboarding. No toast. No blocking. | P0 |
| SHARE-EDGE-006 | Referral code already used by another user | 1. User tries `claim_referral` with a code they already used | Profile.referred_by already set → RPC returns "Already claimed a referral". Idempotent. | P0 |
| SHARE-EDGE-007 | User deletes account — share_events cascade | 1. User deletes account | `share_events` rows with this user's `sharer_id` are deleted (ON DELETE CASCADE). `referral_rewards` where user is `referrer_id` are deleted (ON DELETE CASCADE). `referral_rewards` where user is `referee_id` have `referee_id` set to null (ON DELETE SET NULL). | P0 |
| SHARE-EDGE-008 | Job deleted after share | 1. Job shared, then deleted by employer<br>2. Recipient taps shared link | `share_events.job_id` set to null (ON DELETE SET NULL). App handles expired job: shows "job unavailable" screen with "Browse more jobs" CTA. | P0 |
| SHARE-EDGE-009 | Share to app that doesn't exist on device | 1. Tap share button<br>2. Select WhatsApp (not installed) | Native share sheet handles this platform-natively. Shows "WhatsApp not installed" or grays out the app. No crash. No custom code needed. | P0 |
| SHARE-EDGE-010 | Deep link to job user already swiped left on | 1. User previously disliked a job<br>2. Open shared link to that job | Job detail loads normally. Swipe history doesn't block viewing. User can re-swipe. | P0 |
| SHARE-EDGE-011 | Share a job with no pay data | 1. Job has null pay_display | Share message shows "💰 Rate not specified" instead of pay value. | P0 |
| SHARE-EDGE-012 | Share a job with no suburb | 1. Job has null suburb | Share message shows empty or omitted suburb line. No crash. | P0 |
| SHARE-EDGE-013 | Referral code collision on generation | 1. Two users generate codes simultaneously | Retry-up-to-5 logic in `generate_referral_code()` RPC handles unique_violation. If all 5 retries fail, extended 12-char fallback generated. Near-impossible at <100k users. | P0 |
| SHARE-EDGE-014 | Share_token collision on event recording | 1. Extremely low probability: two concurrent share events | Unique constraint on `share_token`. RPC retries (or just tries once — 6 random bytes = 2.8e14 combinations). No crash on failure (return error to client). | P0 |
| SHARE-EDGE-015 | User opens shared link >30 days after share | 1. Share a job<br>2. Recipient opens link 31 days later | Attribution still counts. `record_share_open` called. Job may be expired. Expired-job handling applies. | P0 |
| SHARE-EDGE-016 | User rate-limited from multiple devices | 1. Share 15 times from phone, 15 from tablet in same day | 31st attempt from either device blocked. Rate limit is per user_id (server-side), not per device. | P0 |
| SHARE-EDGE-017 | System clock manipulation (timezone fraud) | 1. User changes device timezone to extend share window | Rate limit check uses `now()` (server-side Postgres time). Device clock irrelevant. No bypass possible. | P0 |
| SHARE-EDGE-018 | Deep link without app installed lands on web | 1. Recipient without app taps link | Browser loads landing page. Mobile-optimized. Shows job details + App Store/Play Store CTAs. OG meta tags for rich preview. | P0 |
| SHARE-EDGE-019 | Share button on employer job detail | 1. Employer views their own job posting | Share button NOT present in employer job detail. Only candidate-facing. (Decision: add only if user research confirms demand.) | P0 |
| SHARE-EDGE-020 | Share button when job data not loaded | 1. Share button rendered before job fully loads | Button uses guard: if `!job?.id` returns early. Press handler checks job existence. | P0 |
| SHARE-EDGE-021 | Invite friend row when no user session | 1. Logout<br>2. Navigate to Profile | `useReferralCode` hook guarded by `user?.id`. No referral code shown. Row may render "Login to invite friends" or be hidden. | P0 |

### 1.5 Integration Points

| ID | Scenario | Check | Priority |
|----|----------|-------|----------|
| SHARE-INTEGRATION-001 | SwipeCard: ShareButton + BookmarkButton layout | Both visible top-right, side-by-side in flex-row, gap-2. Share icon is ↗️, Bookmark is 🔖. No overlap. Each has independent tap target. Both fit within card container without overflow. | P0 |
| SHARE-INTEGRATION-002 | Job detail header: Share button doesn't break layout | Share button (↗️) left of Bookmark (🔖), then status badge (if expired). Row alignment preserved with or without share button. | P0 |
| SHARE-INTEGRATION-003 | Profile: Row order preserved | Saved Jobs → **Invite Friend (NEW)** → Plans & pricing. InviteFriendRow inserted between these two. ReferralRewardBanner at top of action section. | P0 |
| SHARE-INTEGRATION-004 | Deck: Banner below streak | ReferralRewardBanner renders above swipe cards in a ScrollView. When banner renders null, no layout shift. | P0 |
| SHARE-INTEGRATION-005 | Signup: Referral code input collapsible | Initially collapsed as "Have a referral code?" text. Tap to expand. Text input with correct capitalization and length limit. Value submitted after auth signup succeeds. | P0 |
| SHARE-INTEGRATION-006 | Signup: claim_referral submits after auth signup | On form submit: `supabase.auth.signUp()` → on success → `supabase.rpc('claim_referral', { p_referral_code })`. Silent failure if claim errors. | P0 |
| SHARE-INTEGRATION-007 | Toast rendering context | ShareToast rendered at screen level (not inside scrollable content). Stays fixed above tab bar. zIndex: 100. | P0 |
| SHARE-INTEGRATION-008 | Theme compatibility: 5 themes | Share icon colour uses `colors.accent`. Pill background uses `colors.backgroundCC`. Toast uses `colors.elevated`. Test with all 5 themes: midnight, coast, bloom, hustle, slate. | P1 |

### 1.6 Regression Tests

| ID | Scenario | Steps | Priority |
|----|----------|-------|----------|
| SHARE-REGR-001 | All 233+ existing tests must still pass | Run full test suite: `npx vitest run` | P0 |
| SHARE-REGR-002 | Bookmarks unaffected | Bookmark toggle, bookmark list in Profile, bookmark icon on cards — all work as before | P0 |
| SHARE-REGR-003 | Swipe deck unaffected | Left swipe, right swipe, Super Apply (swipe-up) all work. Card animations, match detection, swipe recording intact. | P0 |
| SHARE-REGR-004 | Job detail screen unaffected | Job title, description, employer info, pay, photos, apply buttons all work. No new layout regressions. | P0 |
| SHARE-REGR-005 | Profile screen navigation unaffected | All existing rows (edit profile, saved jobs, plans & pricing, settings) functional. Tab navigation unchanged. | P0 |
| SHARE-REGR-006 | Auth flow unaffected | Login, signup, logout, token refresh all work. Signup with referral code does not break existing signup paths. | P0 |
| SHARE-REGR-007 | Chat/match unaffected | Messages send/receive, matches list, real-time updates all work. | P0 |
| SHARE-REGR-008 | Streak features unaffected | Streak indicator, milestone overlays, at-risk banner, broken sheet all render and function correctly. Streak counter unaffected by share actions. | P0 |
| SHARE-REGR-009 | Employer job posting unaffected | Create, edit, pause, reactivate jobs all work. | P0 |
| SHARE-REGR-010 | Notification preferences unaffected | Existing notification types (chat, match) still toggle correctly. New share-related NOT added to notification prefs (shares are not push-notified). | P0 |
| SHARE-REGR-011 | Theme system unaffected | All 5 accent themes render correctly with new share elements. | P1 |
| SHARE-REGR-012 | Offline mode (non-share) | Existing offline behavior (cached deck, queued swipes) unchanged. | P1 |
| SHARE-REGR-013 | Deep link routing for existing routes | `hihired://` scheme still routes to existing screens. New share/invite deep links don't conflict. | P0 |
| SHARE-REGR-014 | Zero TypeScript errors | `cd apps/mobile && npx tsc --noEmit` passes with 0 errors. | P0 |

### 1.7 Automated Test Plan (Vitest)

#### New test files to create

| Test File | Location | Est. Tests | Description |
|-----------|----------|-----------|-------------|
| `useShareJob.test.ts` | `hooks/__tests__/` | 12-15 | Unit tests for share hook |
| `useInviteFriend.test.ts` | `hooks/__tests__/` | 6-8 | Unit tests for invite hook |
| `useReferralRewards.test.ts` | `hooks/__tests__/` | 8-10 | Unit tests for rewards hook |
| `share.test.ts` | `lib/__tests__/` | 10-14 | Unit tests for lib/share.ts helpers |
| `ShareJobButton.test.tsx` | `components/share/__tests__/` | 5-7 | Component render tests |
| `useReferralCode.test.ts` | `hooks/__tests__/` | 4-6 | Referral code fetching |

#### `lib/__tests__/share.test.ts` — Proposed Tests

```typescript
// describe('SHARE_TEXT_TEMPLATES.job.message')
//  - builds message with all fields present
//  - includes sharerName when provided
//  - omits sharerName line when null
//  - handles missing pay_display (falls back to "Rate not specified")
//  - includes deep link URL
//  - includes web fallback URL
//  - URL is last in message (not truncated)
//
// describe('SHARE_TEXT_TEMPLATES.invite.message')
//  - builds invite message with name
//  - builds invite message without name (uses "Someone")
//  - includes referral code in body
//  - includes both web and deep link URLs
//
// describe('buildJobShareUrl')
//  - returns correct appDeepLink format
//  - returns correct webFallback format with ?ref= and ?stkn=
//  - fullUrl matches webFallback
//
// describe('buildInviteShareUrl')
//  - returns correct deep link format
//  - returns web fallback with ?ref= and ?uid=
//
// describe('formatJobTypeLabel')
//  - converts snake_case to Title Case
//  - handles single word
//  - handles null/empty
//
// describe('DAILY_SHARE_LIMIT')
//  - equals 30
```

#### `hooks/__tests__/useShareJob.test.ts` — Proposed Tests

```typescript
// describe('shareJob')
//  - calls record_share_event RPC before opening share sheet
//  - builds correct share text
//  - calls Share.share() with correct params
//  - returns { shared: true } on Share.sharedAction
//  - returns { cancelled: true } on Share.dismissedAction
//  - captures PostHog job_shared event on success
//  - does NOT capture on dismiss
//  - captures share_error on exception
//  - returns error when RPC fails
//  - returns error when job or user is missing
//  - sets isSharing=true during share, false after
//  - rate-limited RPC returns { shared: false, error }
//  - generates share_text with correct source parameter
```

#### `hooks/__tests__/useInviteFriend.test.ts` — Proposed Tests

```typescript
// describe('inviteFriend')
//  - calls generate_referral_code RPC
//  - builds correct invite message
//  - calls Share.share() with correct params
//  - captures invite_friend_shared PostHog event on success
//  - captures invite_friend_error on exception
//  - handles missing user gracefully (returns early)
//  - fallback: shares generic link when RPC fails
//  - sets isSharing correctly
```

#### `hooks/__tests__/useReferralRewards.test.ts` — Proposed Tests

```typescript
// describe('pendingRewards')
//  - fetches pending rewards from Supabase
//  - returns empty array when user not authenticated
//  - filters by referrer_id and status='pending'
//  - orders by created_at descending
//  - staleTime set to 30s
//  - refetchOnWindowFocus: true
//
// describe('stats')
//  - counts share_events (invites_sent)
//  - counts referral_rewards (friends_joined)
//  - counts pending referral_rewards
//  - returns zeros for unauthenticated user
//
// describe('claimReward')
//  - updates status to 'claimed'
//  - sets claimed_at to current timestamp
//  - scopes update to reward id AND referrer_id
//  - invalidates pending rewards query on success
//  - invalidates stats query on success
```

#### `components/share/__tests__/ShareJobButton.test.tsx` — Proposed Tests

```typescript
// describe('render')
//  - renders pressable button with ↗️ emoji
//  - has correct accessibility label "Share {title} job"
//  - card variant uses semi-transparent dark background
//  - header variant uses no background
//  - disabled when isSharing is true
//
// describe('interaction')
//  - onPress calls shareJob with job and source
//  - invokes haptic feedback on press
//  - does nothing when isSharing is true
```

#### Test mocks needed

```typescript
// Mock React Native Share
vi.mock('react-native', async () => {
  const RN = await vi.importActual('react-native');
  return {
    ...RN,
    Share: {
      share: vi.fn(),
      sharedAction: 'sharedAction',
      dismissedAction: 'dismissedAction',
    },
    Platform: {
      OS: 'ios',
      select: vi.fn(),
    },
  };
});

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(),
        })),
      })),
    })),
  },
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'test-user-uuid', full_name: 'Test User' } })),
}));

// Mock PostHog
vi.mock('@/hooks/usePostHog', () => ({
  usePostHog: vi.fn(() => ({ capture: vi.fn() })),
}));

// Mock expo-haptics
vi.mock('expo-haptics', () => ({
  default: {
    impactAsync: vi.fn(),
    notificationAsync: vi.fn(),
    ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
    NotificationFeedbackType: { Success: 'success' },
  },
}));

// Mock expo-clipboard
vi.mock('expo-clipboard', () => ({
  default: {
    setStringAsync: vi.fn(),
  },
}));

// Mock TanStack Query (for useReferralRewards)
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn(),
    })),
  };
});
```

### 1.8 Accessibility Tests

| ID | Scenario | Check | Priority |
|----|----------|-------|----------|
| SHARE-A11Y-001 | Share button (card) — screen reader | `accessibilityLabel` reads "Share {job.title} job". `accessibilityRole="button"`. Emoji has `accessibilityElementsHidden`. | P0 |
| SHARE-A11Y-002 | Share button (detail header) — screen reader | Same label as card variant. Consistency across surfaces. | P0 |
| SHARE-A11Y-003 | Touch target ≥ 44pt | Share buttons use `w-9 h-9` (36pt) + `hitSlop` 8pt all sides = 52×52 effective. | P0 |
| SHARE-A11Y-004 | Invite friend row — screen reader | `accessibilityRole="button"`. Label: "Invite friends". | P0 |
| SHARE-A11Y-005 | Copy code button — screen reader | `accessibilityLabel` includes the actual code: "Copy referral code {code}". | P0 |
| SHARE-A11Y-006 | Share invite button — screen reader | `accessibilityLabel`: "Share invite link". | P0 |
| SHARE-A11Y-007 | Share toast — screen reader | `accessibilityRole="alert"`. Announces "Job shared!" or "Invite sent!" and "Tap to dismiss". | P0 |
| SHARE-A11Y-008 | Color contrast — share icon on dark pill | Icon uses `colors.accent`. Semi-transparent background (`CC` opacity). Verify ≥ 3:1 against card background. | P1 |
| SHARE-A11Y-009 | Color contrast — invite row text | Description text `colors.muted`, code text uses tracking-wider. Verify ≥ 4.5:1. | P1 |
| SHARE-A11Y-010 | Reward banner — screen reader | `accessibilityLabel` reads "You earned a {label}. Tap to claim." | P0 |
| SHARE-A11Y-011 | Keyboard navigation (web) | Share buttons reachable via Tab. Enter/Space triggers. Toast dismissible via Escape if focused. | P1 |
| SHARE-A11Y-012 | Haptic respects system preference | If `settings_haptics_enabled` = false, no haptics fire. Check existing `useSettings` hook. | P1 |
| SHARE-A11Y-013 | Reduced motion on toast animations | If `prefers-reduced-motion`, toast uses `withTiming` (fade, no slide). Respect system setting. | P2 |
| SHARE-A11Y-014 | Error states — screen reader | `accessibilityRole="alert"` on inline errors ("Couldn't load your referral code"). | P0 |
| SHARE-A11Y-015 | Referral code field on signup — screen reader | Input has `placeholder` or `accessibilityLabel`. Label: "Referral code (optional)". | P0 |

### 1.9 Performance Tests

| ID | Scenario | Threshold | Priority |
|----|----------|-----------|----------|
| SHARE-PERF-001 | `record_share_event` RPC response time | < 200ms p95 | P0 |
| SHARE-PERF-002 | `generate_referral_code` RPC response time | < 100ms p95 (idempotent, cached lookup) | P0 |
| SHARE-PERF-003 | `claim_referral` RPC response time | < 200ms p95 | P0 |
| SHARE-PERF-004 | Share button press → share sheet visible latency | < 100ms (no async blocking before Share.share()) | P0 |
| SHARE-PERF-005 | Share toast render on success | No frame drop. Toast uses Reanimated with animatedStyle (offsets main thread). | P0 |
| SHARE-PERF-006 | Reward banner query (pending rewards) | < 300ms p95 | P0 |
| SHARE-PERF-007 | Referral code query (staleTime Infinity) | Cache hit: instant. Miss: < 200ms p95. | P0 |
| SHARE-PERF-008 | share_events rate limit query (count 24h) | < 100ms (indexed on sharer_id + created_at) | P0 |
| SHARE-PERF-009 | 10k concurrent share event inserts | No 429 or timeout. Verify Supabase concurrent connection limits. | P1 |

### 1.10 Security Tests

| ID | Scenario | Check | Priority |
|----|----------|-------|----------|
| SHARE-SEC-001 | RLS: share_events SELECT | Verify User A cannot SELECT share_events where `sharer_id != auth.uid()`. | P0 |
| SHARE-SEC-002 | RLS: share_events INSERT | Verify User A cannot INSERT with `sharer_id != auth.uid()`. | P0 |
| SHARE-SEC-003 | RLS: share_events NO UPDATE/DELETE | Verify UPDATE/DELETE blocked by RLS for all users. | P0 |
| SHARE-SEC-004 | RLS: referral_rewards SELECT | Verify User A cannot SELECT rewards where `referrer_id != auth.uid()`. | P0 |
| SHARE-SEC-005 | RLS: referral_rewards INSERT (service_role) | Verify user role cannot INSERT directly. Only RPC/trigger inserts. | P0 |
| SHARE-SEC-006 | RLS: referral_rewards NO UPDATE/DELETE (user) | Verify user cannot UPDATE/DELETE referral_rewards. | P0 |
| SHARE-SEC-007 | claim_referral: self-referral prevention | RPC checks `id != v_new_user_id`. User cannot claim own code. | P0 |
| SHARE-SEC-008 | claim_referral: existing referral not overwritten | RPC checks `referred_by IS NULL` before setting. No overwrite possible. | P0 |
| SHARE-SEC-009 | generate_referral_code: security definer | RPC runs with SECURITY DEFINER. Only generates code for `auth.uid()`. | P0 |
| SHARE-SEC-010 | No PII in PostHog events | Verify `user_id` used as `distinct_id` or property, but no email/name/phone in event props. Share text does not include personal data (only public job data). | P0 |
| SHARE-SEC-011 | Shares suspended_until cannot be modified by user | Column RLS covers it via existing profiles policy. User cannot clear their own suspension. | P0 |
| SHARE-SEC-012 | Rate limit bypass via different devices | Rate limit counted by user_id, not device_id. No bypass. | P0 |
| SHARE-SEC-013 | Share_token uniqueness prevents URL tampering | Unique constraint on share_token. Cannot craft valid share URL without a real token. | P1 |
| SHARE-SEC-014 | Invite share URL does not expose sensitive user data | URL contains `?ref={code}&uid={user_id}`. No name, email, or phone visible. | P0 |

---

## 2. Analytics Event Schemas

### 2.1 PostHog Event Definitions

All events go to PostHog. Events tagged `[RPC]` fire from `record_share_event` RPC's `event_outbox` insert; `[Frontend]` fire from hooks/components.

---

#### `share_job_tapped`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | User taps the share button on a job card or job detail (before share sheet opens) |
| **Fires from** | Frontend (`useShareJob.ts`) — inside `shareJob`, immediately after guard, before RPC call |
| **Rate limit** | Once per share button tap (debounced by `isSharing` guard) |

```typescript
interface ShareJobTapped {
  event: 'share_job_tapped';
  distinct_id: string;
  properties: {
    job_id: string;       // UUID
    source: 'card' | 'detail';
  };
  timestamp: string;
}
```

**Success criteria:** Tap share button → event appears in PostHog. Verify both card and detail sources.

---

#### `share_job_completed`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | User completes share via native share sheet (action === `sharedAction`) |
| **Fires from** | Frontend (`useShareJob.ts`) — after successful `Share.share()` |
| **Rate limit** | Once per share action (can match event naming in Jordan's handoff — `share_job_success` or `job_shared`) |

```typescript
interface ShareJobCompleted {
  event: 'share_job_completed';
  distinct_id: string;
  properties: {
    job_id: string;
    source: 'card' | 'detail';
    channel: string | null;  // null = OS doesn't expose; best-effort
  };
  timestamp: string;
}
```

**Success criteria:** Complete share → event appears with correct job_id, source, channel=null.

---

#### `share_job_dismissed`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | User dismisses native share sheet without sharing (action === `dismissedAction`) |
| **Fires from** | Frontend (`useShareJob.ts`) |
| **Rate limit** | Once per dismiss |

```typescript
interface ShareJobDismissed {
  event: 'share_job_dismissed';
  distinct_id: string;
  properties: {
    job_id: string;
    source: 'card' | 'detail';
  };
  timestamp: string;
}
```

**Success criteria:** Dismiss share sheet → event appears.

---

#### `share_job_error`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | Share API throws exception or RPC returns error |
| **Fires from** | Frontend (`useShareJob.ts`) — catch block |
| **Rate limit** | Once per failure |

```typescript
interface ShareJobError {
  event: 'share_job_error';
  distinct_id: string;
  properties: {
    job_id: string;
    error: string;
    source: 'card' | 'detail';
  };
  timestamp: string;
}
```

**Success criteria:** Mock error → event appears in PostHog with error string.

---

#### `share_job_rate_limited`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | RPC returns `allowed: false` (30/day limit or suspension) |
| **Fires from** | Frontend (`useShareJob.ts`) — after RPC returns `allowed: false` |
| **Rate limit** | Once per blocked attempt |

```typescript
interface ShareJobRateLimited {
  event: 'share_job_rate_limited';
  distinct_id: string;
  properties: {
    job_id: string;
    daily_count: number;
    source: 'card' | 'detail';
  };
  timestamp: string;
}
```

**Success criteria:** Reach rate limit → event fires with correct daily_count.

---

#### `invite_friend_shared`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | User shares invite link via native share sheet (action === `sharedAction`) |
| **Fires from** | Frontend (`useInviteFriend.ts`) |
| **Rate limit** | Once per invite share action |

```typescript
interface InviteFriendShared {
  event: 'invite_friend_shared';
  distinct_id: string;
  properties: {
    has_referral_code: boolean;
    channel: string | null;
  };
  timestamp: string;
}
```

**Success criteria:** Share invite → event appears. Verify `has_referral_code` true when code exists, false on fallback.

---

#### `invite_friend_error`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | Invite share throws exception |
| **Fires from** | Frontend (`useInviteFriend.ts`) — catch block |
| **Rate limit** | Once per failure |

```typescript
interface InviteFriendError {
  event: 'invite_friend_error';
  distinct_id: string;
  properties: {
    error: string;
  };
  timestamp: string;
}
```

**Success criteria:** Mock error → event appears.

---

#### `referral_code_generated`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | `generate_referral_code()` RPC creates a new code (not returning existing one) |
| **Fires from** | Database trigger or RPC via event_outbox — server-side |
| **Rate limit** | Once per code creation per user |

```typescript
interface ReferralCodeGenerated {
  event: 'referral_code_generated';
  distinct_id: string;
  properties: {
    method: 'auto' | 'manual'; // 'auto' = signup trigger, 'manual' = on-demand via profile
  };
  timestamp: string;
  $lib: 'supabase-rpc';
}
```

**Success criteria:** Sign up as new user or generate code from profile → event appears.

---

#### `referral_claimed`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | `claim_referral()` RPC successfully attributes a new user to a referrer |
| **Fires from** | RPC via event_outbox — server-side |
| **Rate limit** | Once per successful claim |

```typescript
interface ReferralClaimed {
  event: 'referral_claimed';
  distinct_id: string;
  properties: {
    referrer_id: string;
    reward_type: string;    // e.g. 'super_applies'
    reward_amount: number;  // 1
  };
  timestamp: string;
  $lib: 'supabase-rpc';
}
```

**Success criteria:** Signup with valid referral code → event appears with correct referrer_id.

---

#### `referral_reward_claimed`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | User taps "Claim" on a pending reward in the RewardBanner |
| **Fires from** | Frontend (`useReferralRewards.ts` claimMutation → onSuccess or PostHog call) |
| **Rate limit** | Once per reward claim |

```typescript
interface ReferralRewardClaimed {
  event: 'referral_reward_claimed';
  distinct_id: string;
  properties: {
    reward_id: string;
    reward_type: 'super_applies' | 'streak_freeze' | 'streak_bonus' | 'badge';
    reward_amount: number;
  };
  timestamp: string;
}
```

**Success criteria:** Claim a reward → event appears with correct type and amount.

---

#### `share_link_opened`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | Recipient opens a shared link (deep link handler or landing page) |
| **Fires from** | `record_share_open` RPC via event_outbox — server-side |
| **Rate limit** | Once per link open (deduped for multiple opens by same recipient) |

```typescript
interface ShareLinkOpened {
  event: 'share_link_opened';
  distinct_id: string;
  properties: {
    share_token: string;
    job_id: string | null;
    recipient_installed: boolean;
  };
  timestamp: string;
  $lib: 'supabase-rpc';
}
```

**Success criteria:** Open a share link → event appears with correct share_token and job_id.

---

#### `referral_signup`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | New user signs up after being referred (stored in Alex's event list) |
| **Fires from** | `claim_referral` RPC or `process-referral-reward` Edge Function via event_outbox |
| **Rate limit** | Once per referred signup |

```typescript
interface ReferralSignup {
  event: 'referral_signup';
  distinct_id: string;
  properties: {
    referrer_id: string;
    reward_type: string;
  };
  timestamp: string;
  $lib: 'supabase-rpc';
}
```

**Success criteria:** Referred user completes signup → event appears.

---

#### `referral_reward_expired`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | Cron or system expiry marks a pending reward as expired |
| **Fires from** | Server-side cron |
| **Rate limit** | Once per reward expiration |

```typescript
interface ReferralRewardExpired {
  event: 'referral_reward_expired';
  distinct_id: string;
  properties: {
    reward_id: string;
    reward_type: string;
  };
  timestamp: string;
  $lib: 'supabase-cron';
}
```

**Success criteria:** Reward expiry cron runs → event appears.

---

### 2.2 Implementation Guidance

#### RPC → PostHog via Event Outbox

For server-side PostHog events, use the existing `event_outbox` infrastructure:

```typescript
// In record_share_event RPC:
insert into public.event_outbox (
  event_type, payload, status
) values (
  'share_created',
  jsonb_build_object(
    'sharer_id', v_user_id,
    'job_id', p_job_id,
    'share_token', v_share_token
  ),
  'pending'
);
```

The existing `outbox.py` processor picks up pending rows and forwards to PostHog.

#### Frontend PostHog Events

Use the existing `usePostHog` hook:

```typescript
import { usePostHog } from '@/hooks/usePostHog';

// Inside component:
const posthog = usePostHog();

posthog.capture('share_job_tapped', {
  job_id: job.id,
  source: 'card',
});
```

#### Event Fire Chart

| Event | Where | Blocking? | Retry? |
|-------|-------|-----------|--------|
| `share_job_tapped` | Frontend | No (fire-and-forget) | No |
| `share_job_completed` | Frontend | No | No |
| `share_job_dismissed` | Frontend | No | No |
| `share_job_error` | Frontend | No | No |
| `share_job_rate_limited` | Frontend | No | No |
| `invite_friend_shared` | Frontend | No | No |
| `invite_friend_error` | Frontend | No | No |
| `referral_reward_claimed` | Frontend | No | No |
| `share_link_opened` | Event Outbox (RPC) | No | Via outbox |
| `referral_claimed` | Event Outbox (RPC) | No | Via outbox |
| `referral_code_generated` | Event Outbox (RPC) | No | Via outbox |
| `referral_signup` | Event Outbox (RPC) | No | Via outbox |
| `referral_reward_expired` | Cron | No | No |

All events are fire-and-forget. Share/job functionality must never depend on analytics delivery.

#### PostHog Dashboard Queries (recommended)

| Query | Events | Insight |
|-------|--------|---------|
| "Share rate by source" | `share_job_tapped` grouped by `source` (card vs detail) | Which surface gets more shares |
| "Share completion funnel" | `share_job_tapped` → `share_job_completed` (funnel) | % of taps resulting in share |
| "Rate-limited user count" | `share_job_rate_limited` | % of power users hitting limits |
| "Invite share rate" | `invite_friend_shared` daily count | Adoption of invite feature |
| "Referral conversion" | `share_link_opened` → `referral_signup` funnel | Viral loop effectiveness |
| "Reward claim rate" | `referral_claimed` → `referral_reward_claimed` funnel | % of users who claim earned rewards |
| "Share error rate" | `share_job_error` daily rate | Health of share infrastructure |
| "Sharing by job" | `share_job_completed` grouped by `job_id` | Which jobs are most shareable |

---

## 3. Success Criteria Checklist

### Pre-Deployment Gate

- [ ] **Migration applied without error**
  - `supabase migration up` runs clean
  - `share_events` table created with correct schema (immutable event log, RLS, indexes)
  - `referral_rewards` table created (RLS, unique pair index)
  - `profiles` columns added (`referral_code`, `referred_by`, `shares_suspended_until`)
  - RLS policies active on both new tables
  - Indexes created (`idx_share_events_sharer`, `idx_share_events_token`, `idx_share_events_job`, `idx_profiles_referral_code`, `idx_referral_rewards_referrer`, `idx_referral_rewards_status`)
  - RPCs installed: `record_share_event`, `record_share_open`, `generate_referral_code`, `claim_referral`
  - Migration verification block passes (assert checks)

- [ ] **All 233+ existing tests pass**
  ```bash
  cd apps/mobile && npx vitest run
  # Expected: 233+ tests, 0 failures
  ```

- [ ] **New share/invite tests pass**
  - `lib/__tests__/share.test.ts` — all tests green
  - `hooks/__tests__/useShareJob.test.ts` — all tests green
  - `hooks/__tests__/useInviteFriend.test.ts` — all tests green
  - `hooks/__tests__/useReferralRewards.test.ts` — all tests green
  - `hooks/__tests__/useReferralCode.test.ts` — all tests green
  - `components/share/__tests__/ShareJobButton.test.tsx` — all tests green

- [ ] **TypeScript zero errors**
  ```bash
  cd apps/mobile && npx tsc --noEmit
  ```

- [ ] **Lint zero errors**
  ```bash
  cd apps/mobile && npx eslint .
  ```

### Functional Verification

- [ ] **Share button visible on job detail screen**
  - Header action row shows ↗️ icon next to 🔖 bookmark
  - Correct `accessibilityLabel` = "Share {job.title} job"

- [ ] **Share button visible on swipe card**
  - Card action area (top-right) shows ↗️ icon next to bookmark
  - No overlap between ShareJobButton and BookmarkButton
  - Both have independent tap targets (hitSlop)

- [ ] **Native share sheet opens with correct content**
  - Dialog title: "Share this job"
  - Message includes: title, employer, pay, suburb, job type
  - Deep link URL (`hi-hired://job/{id}`) present
  - Web fallback URL (`https://hihired.app/job/{id}`) present
  - URL is last item in message (not truncated)

- [ ] **share_events recorded on successful share**
  - `record_share_event` RPC called
  - RPC returns `allowed: true`, `share_token`
  - Row inserted with correct `sharer_id`, `job_id`, `share_type='job'`

- [ ] **Rate limit enforced (30/day)**
  - 31st share attempt in 24h window returns `allowed: false`
  - Toast: "Share limit reached"
  - No share sheet opens

- [ ] **Fraud suspension (100/hour)**
  - >100 shares in 1h → `shares_suspended_until` set 24h
  - Blocked shares show suspension toast
  - Auto-resets after 24h

- [ ] **Invite Friend visible in profile**
  - Row "📤 Invite friends" visible between Saved Jobs and Plans & pricing
  - Shows referral code with Copy button
  - "Share invite link" CTA button

- [ ] **Referral code generated on demand**
  - First time opening Invite Friend → code generated via RPC
  - Subsequent visits → same code returned (idempotent)
  - Code persists across app restarts

- [ ] **Referral code input visible on signup**
  - Collapsible "Have a referral code?" section
  - Text input with `autoCapitalize="characters"`, `maxLength=13`
  - Code submitted after auth signup succeeds (silent failure)

- [ ] **Claim referral creates referral_reward row**
  - New user enters valid code → `claim_referral` RPC succeeds
  - `referral_rewards` row created: `status='pending'`, `reward_type='super_applies'`
  - New user's `profiles.referred_by` set
  - Self-referral prevented

- [ ] **Pending rewards banner visible**
  - ReferralRewardBanner renders on deck + profile
  - Shows reward emoji, label, amount, "Claim →" button
  - Banner hides (null) when no pending rewards — no layout shift

- [ ] **Claim reward flow works**
  - Tap "Claim →" → reward marked `claimed`
  - Banner re-fetches and hides if no more pending rewards
  - PostHog event fires

- [ ] **All 233+ existing tests pass**
- [ ] **0 TypeScript errors**
- [ ] **PostHog events fire correctly** (verify in staging dashboard):
  - `share_job_tapped`, `share_job_completed`, `share_job_dismissed`, `share_job_error`, `share_job_rate_limited`
  - `invite_friend_shared`, `invite_friend_error`
  - `referral_reward_claimed`
  - `share_link_opened`, `referral_claimed`, `referral_code_generated`, `referral_signup`

### Regression Verification

- [ ] **No regression in bookmarks**
  - Toggle bookmark, bookmark list, bookmark icon on cards all work

- [ ] **No regression in swipe deck**
  - Left swipe, right swipe, Super Apply all work

- [ ] **No regression in job detail**
  - Job info, employer info, photos, apply buttons all work

- [ ] **No regression in profile**
  - All existing rows functional, tab navigation unchanged

- [ ] **No regression in streak features**
  - Streak indicator, milestones, at-risk banner, broken sheet all work

- [ ] **No regression in auth**
  - Login, signup (with/without referral code), logout, token refresh

- [ ] **No regression in chat/matches**
  - Messages, match list, real-time updates all work

- [ ] **No regression in employer job posting**
  - Create, edit, pause, reactivate jobs

### Accessibility Verification

- [ ] **Screen reader reads share button labels**
  - "Share {job.title} job" — both card and detail variants

- [ ] **Touch targets ≥ 44pt effective**
  - All interactive share elements meet minimum size

- [ ] **Color contrast passes**
  - Share icon on dark pill ≥ 3:1
  - Invite row description text ≥ 4.5:1

- [ ] **Haptic feedback respects disabled setting**

- [ ] **Error states announced to screen reader**
  - Referral code load failure has `role="alert"`
  - Inline error with retry action

### Staging Smoke Tests (run on staging branch)

```
1. Login → navigate to job detail → tap share → verify share sheet opens with correct content
2. Complete share → verify share_events row created → verify PostHog event
3. Dismiss share → verify no event, no row
4. Navigate to swipe deck → tap share on card → verify same content as detail
5. Generate 30 share events → attempt 31st → verify rate limit toast
6. Navigate to Profile → verify Invite Friend row visible
7. Tap Copy code → verify "Copied!" feedback, clipboard has correct code
8. Tap Share invite link → verify share sheet with referral message
9. Logout → navigate to signup → verify collapsible referral code input
10. Enter valid referral code on signup → verify claim_referral creates reward
11. Login as referrer → verify pending rewards banner on deck
12. Tap claim on reward → verify status changes to 'claimed'
13. Signup with invalid code → verify silent failure, onboarding continues
14. Signup with self-referral code → verify no reward
15. Verify all PostHog events in dashboard
16. Run full regression suite
17. Run accessibility audit (VoiceOver / TalkBack)
```

### Rollback Plan

If Share+Invite feature causes production issues:

```sql
-- Rollback migration (reverse of 202606070005_share_invite.sql):
drop function if exists public.claim_referral(text);
drop function if exists public.generate_referral_code();
drop function if exists public.record_share_open(text, boolean, text);
drop function if exists public.record_share_event(uuid, text);

drop table if exists public.referral_rewards;
drop table if exists public.share_events;

alter table public.profiles
  drop column if exists referral_code,
  drop column if exists referred_by,
  drop column if exists shares_suspended_until;
```

**Safety:** Both new tables are standalone (no existing data depends on them). Coordinate rollback with a frontend deploy that removes `ShareJobButton`, `InviteFriendRow`, `ReferralRewardBanner`, and referral code signup input.

---

## 4. Release Notes Draft

### CHANGELOG.md Entry

```markdown
## [Unreleased]

### Added (2026-06-07 — Share Job Card + Invite Friend Referral)

- **Share Job Card:** Tap the share icon (↗️) on any job card or job detail screen
  to open the native OS share sheet with a formatted message including job title,
  employer, pay rate, suburb, and deep link. Recipients with the app installed
  open directly to the job detail; others see a mobile-optimised landing page.
  - **Share button placement:** Job detail header (next to bookmark) and swipe
    deck card overlay (top-right, alongside bookmark). Accessible from both surfaces.
  - **Share tracking:** Each successful share records a row in the `share_events`
    table with a unique share_token for attribution. No tracking on cancelled shares.
  - **Rate limiting:** 30 shares per rolling 24h window. Fraud detection suspends
    accounts exceeding 100 shares/hour for 24h.

- **Invite Friend Referral Programme:** A dedicated "📤 Invite friends" row in
  the Profile screen displays a personalised referral code and a "Share invite link"
  button. Referred signups are attributed via server-side `claim_referral` RPC.
  - **Referral code:** 8-char alphanumeric code (e.g., "HIRED-A1B2C3D4") generated
    on demand via `generate_referral_code()` RPC. Persists across app restarts.
  - **Referral rewards:** Every successful referral grants the referrer +1 Super
    Apply (pending status, claimable by tapping the reward banner on the deck
    or profile screen).
  - **Referral code on signup:** Optional collapsible field during registration
    — enter a friend's code to attribute your signup. Silent failure if invalid.
  - **Pending rewards banner:** Animated banner on the swipe deck and profile
    showing unclaimed rewards with a "Claim →" button. Hides when empty.

- **New hooks:**
  - `useShareJob` — Builds share text, calls `record_share_event` RPC, opens
    native share sheet, fires PostHog events.
  - `useInviteFriend` — Generates referral code, builds invite message, opens
    share sheet, tracks analytics.
  - `useReferralRewards` — Fetches pending rewards, referral stats, and provides
    a claim mutation with cache invalidation.
  - `useReferralCode` — Fetches the user's referral code (staleTime: Infinity).

- **New components:**
  - `ShareJobButton` — Share icon for card overlay (semi-transparent dark pill)
    and detail header (transparent).
  - `InviteFriendRow` — Referral code display with copy-to-clipboard and share
    invite CTA. Loading, error, and default states.
  - `ReferralRewardBanner` — Animated reward claim banner with emoji, label,
    amount, and claim action. Renders null when no pending rewards.
  - `ShareToast` — Animated bottom-anchored confirmation toast (Reanimated)
    following the StreakSuperApplyBonus pattern. Variants: job_shared, invite_sent.

- **Database:** New `share_events` (immutable share/open log) and `referral_rewards`
  (reward grants) tables with RLS, indexes, and RPCs. `profiles` extended with
  `referral_code` (unique), `referred_by`, and `shares_suspended_until` columns.

- **Analytics:** 12 new PostHog events tracking share taps, completions, dismissals,
  errors, rate limiting, invite shares, referral code generation, attribution,
  reward claims, and link opens. Server-side events via existing `event_outbox`.

### Technical Details

- **New files:** 8 (migration, 4 hooks, 4 components, lib/share.ts)
- **Modified files:** 5 (SwipeCard.tsx, job/[id].tsx, ProfileScreen.tsx, deck.tsx,
  signup.tsx)
- **Approximate delta:** ~1,000 lines of new code
- **Dependencies:** None new (uses existing `Share.share()`, `expo-haptics`,
  `expo-clipboard`, Reanimated, AsyncStorage, Supabase, PostHog, TanStack Query)
- **Migration:** `202606070005_share_invite.sql` — adds share_events + referral_rewards
  tables, profiles columns, RPCs, RLS, indexes, verification block
- **Deep links:** `hi-hired://job/{id}` (existing route) and `hi-hired://invite/{code}`
  (new redirect route)
```

---

*End of Handoff — Sam*
