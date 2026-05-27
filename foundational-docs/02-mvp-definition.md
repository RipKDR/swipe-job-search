# MVP Definition — Hi-Hired

> **A job finder like SEEK, but built for humans. No keywords. No black holes. No bullshit.**

## v1 Promise

> **"An employer in Tullamarine posts a casual barista role at $32/hr. 20 local job seekers see it. Those who swipe right get connected. The employer picks who to chat with. Both tap 'Hired' when it's sorted. No ads. No applications. No waiting."**

## v1 Scope

One mobile app. Two roles (job seeker and employer — same app, switchable). One beachhead suburb cluster.

### What Ships

#### 1. Job Posting (Employer)

A structured but lightweight form:

| Field | Required | Why |
|-------|----------|-----|
| Job title | ✅ | "Barista / All-rounder" |
| Employer name | ✅ | "Little Lane Cafe" |
| Job type | ✅ | Casual / Part-time / Permanent (selector) |
| Pay rate | ✅ | "$32/hr" or "$65,000/yr" — must be specific |
| Hours | ✅ | "Sat 8am-2pm" or "Mon-Fri 9-5, 30hrs/wk" |
| Suburb | ✅ | Where the job is located |
| Description | Optional | What the role involves, requirements, good-to-knows |
| Photo | Optional | Workplace photo |

**No:** company size, industry category, screening questions, application form, keyword fields, EEO declarations, "sponsorship available" toggle.

**Duration:** Auto-expire after 30 days, or mark as "Hired" at any time.

#### 2. Job Seeker Profile

Minimal but enough for an employer to decide:

- **Name** (or handle)
- **Suburb**
- **Experience** — short text: "2 years barista at Campos, 1 year hospitality"
- **Skills** — up to 5 tags: "barista, customer service, cash handling"
- **Availability** — "Weekends, weekday evenings after 5pm"
- **Work rights** — "Citizen / PR / Visa (student, 20hrs/wk)"
- **Photo** — optional

**No:** education history, references, full resume upload, career objective, LinkedIn import, personality tests, video introduction.

#### 3. Job Seeker Signup

One screen: name, suburb, experience, skills, availability, work rights. Under 60 seconds.

#### 4. Employer Signup

One screen: business name, suburb, contact. Under 60 seconds. Email verification.

#### 5. Swipe Deck (Job Seeker)

- Cards showing: job title, employer, suburb, pay rate, job type badge, hours
- Swipe right → "I'd work here"
- Swipe left → Skip
- Tap card → Full job details view
- **Empty state:** "No jobs in your area yet. Be the first to tell an employer about Hi-Hired."

#### 6. Interested List (Employer)

- Shows all job seekers who swiped right on their job
- Cards with: name, experience, skills, availability, work rights
- Employer taps "Chat" on a candidate to match

#### 7. Chat

- 1:1 messaging between employer and matched candidate
- Text only (v1)
- "Hired ✅" button for both parties
- Unmatch button (with confirmation if messages were exchanged)

#### 8. Hired Confirmation

- First party taps "Hired"
- Other party sees: "[Name] wants to hire you / wants to accept. Confirm?"
- Both confirm → job marked filled, thread archived, visible in history

#### 9. Unmatch

- One tap
- If messages were exchanged: "Are you sure? They may be expecting this."
- If no messages: instant, silent
- After unmatch: both parties cannot see each other for that post

#### 10. Push Notifications

- Someone swiped right on your job
- You matched with a candidate
- New message
- [Name] confirmed "Hired"

### What Does NOT Ship in v1

| Feature | Reasoning |
|---------|-----------|
| Employer branding / company pages | The post is the employer presence |
| Saved / bookmarked jobs | Swipe deck IS the bookmark — if it's good, swipe right |
| Search / keyword filter | All jobs visible in the Circle. No search. You ARE the algorithm. |
| Multiple Circles | v1 has one seed Circle for the beachhead area |
| Reputation / reviews | Add when there's completed hires to review |
| Boost / paid tiers | Free only until demand is validated |
| Resume upload / CV parsing | Not needed — experience text is enough |
| Admin web dashboard | Employer uses the app |
| Map view | Suburb text is sufficient for v1 |
| Block user (v1.1) | Must add before app store submission |
| Report user (v1.1) | Must add before app store submission |

## v1 Data Model

### `profiles`
- id, handle, suburb, experience_text, skills[], availability_text, work_rights, avatar_url, role (job_seeker | employer), created_at

### `employer_profiles`
- id (FK profiles), business_name, about_text, verified (bool), created_at

### `circles`
- id, name, suburb, created_at

### `circle_members`
- profile_id, circle_id, joined_at

### `jobs`
- id, employer_id (FK profiles), circle_id, title, job_type (casual | part_time | permanent), pay_rate, hours_text, suburb, description, status (active | hired | expired), created_at

### `swipes`
- id, job_seeker_id (FK), job_id (FK), direction (right | left), created_at

### `matches`
- id, job_id (FK), job_seeker_id (FK), employer_id (FK), status (chatting | hired | unmatched), hired_at, created_at

### `messages`
- id, match_id (FK), sender_id (FK), text, created_at

## v1 Screens

| Screen | For | What's On It |
|--------|-----|--------------|
| Onboarding | All | Choose role (job seeker / employer) → fill profile |
| Swipe Deck | Job Seeker | Job cards, swipe right/left, tap for detail |
| Job Detail | Job Seeker | Full job info, "I'm Interested" button |
| Interested List | Employer | Cards of interested candidates, "Chat" button |
| Post Job | Employer | Job form (title, type, pay, hours, suburb, description) |
| My Jobs | Employer | List of posted jobs with status and match counts |
| Chat | Both | Messages, "Hired ✅", "Unmatch" |
| Profile | All | Edit your info |

## v1 Success Criteria

- [ ] 20+ real jobs posted by different employers in beachhead area
- [ ] 100+ job seekers signed up and swiping (3+ sessions/week)
- [ ] 15+ hires completed through the platform
- [ ] Repeat usage: employers post again, job seekers keep swiping
- [ ] No critical trust/safety incidents
