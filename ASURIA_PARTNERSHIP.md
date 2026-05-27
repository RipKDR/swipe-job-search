# Asuria Partnership Strategy

Asuria is a major Australian provider of **Workforce Australia** and **Disability Employment Services (DES)**. Their brand is built on "employment mentors" and personalized pathways.

## 1. The DES Angle (Disability Employment Services)
Since Asuria does a lot of DES work, the app **must** be the most accessible job tool in Melbourne.
- **Accessibility Guardrail:** Full screen-reader support and high-contrast modes. This makes the app "DES-ready," which is a huge selling point for them.
- **Support-Person Access:** Allow an Asuria "Employment Mentor" to co-manage a profile for a candidate who needs extra support.

## 2. The "Asuria Mentor" Feature
- **Mentor Endorsement:** When an Asuria mentor "vibrates" or "boosts" a candidate's swipe, the employer sees an "Asuria Verified" badge with a note: *"This candidate has back-to-work support from Asuria."* 
- This reduces the employer's perceived risk—they know if they hire this person, Asuria will help with the transition.

## 3. Compliance & "Mutual Obligations"
In the Workforce Australia system, candidates have "points" or "tasks" to complete.
- **API Hook Concept:** Imagine if a "Swipe Right" (Application) automatically sent a confirmation to the Asuria portal. 
- **The Pitch:** "I can build an export feature that generates a weekly PDF of every single job application your candidate made, formatted exactly how the Department of Employment needs it."

## 4. Local Advertising (The "Asuria Feed")
- Asuria often has private "Pre-market" jobs from employers they know.
- **The Ask:** "Would you like a private 'Asuria-only' tier in the swipe deck? Your candidates get first access to your exclusive jobs before they are opened to the public."

## 5. Compliance Data Export — API Specification

The single biggest value proposition for Asuria is eliminating manual DSS reporting. Here's exactly what we deliver.

### Weekly PDF Report (auto-generated Monday 7:00 AEDT)

**Report structure per candidate:**
```
WORKFORCE AUSTRALIA / DES ACTIVITY LOG
Provider: Asuria Employment Services
Candidate: [Full Name] | DOB: [date] | CRN: [centrelink reference]
Reporting Period: [Mon dd/mm/yyyy] – [Sun dd/mm/yyyy]
Employment Mentor: [Mentor Name]

JOB SEARCH ACTIVITIES
─────────────────────────────────────────────────────────────────
Date       | Employer          | Role          | Method    | Outcome
01/06/2026 | St Ali Coffee     | Head Barista  | App       | Applied
02/06/2026 | Tipo Pasta Bar    | FOH Manager   | App       | Applied
03/06/2026 | Proud Mary        | Barista       | App       | Mutual Interest (Match)
04/06/2026 | Proud Mary        | Barista       | In-person | Trial Shift (Sat 7 Jun)

Total activities this week: 4
Total applications (cumulative): 12
Matches this period: 1
Interviews/trial shifts: 1

Certified accurate by: [Mentor name] | Date: [date]
```

### JSON Export (for direct integration)
```json
{
  "provider_id": "asuria-vic-001",
  "report_period": { "start": "2026-06-01", "end": "2026-06-07" },
  "generated_at": "2026-06-08T07:00:00+10:00",
  "candidates": [
    {
      "candidate_id": "uuid",
      "full_name": "Sarah M.",
      "crn": "123456789A",
      "activities": [
        {
          "date": "2026-06-03",
          "employer": "Proud Mary Coffee",
          "role": "Barista",
          "activity_type": "job_application",
          "outcome": "mutual_match",
          "dss_activity_code": "JA"
        }
      ],
      "weekly_summary": {
        "applications": 4,
        "matches": 1,
        "interviews": 1,
        "hires": 0
      }
    }
  ]
}
```

### DSS Activity Code Mapping
| App Event | DSS Activity Code | Description |
|-----------|------------------|-------------|
| Right swipe (application) | `JA` | Job Application |
| Match created | `EC` | Employer Contact |
| Trial shift accepted | `JI` | Job Interview |
| `hire_confirmed` | `EP` | Employment Placement |

## 6. Charter Partner Onboarding Timeline

A structured 90-day onboarding to turn Asuria from a pilot into an anchor B2B customer.

| Week | Milestone | Owner |
|------|-----------|-------|
| 1-2 | Pilot agreement signed; 5-mentor trial accounts created | Sales + Dev |
| 2-3 | Mentor training session (1hr Zoom); TRAINING.md published | Product |
| 3-4 | 20 candidate profiles migrated (mentor-assisted onboarding) | Asuria mentors |
| 4-6 | First weekly compliance reports generated; mentor feedback collected | Product + Asuria |
| 6-8 | Report format validated against DSS submission requirements | Asuria compliance team |
| 8-10 | Full caseload onboarded (up to 200 candidates) | Asuria mentors |
| 10-12 | Contract upgrade from Starter → Growth tier | Sales |
| Week 12 | Case study published; referral to 2nd provider organisation | Marketing |

### Pilot Success Criteria (Asuria Signs Growth Tier When...)
- Compliance reports accepted by DSS without manual corrections
- Mentors report ≥ 50% time saved on weekly activity logging
- At least 3 candidates placed in employment via the platform
- 80%+ of active candidates using app weekly (mentor-verified)

## 7. Co-Marketing Terms Structure

- **"Asuria Verified" badge** — Asuria logo displayed on endorsed candidate cards; requires formal co-branding agreement
- **Launch press release** — joint release to AU employment sector press (NCVER, ACCI, RCSA)
- **Provider conference presence** — Asuria intro to NESA (National Employment Services Association) annual conference
- **Referral arrangement** — Asuria refers 2 additional DES providers; earns 3 months service credit per referral
