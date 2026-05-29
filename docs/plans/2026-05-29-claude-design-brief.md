# Hi-Hired — Claude Design Brief

> Updated: 2026-05-29
> Source: Banini-generated UI critique + design session constraints

---

## The Product in One Sentence

Hi-Hired is a swipe-to-apply casual job marketplace for Melbourne — an employer posts a shift, workers in the area see it as a Tinder-style card, swipe right if interested, employer picks who to chat with, both tap "Hired" when it's locked in. No ads, no applications, no keyword search.

---

## Source Code Access

You have read access to the production repo:
https://github.com/RipKDR/swipe-job-search

**Before designing, inspect these existing files** — they define the component architecture, styling patterns, and flows your designs must map to:

| Path | What it tells you |
|---|---|
| `apps/mobile/app/` | Screen routes: `index.tsx`, `(candidate)/`, `(employer)/`, `chat/`, `(onboarding)/`, `(auth)/` |
| `apps/mobile/app.config.ts` | Expo SDK 56 config |
| `apps/mobile/global.css` | Tailwind base / global styles |
| `apps/mobile/tailwind.config.js` | NativeWind Tailwind config |
| `apps/mobile/components/deck/SwipeDeck.tsx` | Existing gesture-driven card stack |
| `apps/mobile/components/deck/JobCard.tsx` | Current card layout |
| `apps/mobile/components/chat/HireBar.tsx` | Hired confirmation flow component |
| `apps/mobile/components/chat/MessageList.tsx` | Chat message rendering |
| `apps/mobile/components/chat/MessageInput.tsx` | Message input |
| `apps/mobile/components/chat/UnmatchSheet.tsx` | Unmatch bottom sheet (modal) |
| `apps/mobile/components/ui/` | UI primitives: Button, TextField, ScreenHeader, EmptyState, LoadingScreen |
| `apps/mobile/components/employer/` | Employer-specific components |
| `apps/mobile/lib/` | Data layer: swipe, auth, routing, gesture, analytics |

**Also read this plan for implementation scope context:**
`docs/plans/2026-05-27-001-feat-hi-hired-mvp-implementation-plan.md`
(14 requirements R1–R13 — auth, swipe deck, employer interested list, job posting, chat, hire confirmation, notifications, EAS)

---

## Deliverable Format

Two-part deliverable:

