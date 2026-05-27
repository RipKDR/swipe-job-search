# Swipe Job Search - Product Requirements Document (PRD)

## 1. Vision
A job search application that adopts the high-engagement, low-friction UX of Tinder. It replaces long lists and complex filters with a simple "Swipe Right to Apply, Swipe Left to Pass" mechanism.

## 2. Target Audience
- **Job Seekers:** Gen-Z/Millennials looking for high-volume entry-level to mid-level roles (F&B, Retail, Tech, Creative).
- **Recruiters:** Hiring managers wanting a faster way to screen candidates without reading 10-page CVs initially.

## 3. Core Tinder-Matched UX
- **The Deck:** A stack of "Job Cards."
- **Swipe Right:** Apply for the job.
- **Swipe Left:** Discard/Hide.
- **Swipe Up:** "Super Apply" (Featured application).
- **Match:** Occurs when a user swipes right and the Recruiter (viewing candidate cards) also swipes right.
- **The Chat:** Once a "Match" occurs, a chat thread opens for an immediate interview/intro.

## 4. MVP Features (Phase 1)
- **User Personas:** Candidate and Recruiter roles.
- **Job Card UI:** Large image, salary, location, and 3-4 key "vibe" tags.
- **Swipe Logic:** Local state for deck management, backend persistence for applications.
- **Profile Builder:** "Card-first" profile creation (Photos + Bio + Experience).
- **Matches List:** View all successful matches.
- **Direct Messaging:** Simple real-time chat.

## 5. Success Metrics (with Targets)

| Metric | Month 3 Target | Month 12 Target |
|--------|---------------|----------------|
| Swipes per session | 8 | 15 |
| D7 Retention (candidates) | 20% | 35% |
| D30 Retention (candidates) | 10% | 22% |
| Time-to-Application | < 5 seconds | < 3 seconds |
| Match rate (right swipes → match) | 8% | 12% |
| Onboarding completion rate | 60% | 75% |
| Match-to-Interview conversion | 40% | 55% |
| Weekly Active Swipers (North Star) | 500 | 5,000 |

Full analytics taxonomy and funnel definitions: see `ANALYTICS_PLAN.md`.

## 6. Retention Mechanics

### Daily Streak
- A streak day = at least 5 swipes before midnight AEDT
- Streak displayed on deck view: "🔥 4-day streak"
- At 22:00 AEDT: push notification if no swipes yet today ("Streak at risk!")
- Milestone rewards: 7-day streak → +2 Super Applies; 30-day → "Active Seeker" profile badge
- Broken streak message is sympathetic, not punishing: "Your streak reset — start a new one today?"

### Super Apply Scarcity
- Candidates get 3 Super Applies per day (free tier)
- Super Apply creates urgency for both parties: recruiter sees "⭐ Top pick" badge
- Scarcity drives return visits: users come back daily to use their allocation

### Daily Job Quota Notification
- If a candidate hasn't opened the app in 24 hours, send a personalised nudge
- Message references real local data: "🔥 23 new barista roles near Carlton posted today"
- Never send more than 1 re-engagement notification per 24 hours

## 7. Viral Loop

### Share a Job Card
- Candidates can share any job card as a rich preview link (Open Graph meta tags)
- Share target: friends, WhatsApp groups, Discord servers
- Shared card opens a landing page with the job + "Find more jobs like this →" CTA
- Referred signups are tagged (`referral_source=share`) for attribution

### Word-of-Mouth Accelerant
- "Invite a friend" prompt shown after first match: "Know someone else job hunting? They'll love this"
- No incentive programme needed at MVP — the product is the hook

## 8. Competitive Moat

The app's defensible advantages compound over time:
1. **Network density**: more candidates → faster matches → more recruiters → more candidates (Metcalfe's Law)
2. **Compliance data**: Asuria and DES providers are locked in by compliance reporting they can't easily replicate elsewhere
3. **Behavioural data**: swipe patterns, dwell time, and preference signals create a matching quality advantage no new entrant can buy
4. **Local trust**: "Melbourne's job app" is a stronger brand than a global platform with local content
