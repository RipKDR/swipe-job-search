# Recruiter Flow — Swipe Job Search

## 1. Overview

Recruiters are the supply side of the marketplace. This doc covers the complete UX for creating and managing job postings, reviewing candidates, and converting matches to hires.

Two recruiter types:
- **Direct Recruiter** — Hiring manager at a business (e.g., café owner, retail manager)
- **Agency Recruiter** — Staffing agency placing candidates across multiple clients

---

## 2. Recruiter Onboarding

### Step 1: Auth
Same magic link / OAuth flow as candidates (see AUTH_FLOWS.md).

Post-auth, role selection screen:
- "I'm looking for a job" → Candidate flow
- "I'm hiring" → Recruiter flow
- "I'm an employment services provider" → Provider flow (Asuria/DES)

### Step 2: Company Profile Setup
```
Screen: "Tell us about your business"
Fields:
  - Company name (required)
  - Industry (dropdown: Hospitality, Retail, Tech, Healthcare, Creative, Other)
  - Company logo (upload, max 2MB, 400x400)
  - Company description (max 280 chars — keep it punchy)
  - ABN (required for Fair Work compliance verification)
  - Website URL (optional)

Progress indicator: Step 2 of 3
```

### Step 3: Post First Job
Recruiters are immediately pushed to post a job — the app is useless without supply.
```
"Post your first role to start receiving applications"
[shortcut to Job Creation flow — see Section 3]
```

---

## 3. Job Creation Flow

### The Job Card Builder

Designed to feel like creating an Instagram story, not filling in a form.

**Screen 1: The Basics**
```
What's the role?
[Job Title — text input, placeholder: "Head Barista", "Junior Developer", "Retail Supervisor"]

Where is it?
[Suburb — Melbourne suburb picker with autocomplete]
[Full address — optional, shown after match]

Employment type:
[Full-time] [Part-time] [Casual] [Contract]
```

**Screen 2: The Money**
```
Salary / Pay Rate
[From $____] [To $____] per [hour / week / year]

+ Super toggle (default: on for full-time/part-time)

Fair Work Award: [Auto-detected based on industry + role]
⚠ "This role's minimum pay under the Hospitality Award is $24.10/hr"
(shown if entered rate is below Award minimum)
```

**Screen 3: The Vibe (Tags)**
```
What makes this role great?
(Select up to 6 tags — shown on the card)

[ ] Staff meals included     [ ] Latte art welcome
[ ] Great culture            [ ] Fast-paced environment
[ ] Career progression       [ ] LGBTQIA+ friendly
[ ] Flexible hours           [ ] CBD location
[ ] Free parking             [ ] Dog-friendly office
[ ] Remote days available    [ ] Visa-friendly
[ ] Trial shift first        [ ] Immediate start

+ Add custom tag (max 20 chars)
```

**Screen 4: The Photos**
```
Add photos to your job card
(Up to 4 photos — venue, team, product shots)
[Drag to reorder — first photo is the hero]

Tips shown:
✓ Show your actual venue/workspace
✓ Include team photos — people hire people
✗ Stock photos perform 40% worse
```

**Screen 5: The Details**
```
Job Description (appears in the "pull down for details" view)
[Rich text — max 500 words]
[Sections: About the role / What we're looking for / What we offer]

Ideal start date: [ASAP] [Custom date]
Applications close: [No deadline] [Custom date]
```

**Screen 6: Review & Publish**
```
Preview of the job card (exactly as candidates will see it)

[Save as Draft]    [Publish Now]    [Boost This Job 🚀]
                                    └── Opens sponsored placement options
```

---

## 4. Recruiter Dashboard

After publishing a job, recruiters enter the review flow.

### Dashboard Layout
```
┌─────────────────────────────────────────────────┐
│  Active Jobs (3)        New Applications: 47 🔴 │
├─────────────────────────────────────────────────┤
│  [Head Barista - Carlton]     28 applicants  ▶  │
│  [Junior Dev - Richmond]      14 applicants  ▶  │
│  [Retail Supervisor - CBD]     5 applicants  ▶  │
├─────────────────────────────────────────────────┤
│  Matches (8)                  Messages (3) 🔴   │
│  [View All Matches]           [Open Chat]        │
└─────────────────────────────────────────────────┘
```

---

## 5. Candidate Review (The Recruiter Swipe Deck)

