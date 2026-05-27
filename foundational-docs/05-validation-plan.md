# Validation Plan — SwipeJobs Melbourne

## Core Assumptions to Validate

Before any implementation, validate these assumptions:

### Assumption 1: Candidates want a faster apply flow
**Statement:** Melbourne casual workers find the current job-application process (SEEK/Indeed profiles, cover letters, multi-step applies) frustrating enough to try a swipe-based alternative.

**How to test:**
- Interview 8+ casual workers (hospitality, retail, students) in Melbourne
- Ask: "What's your current process for finding casual shifts?"
- Ask: "What's the most annoying part?"
- Ask: "If you could express interest in a job with one tap, would you use it?"
- Ask: "What would make you NOT try a new jobs app?"

**Success signal:** 6/8 interviewees say they'd try a swipe-based app; 4/8 currently have a "frustrating enough" apply experience.

### Assumption 2: Employers will post casual jobs on a new platform
**Statement:** Small Melbourne employers (cafes, retail, warehouses) are willing to post casual job listings on an unproven platform.

**How to test:**
- Interview 5+ small Melbourne employers who hire casually
- Start with "How do you currently find casual staff?"
- Understand current costs (SEEK ads, agency fees, time spent)
- Pitch: "What if there was a free mobile app where nearby candidates swipe interested on your job, and you just see who's keen?"
- Ask: "Would you try posting a job there for free?"
- Ask: "How many jobs do you post per month? Per week?"

**Success signal:** 3/5 employers say they would post a job to a free beta. Bonus: they name specific roles they'd post.

### Assumption 3: Swipe UX works for job browsing
**Statement:** Candidates prefer swiping through job cards to scrolling a list.

**How to test:**
- Prototype both layouts (swipe deck vs list view) in a clickable mockup
- Show to 5 candidate interviewees
- Ask: "Which would you use more?"
- Observe: do they struggle with the swipe interaction?

**Success signal:** 4/5 prefer swiping. If they prefer list view, reconsider the core UX.

### Assumption 4: Melbourne casual jobs are findable without scraping
**Statement:** We can source enough real casual job listings through direct employer outreach to make the app useful.

**How to test:**
- Identify 20 Melbourne employers in target categories
- Contact them (email, walk-in, social) and ask if they'd post a job
- Track: how many say yes, how many actually post, how many repeat

**Success signal:** 10/20 agree to post; at least 5 actually do within 2 weeks.

### Assumption 5: Monetisation is possible
**Statement:** Employers will pay for better access to casual candidates once they see value.

**How to test:**
- During employer interviews, ask: "If this saved you time/money finding staff, what would it be worth per month?"
- After beta, propose a simple paid tier (featured jobs, candidate contact)
- Track conversion from free to paid

**Success signal:** At least 2 beta employers express willingness to pay within first month.

---

## Interview Targets

### Candidate interviewees (minimum 8)
Target mix:
- 2-3 hospitality workers (baristas, servers, bartenders)
- 2-3 retail workers (sales assistants, visual merchandisers)
- 1-2 warehouse/labour workers
- 1-2 students (seeking part-time work)
- 1 event/casual worker

**Where to find them:**
- Facebook groups (Melbourne Hospitality Jobs, Melbourne Casual Work)
- Reddit r/melbourne, r/ausjobs
- Personal network
- University job boards
- Walk into cafes/retail in target suburbs (Fitzroy, CBD, South Yarra, Brunswick)

### Employer interviewees (minimum 5)
Target mix:
- 2-3 cafe/restaurant owners or managers
- 1-2 retail managers
- 1 warehouse/logistics supervisor

**Where to find them:**
- Walk into local hospitality venues (quiet times, mid-afternoon)
- LinkedIn outreach: "cafe owner Melbourne," "restaurant manager Melbourne"
- Industry associations
- Small business networking groups

---

## Interview Script — Candidates

**Intro:**
"Hey, I'm exploring an idea for a faster way to find casual work in Melbourne. Can I ask you a few quick questions about how you currently find jobs?"

**Questions:**

1. What kind of casual/part-time work do you do or look for?
2. How do you currently find jobs or shifts? (Probe: what apps, sites, groups?)
3. What's the most annoying or frustrating part of that process?
4. How long does it typically take you from "I need a job" to "I've applied somewhere"?
5. Have you ever not applied for a job because the process was too long?
6. If you could swipe through job cards like Tinder and express interest in one tap, would that be useful?
7. What would make you trust a new jobs app enough to use it?
8. What would make you delete it immediately?
9. How much does timing matter? (Probe: same-day shifts vs next week)
10. Anything else that's broken about finding casual work in Melbourne?

---

## Interview Script — Employers

**Intro:**
"Hi, I'm researching how small Melbourne businesses find casual staff. Can I ask you a few questions?"

**Questions:**

1. How do you currently find casual / shift-based staff?
2. Roughly how much do you spend per hire? (Probe: SEEK ads, agency fees, time)
3. How long does it usually take to fill a casual position?
4. What's the most frustrating part of the hiring process for casual roles?
5. Have you ever had a shift go unfilled because you couldn't find someone fast enough?
6. If there was a free mobile app where nearby candidates browse jobs and tap "interested" — would you post a role there?
7. What would you need to see to trust that candidates are real and serious?
8. If the app proved useful, would you pay for features like priority listing or direct candidate contact?
9. How many casual/part-time roles do you post per month?
10. Any other pain points around hiring casual staff?

---

## MVP Success Criteria

### Pre-build validation gates
- [ ] 8+ candidate interviews completed
- [ ] 5+ employer interviews completed
- [ ] 6/8 candidates show interest in swipe-based apply
- [ ] 3/5 employers willing to post a free job in beta
- [ ] At least 1 employer identifies a specific role they'd post
- [ ] No red flag emerges that invalidates the core concept

### Beta launch criteria
- [ ] 20+ Melbourne jobs live (mix of direct + manual seed)
- [ ] 3 employers actively using the platform
- [ ] 50+ candidate signups
- [ ] 100+ job swipes completed
- [ ] At least 1 match (candidate interested + employer shortlisted)

### Monetisation signal criteria
- [ ] At least 1 employer asks about paid features unprompted
- [ ] At least 1 candidate says they'd use the app regularly
- [ ] Repeat employer job posting observed (same employer posts a second job)

---

## Kill / Pivot Criteria

**Kill the product if:**
- 0/8 candidates say they'd try a swipe-based job app
- 0/5 employers willing to post any job
- Employer interviewees say SEEK/Indeed are working perfectly for casual roles
- Candidates say the problem is "not enough jobs" not "apply process is slow"

**Pivot if:**
- Candidates love it but employers won't post → try employer-first approach (curated/agent-sourced jobs)
- Employers love it but candidates won't swipe → try different candidate UX
- Hospitality works but retail doesn't → focus entirely on hospitality
- Melbourne too general → narrow to 2-3 suburbs first
