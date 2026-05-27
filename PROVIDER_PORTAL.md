# Job Network Provider Strategy & Portal

Meeting a job network provider (like a Workforce Australia partner) changes the game. This moves the app from a "Consumer App" to a "B2B/Employment Services" tool.

## 1. The "Caseload" Management Feature
Job network providers manage hundreds of candidates. They don't want to swipe 1-by-1.
- **Bulk Matching:** The provider can see a "Recruiter View" of available local jobs (e.g., in Melbourne CBD/Docklands) and "Blast-Swipe" on behalf of their candidates who are ready for work.
- **Compliance Tracking:** Automatic logging of "Job Searches" performed. This is a massive pain point for providers—they need proof that candidates are active. This app provides it via the swipe history.

## 2. The Provider role in SPEC.md
Update the `profiles` table to include `type: 'provider'`.
- A `provider` can manage a `caseload` (a list of candidate user_ids).
- When a provider swipes "Right" for a candidate, it acts as a "Warm Intro" to the employer.

## 3. High-Value Adverts (The "Featured" Slot)
Since you are talking to her about adverts tomorrow:
- **Sponsored Local Jobs:** Local businesses in Melbourne can pay a small fee to have their job card show up in the first 5 swipes for anyone within a 5km radius.
- **Provider-Verified Badge:** Jobs posted through an official job network provider get a "Verified Partner" badge, increasing trust for the candidates.
