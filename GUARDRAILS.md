# Guardrails & Developer Hooks

## 1. UX Guardrails (The "Tinder Feel")
- **Gesture Physics:** Cards must have "weight." Do not just snap them out. Use Framer Motion's `spring` transition.
- **Visual Feedback:** 
  - Show a green "APPLY" indicator on the right during a drag.
  - Show a red "PASS" indicator on the left during a drag.
  - Scale the card slightly (1.05x) when dragged.
- **Haptics:** If targeting mobile via Capacitor or Expo, trigger a light haptic tap on swipe completion.

## 2. Technical Guardrails
- **Data Privacy:** Use Supabase RLS policies. A user should never be able to see who swiped on them unless it's a "Match" (business logic decision).
- **Concurrency:** Use `upsert` for swipes to prevent duplicate entries if a user double-taps or glitches.
- **Image Optimization:** Use Next.js `<Image />` component or Supabase Image Transformation to prevent large 5MB job photos from killing the deck performance.

## 3. Developer Hooks (For Claude Code/Testing)
- **Mock Data:** Use a `lib/mocks.ts` file initially so Claude can build the UI without waiting for a database connection.
- **Storybook:** (Optional but recommended) Build the `JobCard` in isolation first.
- **Testing:** 
  - Ensure gesture tests are written using `fireEvent` in Vitest/RTL.
  - Verify that "Swiping Left" results in a `DELETE` from local state but a `POST` to the "ignored" list.

## 5. Accessibility Guardrails (DES/Asuria Compliance)
- **Contrast:** High-contrast mode toggle for users with visual impairments.
- **Gesture Alternatives:** Simple "Tap" buttons (❌ and ✅) as alternatives to the "Swipe" gesture for users with motor-control limitations.
- **Screen Reader Hooks:** Descriptive ARIA labels for every card (e.g., "Job Card: Barista at St Ali, South Melbourne. Salary 55 to 65k. Swipe right to apply.").

## 5. Custom Hooks (Logical Separation)
- `useSwipe`: Handles the transition logic between cards and the backend `POST`.
- `useMatchListener`: Uses Supabase Realtime to alert the user the moment a recruiter swipes back.
- `useJobDeck`: Manages the queue and fetching of the next 20 job cards.

## 6. WCAG 2.2 AA Compliance Checklist

Required for DES/Asuria partnership and AU Disability Discrimination Act obligations.

| Criterion | Requirement | Implementation |
|-----------|------------|---------------|
| 1.1.1 Non-text Content | All images have alt text | Every `<Image>` has descriptive `alt`; decorative images use `alt=""` |
| 1.3.1 Info and Relationships | Semantic HTML structure | Use `<main>`, `<nav>`, `<article>` — no `<div>` soup |
| 1.4.3 Contrast (Minimum) | 4.5:1 for normal text, 3:1 for large | Check all text/background combos with Figma A11y plugin |
| 1.4.11 Non-text Contrast | 3:1 for UI components | Swipe indicator badges, action buttons, card borders |
| 2.1.1 Keyboard | All functionality keyboard-accessible | Action buttons reachable via Tab; swipe via arrow keys |
| 2.4.3 Focus Order | Logical tab order | Card → Pass button → Apply button → Super button |
| 2.4.7 Focus Visible | Visible focus indicator | Custom focus ring: `ring-2 ring-indigo-500 ring-offset-2` |
| 2.5.3 Label in Name | Button accessible names match visible label | "❌ Pass" button: `aria-label="Pass this job"` |
| 3.2.2 On Input | No unexpected context changes | Swipes confirmed by gesture completion, not on drag start |
| 4.1.2 Name, Role, Value | ARIA on custom components | SwipeDeck: `role="feed"`, cards: `role="article"` |
| 4.1.3 Status Messages | Screen reader announcements | Match overlay: `role="alert"` with "It's a match" text |

### Automated Accessibility Testing
```bash
# Add to CI pipeline
npm install -D @axe-core/playwright
# Run axe audit on every Playwright E2E test
```

## 7. AU Privacy Act 1988 Compliance

The app collects personal information — Privacy Act obligations apply.

| Obligation | Requirement | Implementation |
|-----------|------------|---------------|
| Collection notice | Users must be told what's collected and why | Privacy Policy linked at signup; consent checkbox |
| Use limitation | Data used only for stated purpose | No selling candidate data to third parties |
| Data quality | Keep records accurate | Profile edit flow always available |
| Data security | Reasonable security measures | Supabase RLS + encryption at rest + TLS in transit |
| Access and correction | Users can access/update their data | Account settings → "Download my data" + "Edit profile" |
| Destruction | Delete data when no longer needed | Account deletion removes all personal data within 30 days |
| Cross-border disclosure | Notify if data sent overseas | Supabase (US-based): disclosed in Privacy Policy |

### Data Retention Policy
- Active accounts: data retained indefinitely while account is active
- Deleted accounts: PII purged within 30 days; anonymised aggregate stats retained
- Chat messages: retained for 2 years (Fair Work record-keeping alignment)
- Compliance reports (provider): retained for 7 years (DSS audit requirements)
- Session recordings (PostHog): auto-deleted after 30 days

## 8. Fair Work Act Compliance

| Requirement | Guardrail |
|-------------|---------|
| Minimum wage display | Salary field validated against Fair Work Pay Guide on publish |
| Award rate warning | Red banner shown if entered rate < applicable Award minimum |
| No unpaid trial enforcement | Trial shift feature always includes pay rate (mandatory field) |
| Working hours transparency | Employment type clearly labelled (casual/part-time/full-time) |
| ABN verification | Recruiter ABN checked against ABR API on account creation |

### Award Rate Lookup
```typescript
// Fair Work minimum rates (update quarterly from fairwork.gov.au)
const AWARD_MINIMUMS: Record<string, number> = {
  'hospitality': 24.10,       // Hospitality Industry General Award 2020
  'retail': 23.86,            // General Retail Industry Award 2020
  'fast_food': 13.40,         // per hour, casual loading included
  'clerical': 25.41,          // Clerks Private Sector Award 2020
  'national_minimum': 23.23,  // National Minimum Wage 2024-25
}
```
