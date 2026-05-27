# Application Flow & UX Sequence

## 1. Onboarding
- **Step 1: Auth.** Magic link or Social Login via Supabase.
- **Step 2: Role Selection.** "I am looking for a job" (Candidate) or "I am hiring" (Recruiter).
- **Step 3: Quick Profile.** 
  - Candidates: Upload CV (Parsed to tags) or 3 Photos + Bio.
  - Recruiters: Company Name + Job Title + Salary Range.

## 2. The Core Loop (Swiping)
- **Deck View:** High-quality card stack.
- **Micro-interactions:**
  - Pull down to see "Full Job Details" (Tinder Info view).
  - Tap left/right edges to cycle through job photos.
  - Swipe Right -> Apply.
  - Swipe Left -> Pass.
  - Swipe Up -> Super Apply.

## 3. The Match Flow
- **Notification:** "It's a Match!" overlay if reciprocal interest is detected.
- **Match Tab:** Vertical list of matches, ordered by most recent.
- **Badging:** Red dot on the Chat icon for new messages/matches.

## 4. Chat & Interview
- **Direct Messaging:** WhatsApp-style chat interface.
- **Action Buttons:** "Schedule Call", "Send Documents", "Trial Shift" quick-actions inside the chat.
- **Recruiter actions in chat:** Schedule interview, request documents, invite to trial shift, confirm hire.
- **Candidate actions in chat:** Accept/decline trial shift, share portfolio link, confirm availability.

## 5. Recruiter Job Posting Flow

Full recruiter UX spec in `RECRUITER_FLOW.md`. Summary sequence:

```
Auth (same as candidate)
  → Role selection: "I am hiring"
  → Company profile setup (name, industry, logo, ABN)
  → "Post your first role" → Job Card Builder:
      Screen 1: Role title + suburb + employment type
      Screen 2: Salary range + Fair Work Award warning
      Screen 3: Vibe tags (up to 6)
      Screen 4: Job photos (up to 4)
      Screen 5: Full description
      Screen 6: Preview → Publish / Boost
  → Recruiter Dashboard (active jobs, new applications count)
  → Candidate review deck (swipe on applicants)
  → Match → Chat → Trial Shift / Interview → Hire
```

## 6. Provider (Asuria) Flow

```
Auth → Role: "Employment Services Provider"
  → Provider setup: organisation name, ABN, DES/WFA licence number
  → Caseload dashboard: list of assigned candidates with activity summaries
  → Per-candidate view:
      Swipe activity this week
      Matches and message status
      "Blast-Swipe" on behalf of candidate (with candidate consent on file)
      Add mentor note (visible to employer post-match)
  → Weekly compliance export: PDF + JSON auto-generated Monday 7am AEDT
  → Private job feed: "Asuria Partner Jobs" tab — pre-market roles
```

## 7. Onboarding A/B Variants

Two onboarding variants to test (see `ANALYTICS_PLAN.md` for test setup):

**Variant A: CV Upload First**
```
Upload CV → AI parses skills/experience → Photos (optional) → Bio → Done
```
- Hypothesis: faster time to quality profile; better match quality
- Risk: CV upload friction may reduce completion rate

**Variant B: Photos First (control)**
```
3 Photos → Bio → Work history (manual, optional) → Done
```
- Hypothesis: lower friction → higher completion rate
- Risk: thinner profile data → lower match quality

Test metric: 7-day match rate (not just completion rate — we care about quality matches).

## 8. Empty States

Every potentially-empty screen needs a purposeful empty state:

| Screen | Empty State Message | CTA |
|--------|-------------------|-----|
| Job deck exhausted | "You've seen all jobs nearby 🎉 Check back tomorrow for new listings" | "Expand search radius" |
| No matches yet | "No matches yet — keep swiping! Most users get their first match within 48 hours" | "Back to swiping" |
| No messages | "Start the conversation — introduce yourself!" | "Send first message" |
| Recruiter: no applicants | "Your job is live! Candidates are seeing it now. First applications usually arrive within 24 hours" | "Boost this job" |