**Part A — Design Spec (required):** For each screen below, produce:
- Exact layout description (what goes where, spatial hierarchy, what's primary vs secondary)
- Component mapping (which existing components to modify, which new ones to create)
- Exact microcopy for every text element
- Spacing, visual hierarchy, and interaction notes
- Reference to relevant plan requirement (e.g. "maps to R5 candidate swipe deck")

**Part B — HTML Mockup (optional but helpful):** Single self-contained HTML file with 390×844 mobile device frame, clickable/tabbed navigation between screens. Core interactive states working:
- Card drag (left/right tilt indicators, threshold snap-back and fly-off)
- Hired flow state transitions (3 states: no one confirmed → one confirmed → both confirmed)
- Filter pill toggle on Interested List
- Role picker on onboarding

Each screen should feel final — no placeholder copy, no "Lorem ipsum". The design should look like it could ship. Mark each screen with its corresponding app route path.

---

## Visual Foundation

| Token | Value | Role |
|---|---|---|
| Background | `#0f172a` (slate navy) | All screen backgrounds |
| Card surface | `#ffffff` | Elevated content (deck cards, profile cards, form fields) |
| Primary CTA | `#7b61FF` (indigo) | Hired button, Chat button, active filter state, Publish |
| Success | `#10b981` (emerald) | "Available now" badge, Hired confirmation |
| Destructive | `#ef4444` (red) | Pass action, unmatch |
| Secondary surface | `#1e293b` (charcoal) | Form fields, input areas, muted cards |
| Body text | `#f8fafc` (white) | Headings, primary labels |
| Muted text | `#94a3b8` (slate-400) | Secondary labels, timestamps, hints |
| Border/divider | `#334155` (slate-700) | Card borders, dividers |

**Typography:** Inter or SF Pro. Hierarchy through weight (bold vs regular), not color bloat. Headings 18-20px, body 15-16px, secondary 13-14px. Monospace only for codes/prices.

**Spacing:** 12-16px gutters. 8-12px between stacked elements. Cards 12px internal padding. Hit targets ≥44px minimum (WCAG AA).

---

## Product Constraints (Non-Negotiable)

These are locked. Do not redesign the product thesis.

- **No keyword search** — the deck IS the feed. You browse jobs one card at a time.
- **No application forms** — swiping right replaces applying. The employer sees your existing profile.
- **10-second evaluation** — each card shows only: job title, employer, suburb, pay rate, job type badge, shift hours, one-line context. Everything else behind a tap.
- **60-second signup** — role picker → name, suburb, skills tags, availability, work rights. Under a minute.
- **Binary decision only** — right = interested. Left = pass. No bookmark, save, maybe, or shortlist in v1.
- **Gesture alternatives required** — deck has ❌ (pass) and ✅ (interested) tap buttons alongside the swipe gesture. WCAG AA — hit targets ≥44px.
- **Mobile-only portrait** — 390×844 base viewport. Thumb zone. No tablet or desktop layout.
- **Employer-initiated matching** — employer opens chat with a candidate who swiped right. Not bilateral Tinder-style match. This is a job application, not dating.

---

## Voice Guide

The product speaks like one person: a Melburnian cafe owner who needs a shift filled today. Warm, direct, unpretentious.

| ✅ Do | ❌ Don't |
|---|---|
| "Front Counter + Coffee Runner" | "Customer Facing Service Associate III" |
| "$32/hr" | "Competitive Remuneration Package" |
| "Fitzroy" | "Metropolitan Area 3065" |
| "Casual" | "Employment Type: Casual" |
| "Tap Hired to lock in the shift" | "Confirm employment by selecting the Hired button below" |
| "Good arvo, Mia" | "Welcome back, Mia" |
| "12 jobs today" | "You have 12 job opportunities available" |
| "No jobs in your area yet" | "There are currently no open positions matching your criteria" |
| "Busy breakfast rush support" | "Assisting with high-volume morning service operations" |
| "Can start at 6am without drama" | "Available to commence duties at 0600 hours" |

**Rule:** If you'd put it on a sign in a Brunswick cafe window, it's right. If it sounds like an insurance document, rewrite it.

---

## Screens

### 1. Swipe Deck (Worker — Primary Screen)

**Route:** `apps/mobile/app/(candidate)/`

**Purpose:** The entire job discovery experience. One card fills the viewport. No chrome competes.

**Card content (in order from top):**
- Background photo: workplace imagery with authentic Melbourne context (laneway cafe, shopfront, loading dock, warehouse floor). Not stock photography, not corporate.
- Overlay: suburb badge (top-left pill, white bg), job type badge (top-right pill, indigo bg)
- Bottom card panel (semi-transparent dark gradient): job title (bold, large), pay rate (emerald badge, right-aligned), employer name (muted), shift hours (clock icon + text), one-line description (muted)

**During drag:**
- Right tilt: card rotates +5°, green "I'M IN" glow on right edge, scale 1.02x. Release past 40% threshold → card animates off right with "LIKE" flash.
- Left tilt: card rotates -5°, red "PASS" glow on left edge. Release past threshold → card animates off left.
- Release before threshold → card snaps back to center with spring animation.
- Next card slides up from behind.

**Bottom action bar:**
- Two large circular buttons outside the card: ❌ (red border, white fill, left) and ✅ (indigo fill, white checkmark, right).
- No middle button. No bookmark. No "maybe."

**States:**

| State | What Shows |
|---|---|
| Normal | Current card centered, next card peeking from behind |
| Dragging right | Card tilts right, green "I'M IN" indicator grows with drag |
| Dragging left | Card tilts left, red "PASS" indicator grows with drag |
| Swiped right | Card flies right, shrinks, fades → next card enters |
| Swiped left | Card flies left, shrinks, fades → next card enters |
| Empty deck | "No jobs in your area today. Check back tomorrow or tell a local employer about Hi-Hired." + share CTA |
| Loading | Skeleton card with shimmer animation (not spinner) |
| Error | "Couldn't load jobs. Check your connection." + retry button |
| Card detail (tap) | Full job detail view below the card (expandable drawer or new screen) |

**Existing components to modify:**
- `SwipeDeck.tsx` — core gesture + card stack mechanics. Refine visual styling.
- `JobCard.tsx` — card layout. Refine information hierarchy, photo treatment.
- `EmptyDeck.tsx` — empty state copy.
- `SwipeOverlay.tsx` — drag indicators (I'M IN / PASS).

**Plan reference:** R5

---

### 2. Post a Shift (Employer)

**Route:** `apps/mobile/app/(employer)/post-job`

**Purpose:** Employer posts a casual shift in under 60 seconds.

**Form fields (single scrollable page):**
1. Job title — text input
2. Employer/venue name — text input
3. Job type — horizontal pill selector: Casual | Part-time | Full-time (one active)
4. Pay rate — text input with "$/hr" suffix
5. Shift hours — text input (freeform: "Tomorrow · 7am–2pm")
6. Suburb — text input with location pin icon
7. Description — multi-line textarea
8. Cover photo — upload button, compact. Placeholder: "Cafe counter, shopfront, or loading dock"

**Auto-expiry:** Small note beneath: "Listed for 30 days, then expires."

**Bottom fixed bar:** "Save Draft" (outline/ghost, left) | "Publish Job" (indigo solid, right)

**States:**

| State | What Shows |
|---|---|
| Empty form | All fields empty, cursor in title. CTA disabled until required fields filled |
| Filling | Real-time character count on description. Pay rate may show award check badge |
| Complete | All required fields filled. "Publish Job" active |
| Publishing | Button shows spinner, fields lock |
| Published | Toast: "Job posted. We'll let you know when candidates appear." |
| Draft saved | Toast: "Saved. Finish anytime from My Jobs." |
| Error | Inline error on failing field + toast |

**What NOT to include:**
- No "No ad spend" badges or monetisation marketing
- No company size, industry category, screening questions, or EEO declarations
- No helper text that explains the form design rationale ("Balanced setup — the important bits up front")
- No company logo field

**Existing components to modify:**
- `components/employer/JobForm.tsx` — form layout. Tighten spacing, refine field treatment.
- `components/ui/TextField.tsx` — refactor styling.
- `components/ui/Button.tsx` — primary/secondary styling.

**Plan reference:** R7

---

### 3. Interested List (Employer)

**Route:** `apps/mobile/app/(employer)/interested`

**Purpose:** Employer sees candidates who swiped right on their job.

**Layout:**
- **Header:** Job title + suburb subtitle (compact, one line)
- **Stats row (single compact text line):** "18 swiped right · 7 available now · 3 chats open" — NOT three large cards
- **Filter pills:** Horizontal scroll [All | Hospitality | Weekends | Full Rights]. Only if these map to real data fields.
- **Candidate cards:** One per row, dense layout.

**Each candidate card shows:**
- Profile photo (small, circular, left)
- Name + age + suburb (e.g., "Ava Nguyen, 24 · Footscray")
- "Available now" green badge (top-right, small, only if real)
- Headline (one line, e.g., "Retail + café all-rounder")
- Bio (one line)
- Skills tags row: [ POS | Coffee | Stockroom ] (compact pills, max 3-4)
- Inline metadata: 📅 availability text | 🛡️ work rights text
- Single CTA: "Chat" button (indigo, bottom-right)
- Tapping the card body opens full profile view

**States:**

| State | What Shows |
|---|---|
| Has candidates | Card list sorted by relevance |
| Empty (no swipes yet) | "No one has swiped right yet. Share this job to get it in front of local candidates." |
| Filter active, no matches | "No candidates match this filter." + clear filters option |
| After matching | Candidate moves to Chats, stat badges update |
| Loading | Skeleton cards |

**Existing components:**
- `components/employer/` — review existing candidate card components

**Plan reference:** R6

---

### 4. Chat (Both Roles)

**Route:** `apps/mobile/app/chat/[matchId]`

**Purpose:** 1:1 messaging between matched worker and employer. "Hired" confirmation.

**Layout:**
- **Header (compact):** Back arrow (left), avatar thumbnail (tiny), name + shift context ("Sofia · Neighbourhood Pasta / Carlton · Front Counter"). Right: "Unmatch" text button.
- **Profile drawer (collapsible):** Small toggle band: "$32/hr · Tomorrow, 7am–2pm". Tap to expand full profile.
- **Message stream:** Employer messages = grey left-aligned with tiny avatar. Worker messages = indigo right-aligned. Timestamps batched (once per cluster). Date separators for multi-day.
- **Message input:** Compact dark field at bottom. Short placeholder: "Message Sofia..." Send button (indigo).

**Hired flow (state machine):**

1. **Neither confirmed:** Inline prompt: "Tap Hired when the shift is locked in." Hired button neutral.
2. **Worker confirmed:** System message: "✅ You confirmed. Waiting for Sofia to confirm." Hired button shows "Waiting..." disabled.
3. **Employer confirmed:** System message: "✅ [Name] confirmed. Tap Hired to lock it in." Hired button active.
4. **Both confirmed:** Celebration overlay: "🎉 Hired! Front Counter + Coffee Runner at Neighbourhood Pasta." Hired button → "Confirmed" green badge.

**Unmatch:** Tapping "Unmatch" opens confirmation dialog: "Unmatch with [Name]? This cannot be undone." Confirm / Cancel. No persistent warning cards in the UI.

**States:**

| State | What Shows |
|---|---|
| Newly matched, no messages | Empty chat. Input: "Say hello and confirm the shift details..." |
| Active conversation | Message bubbles, normal chat layout |
| One side confirmed | System message in timeline. Hired button updates |
| Both confirmed | 🎉 celebration. Chat continues but tagged |
| Unmatching | Dialog confirmation first. On confirm: return to match list |
| Loading | Skeleton bubbles |

**Existing components:**
- `components/chat/HireBar.tsx` — Hired flow component. Add state machine.
- `components/chat/MessageList.tsx` — message rendering. Refine bubble styling.
- `components/chat/MessageInput.tsx` — input styling.
- `components/chat/UnmatchSheet.tsx` — already uses bottom sheet (good pattern, keep).

**Plan reference:** R8, R9

---

### 5. Worker Profile

**Route:** `apps/mobile/app/(candidate)/profile`

**Layout:**
- **Header:** Back arrow (left). "Profile" title. "Edit" text button (right).
- **Profile card:** Photo (circular, left), name + suburb (right), skills tags row ([ Hospitality | Retail ]). "Available now" green ring on photo.
- **Bio:** One paragraph. 2-3 lines max.
- **Stats row (compact single line):** "46 swipes right · 12 chats · 4 hired" — only if real data, hide at zero.
- **Details (compact list):**
  - ✦ Top skills: Coffee, POS, table service, cash handling
  - 📅 Availability: Mon–Thu mornings, weekends anytime
  - 🛡️ Work rights: Australian citizen
  - 📍 Preferred area: Inner North & Melbourne CBD
  - Each one line with icon. No chevrons unless they expand.

**What NOT to include:**
- No profile strength meter
- No "Keep it fresh so the right shifts find you"
- No "Share profile" button (v2 feature)
- No "Worker mode" persistent label
- No two-button bottom row — "Edit" in header, not bottom CTA

**Plan reference:** R4 (profile completion)

---

### 6. Onboarding / Role Picker

**Route:** `apps/mobile/app/(onboarding)/`

**Flow:**
1. **Role picker:** Two large cards — "I want work" (worker, top) and "I need staff" (employer, bottom). Tap → profile form for that role.
2. **Worker form:** Photo (optional), name, suburb, experience (short text), skills tags (select), availability (time slot grid), work rights (picker). Submit → swipe deck.
3. **Employer setup:** Photo (optional), business/venue name, suburb, about (short text). Submit → Post a Shift or empty Interested List.

**States:**

| State | What Shows |
|---|---|
| Role picker | Two clear CTAs, no login barrier |
| Filling form | Form fields, minimal chrome |
| Validation error | Inline error on wrong field |
| Complete | Smooth transition to main experience |

**Existing components:**
- `components/onboarding/` — review existing flow components.

**Plan reference:** R4

---

### 7. Match Celebration

**Route:** appears as overlay in `apps/mobile/app/chat/[matchId]`

**Purpose:** Moment of delight when both sides confirm Hired.

**What it looks like:**
- Full-screen overlay from Chat screen when both sides tap Hired
- Background: dark transparent overlay (slate navy, 90% opacity)
- Large "🎉 Hired!" text centered
- Job title + employer/worker name below
- Confetti particles (respect `prefers-reduced-motion`)
- Duration: 2 seconds auto-dismiss, or tap to dismiss
- Returns to Chat screen with "Hired ✅" badge

---

## Empty State Reference (All Screens)

| Screen | Empty State |
|---|---|
| Swipe Deck | "No jobs in your area today. Check back tomorrow or tell a local employer about Hi-Hired." + share CTA |
| Interested List | "No one has swiped right yet. Share this job to get it in front of local candidates." |
| Chats list (inbox) | "No conversations yet. Match with a candidate or swipe right on a job to start chatting." |
| My Jobs (employer) | "You haven't posted any jobs yet. Post your first shift — it takes 60 seconds." |
| Chat (no messages) | Input present, no history. Placeholder: "Say hello and confirm the shift details..." |
| Filter (no matches) | "No candidates match this filter." + clear filters button |

---

## Pet Peeves / Anti-Patterns Checklist

Check every screen against this before finalising:

- [ ] No marketing copy inside UI ("Fast, local, and straight to the shift details")
- [ ] No instructional text on buttons ("Both sides can confirm with Hired" below a "Hired" button — delete)
- [ ] No dev guardrails as UI ("Before unmatching: If messages have been sent, show a confirmation first" as a persistent card — replace with real dialog)
- [ ] No persistent role labels ("Worker Mode" / "Employer Mode" on every screen — users know who they are)
- [ ] No profile strength meters or completion percentages
- [ ] No two-button pattern on candidate cards (one CTA per card)
- [ ] No three-action buttons on swipe deck (binary only — ❌ and ✅, no bookmark)
- [ ] No bloated profile cards in chat (compact sticky header, not 40% viewport)
- [ ] No monetisation marketing ("No ad spend" badges — premature)
- [ ] No content that explains design decisions ("Balanced setup — the important bits up front", "Deck only" filter chip)
- [ ] No AI-design sludge: glassmorphism, rainbow gradients, generic SaaS cards with icons everywhere, fake metrics, decorative dashboards
- [ ] Design references existing component names from the repo where applicable
- [ ] Designs account for React Native/NativeWind constraints (no CSS grid, no container queries — use Flexbox)
- [ ] No stock photography — workplace imagery should feel like real Melbourne (laneways, cafes, loading docks)

---

## Verification

Before delivering, check:
- [ ] Console errors on the HTML mockup (open in browser, check console)
- [ ] All 7 screens covered (swipe deck, post a shift, interested list, chat, worker profile, onboarding, match celebration)
- [ ] All empty states covered
- [ ] Hired flow has all 3 states
- [ ] Voice passes the "Brunswick cafe sign" test
- [ ] No anti-patterns from the checklist above

---

## Sources

- **Design constraints derived from:** 2026-05-29 Banini critique session (Hermes session)
- **Implementation scope:** `docs/plans/2026-05-27-001-feat-hi-hired-mvp-implementation-plan.md` (R1–R14)
- **Codebase:** `https://github.com/RipKDR/swipe-job-search` (`main` branch)
- **Stack:** Expo SDK 56, React Native, NativeWind/Tailwind CSS, Supabase, TypeScript, pnpm monorepo
