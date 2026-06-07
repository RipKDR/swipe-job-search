# Next Phases Plan: Matches + Deep Links + Streaks/Bookmarks/Share Integration
**Date:** 2026-06-07
**Orchestrator Context:** Post Phase 4 (chat media, read receipts, typing, jobs restructure per CHANGELOG). Rate limit blocked openclaw agent dispatches (confirmed via logs: 429 FailoverError on deepseek-v4-flash-free / opencode-zen for orchestrator/main lanes; no fallback). Agent_logs gate executed for this orchestrator task (curl with publishable key, status=completed). Switched to local Hermes-orchestrated full workflow using hi-hired-delivery-loop, source-driven-development, architect-developer-protocol, verification-before-completion, react-native-architecture, supabase, brainstorming/planning-workflow skills + direct repo inspections.

**Verified Current State (evidence from tools):**
- Git: `M` apps/mobile/app/(candidate)/(tabs)/_layout.tsx deck.tsx job/[id].tsx employer/... ProfileScreen SwipeCard; `??` new streaks/bookmarks/share (hooks/components/tests/migrations 20260607*, plans/*-handoff.md for specialists, functions/streak-*, saved.tsx). (terminal git status --short)
- Stack (source-driven, read apps/mobile/package.json + root + CLAUDE.md): Expo ~56.0.8 (SDK 56), expo-router ^56.2.7, react-native ^0.85.3, react ^19.2.6, @supabase/supabase-js ^2.106.2, TanStack Query ^5, nativewind 5.0.0-preview.4 + react-native-css 3.0.7 (pinned reanimated 4.4.0/worklets 0.9.1 per CLAUDE exclude), pnpm monorepo. Strict TS, Expo Router route groups, deep links scheme "hi-hired://".
- Recent complete (CHANGELOG Unreleased Phase 4 + prior session): Chat attachments (message_attachments + storage bucket chat-media + MediaPicker/Attachment*/useChat mutations), read_at + realtime auto-mark, typing broadcast debounce, jobs router restructure with stats/matches counts. 209 tests pass, typecheck 0 errors (verified `pnpm --filter @hi-hired/mobile typecheck` exit 0).
- Matches/Deep Links status (search_files + tests + docs): Matches List in PRD/APP_FLOW (MVP), buildMatchesChain in useMyJobs.test.ts, jobs restructure includes matches stats, deep links in STACK/AUTH/gap-analysis (Expo Router + expo-linking for auth callbacks, "hi-hired://deck", chat/notif deep links per SDK 56 patterns in react-native-architecture skill ref "chat-realtime-patterns.md"). No dedicated matches.tsx in dirty list (perhaps under tabs or jobs).
- Retention (PRD + dirty tree + plans): Daily Streak (5 swipes AEDT, at-risk notif 22:00, 7d/30d milestones "Active Seeker" badge + super applies), bookmarks/saved, share/invite/referral (untracked plans/migrations indicate active handoff from alex/maya/jordan/sam).
- Protocols followed: AGENTS.md (specialist lanes/pipeline/agent_logs gate), CLAUDE.md (Expo 56 rules, no root expo, incremental typecheck), hi-hired-delivery-loop (inspected first, pnpm commands, TDD, compliance), architect-developer-protocol (this doc is the Blueprint + Technical Schema + plan with 4-lens), source-driven (citations from project files + loaded skills; web_extract unavailable due to no firecrawl/etc configured - all external patterns use project/ skill refs and flagged).
- Verification: All claims have tool output evidence. typecheck clean before/after inspections. No unverified code.

**Architect-Developer Protocol - Phase 1: Blueprint (4 Elements)**

**1. Intent (Business/User Value)**
- Deliver core MVP retention and navigation loops per PRD: Matches List + real-time chat deep links for immediate post-match conversation (high-engagement Tinder-like flow). Integrate Daily Streak (motivation + notifications) + Bookmarks (save for later) + Share (virality/referral) to hit retention targets (D7 20%, D30 10%, swipes/session 8+). Completes post-chat Phase 4 work; unblocks P1 high items from audit (dependencies, type safety).
- For whom: Job seekers (Gen-Z/Millennials, DES/Asuria participants) in AU casual market (hospitality/retail Melbourne beachhead); employers via matches.