This is the recruiter's primary interaction — reviewing candidates who swiped right on their job.

### The Candidate Card
```
┌─────────────────────────────────────┐
│                                     │
│    [Candidate Photo — full bleed]   │
│                                     │
│  Sarah M., 24  ·  Carlton          │
│  ⭐ Barista  ·  2 yrs experience    │
│                                     │
│  [🏆 Asuria Verified]  [3km away]  │
│                                     │
│  "Passionate about specialty coffee │
│   and creating great experiences"   │
│                                     │
│  Tags: La Marzocco · Latte Art      │
│        Alternative Milks · V60      │
│                                     │
│  [❌ Pass]  [✅ Match]  [⭐ Super]  │
└─────────────────────────────────────┘
```

### Recruiter Swipe Actions
- **Swipe Right / ✅ Match** → Mutual match if candidate also swiped right on this job → chat opens
- **Swipe Left / ❌ Pass** → Candidate hidden from this job's deck; can undo within 30 seconds
- **Swipe Up / ⭐ Super** → Marks candidate as top pick; candidate sees "You're a top pick!" notification
- **Pull down** → Candidate full profile: complete work history, all photos, skills breakdown

### Batch Review Mode (Pro/Agency)
For recruiters with 50+ applications: swipe through a compressed card view showing 4 candidate thumbnails at once. Tap to expand before swiping.

---

## 6. Match Management

Once a match occurs (both sides swipe right), the recruiter sees:

### Match Notification
```
🎉 It's a Match!
You and Sarah M. are both interested.
[Start Chatting]  [View Profile]
```

### Matches Tab
```
Sorted by: Most Recent  ▼

[Sarah M.] Head Barista — Matched 2h ago     💬 3 new messages
[Tom K.]   Head Barista — Matched 1d ago     💬 No reply (nudge?)
[Priya S.] Junior Dev — Matched 3d ago       ✓ Interview scheduled
```

### In-Chat Actions (Recruiter Side)
```
[📅 Schedule Interview]  → Opens calendar invite flow
[📋 Request Documents]   → Send checklist: "Please provide: Working rights docs, Tax File Number"
[🎯 Trial Shift]        → "Invite to a paid trial shift" — sets date/time/address
[✓ Hire]               → Marks match as "Hired" → triggers success metrics logging
[✗ Decline]            → Sends polite auto-message, archives match
```

---

## 7. Job Management

### Editing a Live Job
Recruiter can edit any field on a published job. Changes go live immediately. If salary is edited down below Award minimum, a warning fires before save.

### Pausing vs. Closing
- **Pause** — Job hidden from candidate deck; existing matches preserved; can resume anytime
- **Close** — Job marked as filled; all unmatched applicants get auto-notification "This role has been filled"
- **Delete** — Hard delete (requires typing "DELETE" to confirm); all data removed; matches lost

### Job Performance Analytics (Pro tier)
```
Head Barista — Carlton
├── Views (card seen in deck): 1,240
├── Right swipes (applications): 89  (7.2% conversion)
├── Matches: 23  (25.8% match rate)
├── Interviews scheduled: 8
└── Hired: 2
```

---

## 8. Trial Shift Flow (Hospitality-Specific)

A key Melbourne hospitality feature — replaces the first interview with a paid trial.

```
Recruiter taps [🎯 Trial Shift] in chat
  → Form: Date / Time / Address / Duration / Pay Rate
  → Candidate sees: "St Ali Coffee invites you to a trial shift"
    Date: Sat 31 May, 8am–12pm
    Location: 12 Yarra Pl, South Melbourne
    Pay: $24.50/hr
    [Accept] [Decline] [Reschedule]
  → Both parties confirmed → Added to their calendars
  → Day-before reminder notification (push + in-app)
  → Post-trial: both parties rate the experience (optional, anonymous to each other)
```

---

## 9. Accessibility & Fair Work Compliance

- **ABN Verification**: Required during onboarding; checked against ABR API before first job published
- **Award Rate Warning**: Real-time check against Fair Work Commission Pay Guide API (or local lookup table updated quarterly)
- **No salary hiding**: Salary range is always visible on the card — no "competitive salary" vagueness allowed
- **Equal opportunity**: No fields for age, gender, or physical appearance requirements in job description (moderated by keyword filter on publish)
