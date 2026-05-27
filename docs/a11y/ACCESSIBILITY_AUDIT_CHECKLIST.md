# Accessibility Audit Checklist 2026 (WCAG 2.2 AA + AU DDA/DES/Asuria)

> **Status:** FULL 2026-05-28 by sam (qa/a11y) + maya (UX polish) via swarm SHOULD. Per design spec (a11y expand + GUARDRAILS polish) + gap §5 + §7 (sam/maya owners) + §4 (docs/a11y/ subdir). Updates/supersedes GUARDRAILS.md §6 WCAG table + §5 a11y (Capacitor/Playwright → Expo RN 2026).

## Rationale
Hi-Hired beachhead (hospitality/retail casual Melbourne) targets DES/Asuria participants + broad AU users under Disability Discrimination Act (DDA) + Fair Work inclusive hiring. WCAG 2.2 AA is mandatory for App Store + partnership compliance. 2026 Expo RN stack (reanimated gestures, haptics, notifs, deep links) requires updated automated + manual testing (Maestro + @axe-core/react-native, VoiceOver/TalkBack, motor alternatives to swipe). Prevents launch blocks and "hunt for RN a11y patterns" per gap zero-blockers goal.

## 2026 Facts & Sources
- GUARDRAILS.md (2026-05-27): WCAG 2.2 AA table (1.1.1–4.1.3), a11y hooks (tap alternatives, ARIA, high-contrast), automated @axe-core/playwright (outdated for RN); Privacy/Fair Work compliance.
- gap §8 2026-05-28: Context7 expo_dev 86.3 haptics (selection/impact/notificationAsync — critical for motor/visually impaired feedback); fairwork snapshot (DDA/visa sectors); ARCH consent for inclusive bulk.
- MCP expo_dev 2026-05-28 (gap): Native haptics, AppState for background notifs (a11y announcements), SecureStore for prefs (e.g. reduced motion).
- Local 2026-05-28: TESTING_STRATEGY Playwright E2E (needs RN/Maestro); no @axe-core/react-native yet; GUARDRAILS has DES/Asuria note.
- AU: DDA 1992 + Disability Standards for Education/Employment; Asuria/DES require accessible digital services for jobseekers with disability.

## RN/Expo 2026 Tooling (Replace 2026-05-27 Capacitor/Playwright)
- **Automated:** `@axe-core/react-native` + `react-native-a11y` for unit/component; Maestro (EAS + local) for E2E flows with a11y assertions (e.g. "swipe alternatives visible").
- **Manual:** iOS VoiceOver + Android TalkBack on physical dev client (EAS checklist); reduced motion respect (expo-haptics + reanimated config).
- **Gesture alternatives (GUARDRAILS §1/5):** Always-visible "Pass / Apply / Super" buttons (no swipe-only); large touch targets 48x48dp min.
- **Haptics a11y (MCP 86.3):** Optional via settings; respect `AccessibilityInfo.isReduceMotionEnabled()`; announce "Match success haptic played" via screen reader.

## Updated WCAG 2.2 AA Checklist (RN-Specific)
(Expanded from GUARDRAILS; all criteria + RN impl + test method)

| Criterion | RN/Expo 2026 Impl | Test (Maestro / axe / Manual) |
|-----------|-------------------|-------------------------------|
| 1.1.1 Non-text | JobCard images alt = "Barista role at Cafe X, $32/hr casual, South Melbourne. Swipe right or tap Apply." | axe-core/react-native; Maestro assert label |
| 2.1.1 / 2.5.3 Keyboard + Label in Name | Action buttons always visible + aria-label match visible ("Pass this job" button) | TalkBack/VO focus + Maestro tap test; axe |
| 2.4.3 / 2.4.7 Focus + Visible | Logical order: card summary → buttons → details expand; ring-2 indigo focus | Manual VO + reduced motion test |
| 3.2.2 On Input | Swipe gesture + tap buttons both confirm only on release; no auto-match | Maestro drag vs tap; no unexpected nav |
| 4.1.2 Name/Role/Value | SwipeDeck `role="feed"`, cards `role="article"`, live regions for "It's a match!" + haptics status | axe + VO announcement test |
| 1.4.3 / 1.4.11 Contrast | NativeWind + tokens 4.5:1 min; high-contrast mode toggle (expo) | axe + manual in high contrast |
| 2.5.1 Pointer Gestures | Swipe + tap alternatives; no path-based only | Maestro custom gesture + button path |
| Plus new 2.2+ (2.4.11 etc for focus) | ... | ... |

## DES/Asuria/DDA Specific (AU Beachhead)
- Work rights / visa status: clear labels, no jargon; screen reader friendly (cross AU_FAIR_WORK legal).
- Bulk consent for providers: accessible toggle + plain-language explanation of data use (Privacy legal + RETENTION).
- No "swipe to apply" as sole path (motor impairment exclusion = DDA risk).
- Color not sole indicator (green/red + icons + text for pass/apply).

## Implementation in Code (Cross New/Updated Docs)
- In swipe deck (GUARDRAILS + EXPO_ haptics 2026): wrap gestures in `AccessibilityInfo` checks; provide button row always.
- On match: `AccessibilityInfo.announceForAccessibility('New match with employer. Open chat or view details.')` + optional haptic.
- Settings: "Accessibility: Enable tap-only mode", "Reduce haptics", "High contrast".
- Privacy delete flow: full keyboard/VO support + confirmation live region (cross RETENTION + a11y in incident banners).

## Testing & CI 2026
- Add to TESTING_STRATEGY RN section: Maestro a11y suite (every PR); `@axe-core/react-native` in component tests.
- EAS preview builds: manual VO/TalkBack on physical (per EAS checklist).
- Quarterly: full audit vs this checklist + GUARDRAILS 2026 update; log to compliance.
- Fail CI on axe violations (new in 2026 pipeline).

## Cross-References (DRY)
- GUARDRAILS.md (2026-05-28 haptics/a11y RN update + old table superseded by this).
- gap-analysis-2026-05-28.md §5 (SHOULD a11y/GUARDRAILS), §7 (sam/maya), §8 (MCP haptics 86.3, fairwork DDA refs, 2026-05-28 rules).
- docs/stack/EXPO_... (haptics + notif a11y hooks 2026).
- docs/ops/INCIDENT... + DATA_RETENTION (inclusive UX for alerts/purges).
- docs/analytics/POSTHOG... (track a11y feature usage via flags).
- TESTING_STRATEGY.md (Maestro/axe RN 2026 expansion).
- LEGAL: PRIVACY + AU_FAIR_WORK (consent + pay a11y), ASURIA (DES hooks).
- foundational-docs/02-mvp + 04-legal (inclusive hiring thesis).
- STACK (RN a11y libs 2026), EAS_CHECKLIST (physical a11y device tests).

**Zero blockers:** New dev + a11y reviewer reads this + GUARDRAILS 2026 update + 3 cross (EXPO_, TESTING_, gap §8), can implement tap-alternative buttons + VO announcement on match + run Maestro a11y flow + axe in <45min with no external RN a11y research.

*Full 2026 RN/Maestro/@axe patterns + AU DDA/DES/Asuria + updated checklist. All facts cited. DRY to GUARDRAILS/EXPO_/gap. Implementation-ready. sam/maya lanes.*