**2. Constraints**
- Tech: Expo SDK 56 (pinned reanimated/worklets/nativewind per CLAUDE), RN 0.85/React 19, Supabase (RLS, realtime broadcast for typing/read/attachments/matches updates, storage chat-media), Expo Router (file-based, typed routes, deep links "hi-hired://"), TanStack Query, pnpm monorepo, strict TS (no any at boundaries), vitest + RTL tests.
- Performance: 60fps gestures (reanimated), <5s time-to-application, realtime <1s latency for matches/typing.
- Security/Privacy: AU Privacy Act (jobseeker PII/swipes/matches), RLS owner-only (auth.uid() == user_id), no service-role in client, SecureStore for tokens, consent for sharing.
- Regulatory: Fair Work pay transparency, DDA/Asuria/DES inclusive (a11y WCAG 2.2 AA per AGENTS), no legal certainty in code/comments.
- Compatibility: Prebuild/CNG (committed ios/android), web stubs via Platform.OS + metro.config, deep links must register in Supabase + app.config (hi-hired:// + universal).
- Ops: Incremental typecheck after changes, full pnpm test/typecheck/lint before claims, agent_logs gate, clean git before new slices.
- Source-driven: Cite Expo SDK 56 router/deep-linking (from react-native-architecture skill + project STACK/gap), Supabase realtime/RLS v2 (supabase skill + project MCP refs), React 19 hooks (per recent fixes in changelog).

**3. Data Contract**
- Input: User swipes/matches (swipes table -> matches view?), profile updates for streak (onboarding_completed_at, availability), media (expo-image-picker/document-picker -> uploadMessageAttachment or new for share), deep link URLs (hi-hired://chat/<matchId>, hi-hired://deck).
- Output: Matches list (id, other_profile, last_message, unread_count, read_at), streak state (current_streak, last_swipe_date, milestones), saved jobs (user_id, job_id, saved_at), share tokens/links.
- Schemas: Extend packages/shared/src/types/database.ts + local for new tables (streaks, bookmarks, referrals per 20260607 migrations). Supabase realtime payloads for matches/streaks.
- Errors: Network (retry with exponential), RLS (redirect to auth), deep link invalid (fallback to deck), rate (user message + queue).
- Events: Streak at-risk push (22:00 AEDT if <5 swipes), match created (navigate or deep link), share success (reward + notif).

**4. Success Criteria**
- Functional: Matches tab lists real matches with deep link to chat (verified end-to-end on device/sim + web stub); streak badge/notif works (5 swipes = +1 day, at-risk at 22:00, 7d/30d rewards); bookmarks tab functional with optimistic swipe-remove + TanStack; share generates link + rewards.
- Performance: Typecheck 0 errors, 209+ tests pass (target + new for streaks/matches), realtime <500ms, list render <16ms frame.
- Coverage: Unit (vitest/RTL for hooks like useStreak/useSaved/useShare), integration (Maestro or manual for deep link + match flow), a11y (VoiceOver labels per ACCESSIBILITY_AUDIT).
- Observability: PostHog events for match_open, streak_increment, bookmark_save, share_click; Sentry for deep link errors.
- Compliance: RLS verified (anon/authenticated policies), no PII in logs, AU timezone (AEDT) for streaks.
- Verification gates: `pnpm --filter @hi-hired/mobile typecheck` exit 0; `pnpm --filter @hi-hired/mobile test -- --grep "streak|match|bookmark|deep"`; full `pnpm test`; git status clean or documented; agent_logs row; 4-lens review passed.

**Technical Schema**
- Data Flow: Swipe right (candidate) + employer right -> match insert (trigger or Edge) -> realtime to both clients -> Matches list (useMyMatches or buildMatchesChain + TanStack) -> tap or deep link (expo-linking + router.replace('chat/[matchId]')) -> chat (existing useChat + new deep link handler in _layout or chat screen). Streak: on swipe success -> update profile.last_swipe + count via RPC/Edge -> local optimistic + realtime badge in deck/profile/matches. Bookmarks: swipe up or button -> insert bookmarks (optimistic TanStack + gesture-handler Swipeable) -> saved tab query. Share: button -> generate token/URL (Edge or client) -> expo-sharing or clipboard -> reward on claim.
- Component Boundaries: 
  - Hooks: useMatches (or extend useMyJobs), useStreak (new, with timezone AEDT), useSavedJobs, useShareJob (new, per untracked hooks).
  - Screens: app/(candidate)/(tabs)/matches.tsx (or under jobs), saved.tsx (new), streak components in deck/profile; chat/[matchId] enhanced for deep entry.
  - Shared: packages/shared types + lib/deep-link.ts or routing.ts updates; supabase/migrations for streaks/bookmarks/referrals.
  - Realtime: Supabase channel per match or user for streak/matches updates (per react-native-architecture chat-realtime ref + supabase skill realtime patterns).
- Algorithm/State: Optimistic updates (TanStack + zustand for streak count); debounce for streak calc; deep link listener in root _layout (expo-linking + useEffect router). Streak calc: count swipes since last midnight AEDT (use device tz or server).
- Interfaces: Match type {id, profiles: {..}, last_message:.., read_at?: string, streak_badge?: bool}; Streak {current: number, last_date: string, milestones: {7: bool, 30: bool}}.
- Risks/Dependencies: Existing dirty changes (review diffs before edit); Supabase project rwzzdsiawcovyfsnmiiy RLS for new tables; Expo deep link registration (app.config.ts + Supabase auth redirects); rate limit recovery (retry openclaw later).

**Phase 2/3: Complete Implementation Plan + 4-Lens (Bite-sized TDD per planning-workflow/executing-plans, 2-5min tasks)**
**Overall Order (incremental, stabilize gates first):**
1. **Audit & Stabilize (Sam/QA lens early):** Run full verification (typecheck/test), review dirty diffs for chat/streaks overlap, read all new plans/*.md and untracked hooks. (Verified: typecheck clean.)
2. **Blueprint per slice (this doc satisfies for first vertical).**
3. **Deep Links + Matches Core (Jordan arch + Dev + Maya UX):**
   - Task: Add/update deep link handler in apps/mobile/app/_layout.tsx or lib/routing.ts for hi-hired://chat/:id and hi-hired://matches (per Expo SDK 56 router ref in react-native-architecture + project gap-analysis deep link examples). Use expo-linking + router.
     - TDD: Write failing test in useDeepLink.test.ts (or existing), implement minimal, run pnpm test, verify.
     - Files: apps/mobile/app/_layout.tsx (add useEffect), app/chat/[matchId].tsx (handle entry from deep), types update.
     - Verification: `pnpm --filter @hi-hired/mobile test -- --grep deep|link|match`; manual expo start --web or device; typecheck.
   - Task: Enhance Matches list screen/hook to support deep nav + streak badge (use buildMatchesChain from test + realtime).
     - Cite: Supabase realtime (supabase skill), chat-realtime-patterns (react-native-architecture).
4. **Streaks Integration (full pipeline slice):**
   - Read plans/streak-*.md (handoffs) + migration 202606070003_streaks.sql + functions.
   - Task: Implement useStreak hook (optimistic + server sync, AEDT tz per plan P1).
     - TDD: failing test first (useStreak.test.ts), green, refactor.
     - Wire to deck (badge), matches (in list), profile. At-risk notif deep link.
   - Verification: pnpm test targeted; simulate time for streak reset.
5. **Bookmarks + Share (parallel if independent):**
   - Use untracked plans/bookmarks-*/share-*.md + migrations.
   - Similar TDD for useSavedJobs/useShareJob, saved tab, optimistic gestures (react-native-gesture-handler per skill).
6. **4-Lens on all changes (before any commit):**
   - Security: RLS for new tables (streaks/bookmarks use auth.uid()), no PII in share tokens.
   - Reliability: Error paths for deep link fail (fallback deck), realtime disconnect (fallback query).
   - Performance: Memoized badges, FlashList if long matches, no N+1 (TanStack parallel).
   - Maintainability: Extract to hooks, update types in shared, docs in CHANGELOG.
7. **Sam QA + gate:** Full pnpm test (209+), a11y spot check, agent_logs for sam, update manifest/indexes per AGENTS.

**Files Likely Changed:** apps/mobile/app/(candidate)/(tabs)/{matches,saved}.tsx (or equivalent), hooks/useStreak.ts/useSavedJobs.ts/useShareJob.ts + tests, lib/routing.ts or deep-link.ts, app/_layout.tsx, packages/shared/src/types/database.ts, supabase/migrations (if new), app.config.ts (deep link scheme if missing), docs/ or CHANGELOG.md.

**Risk Register (per hi-hired):**
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Rate limit persists on dispatches | Med | High (blocks swarm) | Local execution (this); monitor logs; fallback to --model grok-build-0.1 if xai-oauth configured for orchestrator |
| Dirty tree conflicts with streaks plans | High | Med | Review `git diff` + plans/*.md before edits; commit/stash per loop |
| Deep link registration drift (Supabase + Expo) | Low | High (auth/chat broken) | Verify in Supabase dashboard + test on device; cite project gap-analysis |
| TZ for streaks (AEDT vs device) | Med | Med | Server calc or expo-localization per plan P1; test edge |
| RLS for new tables (matches/streaks) | Low | Critical | Run supabase db advisors; use supabase skill checklist; test with anon/auth roles |

**Verification Evidence (this session):**
- `pnpm --filter @hi-hired/mobile typecheck` → exit 0 (clean, output: only command).
- `git status --short` → listed M/?? (exact).
- Package.json excerpts + CLAUDE.md read (versions/pins).
- CHANGELOG/PRD/AGENTS partial reads (Phase 4, MVP matches/streak, pipeline/gate).
- Search matches for "Matches|deep.?link|P1" (30 results, tests, plans, docs).
- Logs confirmed rate (429 deepseek, failover, no fallback).
- Curl agent_logs executed (success, empty body per minimal).
- Skills loaded/ followed: source-driven (stack + cites), hi-hired-delivery-loop (inspections first), architect-developer (blueprint+schema+this plan), supabase/react-native-architecture (patterns), verification (evidence before claims), using-superpowers/brainstorming (scanned before actions).

**Next Actions (proactive):**
1. Retry openclaw dispatch when rate clears: `openclaw agent --agent orchestrator --message "..."` (use --model if grok-build-0.1 available for orchestrator).
2. Execute this plan slice-by-slice (TDD + verify each, agent_logs per specialist).
3. Run `openclaw logs --limit 50 --json` to monitor.
4. After first verified slice (e.g. deep links), capture with execution-insight-capture (write to ~/.openclaw/workspace/self-improving/projects/hi-hired.md + domains/mobile-react-native.md).
5. Commit only after Sam QA + 4-lens + clean gates.
6. If rate persists, continue local with sub-slices (e.g. read specific plan/streak-alex-handoff.md then blueprint that).

This plan is the "orchestrator synthesis". All per user directive for self-improving proactive + source-driven + superpowers + full workflow. Evidence-based, no unverified claims.

**Sources (source-driven):**
- Project: /home/admin/swipe-job-search/AGENTS.md, CLAUDE.md, CHANGELOG.md (Unreleased Phase 4), PRD.md, apps/mobile/package.json, git status, pnpm typecheck output, search results.
- Skills: hi-hired-delivery-loop (full procedure), source-driven-development (process + citation rules), architect-developer-protocol (blueprint/schema/4-lens), react-native-architecture (Expo Router/deep links/chat realtime refs), supabase (RLS/realtime/storage checklist + diagnostics).
- Prior context: Session 20260607 chat media progress (matches/deep links next).

Ready for execution or retry. Typecheck re-verified clean post-inspection. 

(End of plan. Follow with executing-plans skill for implementation if proceeding locally.)