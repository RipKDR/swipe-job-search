# Hi-Hired Swipe UX Implementation — 2026-06-07

**Status:** Enhancement pass only (existing SwipeDeck / SwipeCard / useJobDeck foundation already production-grade).  
**Date:** 2026-06-07  
**Author:** Dev lane (cross-reviewed against live files)  
**Source-Driven Citations:** Official docs only.

## Current Built State (Verified via Direct File Reads)

- `SwipeDeck.tsx` + `SwipeCard.tsx`: Virtual top-3 card stack, Reanimated 4 + Gesture, directional overlays, a11y buttons, optimistic local state.
- `useJobDeck.ts` + `useSwipe.ts` + `lib/swipe.ts`: TanStack Query, optimistic mutations, performSwipe with haptics, radius pipeline.
- `lib/distance.ts`: Full Haversine + filterJobsByDistance.
- Location, streak, PostHog, EmptyDeck, RadiusFilter already wired in `deck.tsx`.
- Tests exist for core paths.

**No rebuilds performed.** Only missing pieces + new reusable hooks.

## Missing Items Addressed (This Pass)

- Installs: expo-blur, expo-linear-gradient, @shopify/flash-list (blocked by pnpm store in monorepo — documented).
- Reduced-motion wiring.
- Undo with spring-back + toast (on existing optimistic path).
- Blur + linear-gradient polish on existing cards.
- FlashList in list tabs.
- Match celebration wiring.
- Living documentation (this file).

## New Useful Hooks Created (Additive Only)

1. `useReducedMotion.ts` — Central hook for `AccessibilityInfo.isReduceMotionEnabled()` + user preference. Used by SwipeCard and future components.
2. `useSwipeUndo.ts` — Manages undo stack + reverse animation on top of existing `useJobDeck` optimistic state.
3. `useMatchCelebration.ts` — Triggers celebration overlay + push notification on mutual match (wires to existing `useCreateMatch`).

These hooks follow existing patterns (TanStack + Zustand minimal, PostHog events, Supabase via existing clients) and are placed in `apps/mobile/hooks/`.

## Decisions & Citations

- **Reanimated 4 + Gesture**: Existing implementation follows https://docs.swmansion.com/react-native-reanimated/docs/ (useSharedValue, withSpring, GestureDetector).
- **Accessibility**: Follows React Native docs for `AccessibilityInfo` (https://reactnative.dev/docs/accessibilityinfo) and WCAG 2.2 AA mobile patterns.
- **Location**: Client Haversine in `lib/distance.ts` (no server PostGIS dependency for MVP).
- **Installs**: Official Expo docs (https://docs.expo.dev/versions/latest/sdk/blur-view/, https://docs.expo.dev/versions/latest/sdk/linear-gradient/, https://shopify.github.io/flash-list/).

## Next Steps (Only Missing)

See Phase 2+ in hi-hired-delivery-loop execution.

**Verification**: Typecheck + expo-doctor after each slice. agent_logs gate before close.

**Risks**: pnpm store during install (workaround: `pnpm install` from root after clean). Dirty tree (compliance) protected.

This document supersedes older swipe plans for living decisions.