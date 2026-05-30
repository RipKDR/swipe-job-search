# Hi-Hired Product Strategy — Unified Feature Roadmap

> **Date:** 2026-05-30
> **Source:** `SwipeJobSearch_Product_Strategy_Prompts.docx` (Document 1 of 3) → `docs/prompts/2026-05-30-product-strategy-prompts.md`
> **Analysis files:**
> - `docs/research/2026-05-30-product-strategy-feature-analysis.md` — Market features
> - `docs/research/product-strategy-ux-intelligence-analysis-2026-05-30.md` — UX & intelligence
> - `docs/analysis/2026-05-30-product-strategy-gap-analysis.md` — Compliance & trust

---

## Executive Summary

Of the **16 product features** proposed in the strategy doc:

| Action | Count | Features |
|--------|-------|----------|
| **Build Now** | 3 | Salary Transparency, Centrelink Compliance Suite, GPS Proximity Filtering |
| **Build Now (doc polish)** | 1 | Core Vision brand positioning |
| **Design First** | 5 | Anti-Ghosting/Transparency Score, Company Sentiment Scoring, Offer Forecasting, Feedback Loops, Commute Calculator |
| **Hold** | 1 | Tailored Apply/One-Swipe Application (Philosophy conflict) |
| **Defer/Defer post-launch** | 4 | Vetted Talent Verification, Hyper-Local Job Hubs/Community, Inferred Expertise Engine, Career-Pathing |
| **Skip** | 2 | Proof-of-Competency, AI Resume Detection |

---

## Phase 1 — Build Now (this sprint)

### 1. Salary Transparency & Collective Leverage
**Priority:** #1
**Complexity:** Low
**Existing coverage:** Pay transparency is already a core principle — `pay_display` on every card, `salary` in `NormalizedJob` schema, AU Fair Work reference in docs.
**What to build:** Post-hire anonymous salary reporting → aggregate → display as "Avg $X/hr in this role" on job cards. Add `salary_reports` table + opt-in prompt after hire confirmation.
**Dependencies:** Hire confirmation flow (exists in MVP)

### 2. Centrelink / Workforce Australia Compliance Suite
**Priority:** #2
**Complexity:** Low–Medium
**Revenue path:** Provider Enterprise — $499–$3,999/mo (Asuria partnership)
**Existing coverage:** Most mature area — cross-specified in 5+ docs (SPEC, ASURIA_PARTNERSHIP, ANALYTICS_PLAN, NOTIFICATIONS, BUSINESS_MODEL). Edge functions for `compliance-export` exist in plan.
**Architecture audit fixes needed:** compliance export persistence (HIGH), bulk_swipe_consent schema (HIGH), recruiter RLS (HIGH)
**What to build:** Two fixes from Architecture Audit → compliance export Edge Function → provider dashboard integration

### 3. GPS Proximity Filtering
**Priority:** #3
**Complexity:** Low
**Existing coverage:** `radius_km` field already spec'd in `JobSearchQuery` schema (Phase 1 plan). `location` in `NormalizedJob` has lat/lng fields.
**What to build:** Expose `radius_km` filter in deck query + add commute-time display on card

### 4. Core Vision Brand Positioning
**Priority:** #4
**Complexity:** Very low (~15 min)
**What to build:** Add explicit "anti-staffing mill / market correction" brand voice to SPEC.md and README.md tagline

---

## Phase 2 — Design First

### 5. Anti-Ghosting & Transparency Score
**Priority:** #5
**Existing coverage:** None in current project. Needs hires first to get data.
**What to design:** Post-application rating schema (communication speed, interview clarity, role accuracy, temp churn history). Integration with hire confirmation flow.
**Blocked by:** Hire confirmation flow having active data (post-launch)

### 6. Company-Sentiment & Culture Scoring
**Priority:** #6
**Complexity:** High (scraping TOS, AU defamation law, sentiment pipeline)
**Existing coverage:** Zero. No existing feature doc, schema, or spec.
**What to design:** Sentiment pipeline architecture → scraping targets (Glassdoor, Reddit) → scoring algorithm → legal review (defamation risk per Australian Consumer Law)

### 7. Offer-Potential Forecasting Model
**Priority:** #7
**Complexity:** High
**Existing coverage:** Phase 2 ML pipeline has `LogisticMatchScorer` + XGBoost + Optuna — covers ~40% of what's needed.
**Gaps:** Missing cohort-level analytics, company-specific patterns, structured gap analysis output with Bridge Path, market condition signals.
**What to design:** UX mockup for "X% chance of interview" display + skill gap visualization → extend ML pipeline output schema
**Blocked by:** Phase 2 delivery

### 8. Feedback Loops & Rejection Analytics
**Priority:** #8
**Complexity:** Medium
**Existing coverage:** Only `job_closed` event spec'd. No feedback schema, employer UI, or aggregation.
**What to design:** Structured rejection reason taxonomy → feedback schema → employer UI → candidate-facing skill gap analysis
**Best sequenced after:** Offer Forecasting (shared Bridge Path / skill gap logic)

### 9. Commute Calculator
**Priority:** #9
**Complexity:** Low
**What to design:** OSRM/Google Maps API integration for transit time estimates on job cards
**Dependency:** GPS proximity filtering (Phase 1)

---

## Phase 3 — Hold / Defer

### 10. Tailored Apply / One-Swipe Application
**Status:** **Hold** — major product philosophy conflict
**Conflict:** Current MVP eliminates traditional applications entirely (express interest → chat → hire). Strategy doc assumes applications exist and makes them easier with AI.
**Action needed:** Product direction decision. If direction shifts toward applications, this becomes high priority.

### 11. Vetted Talent Verification
**Status:** Defer — beyond v1 scope
**Complexity:** High (requires third-party integrations for ID checks, skill verification API)

### 12. Hyper-Local Job Hubs & Community
**Status:** Defer post-launch
**Blocked by:** Need critical user mass + location data
**What exists:** `suburb` field on jobs. Nothing for heatmaps, hub mapping, or community features.

### 13. Inferred Expertise Engine
**Status:** Defer to Phase 5 (post-launch)
**Complexity:** High (OAuth2 integrations, large-scale LLM analysis, privacy engineering)
**Blocked by:** Phase 2 ML infra, user base producing swipes

### 14. Career-Pathing Analytics
**Status:** Skip — revisit after 3+ months production data
**Need:** Months of swipe/apply data before meaningful

---

## Expected (not in current project)

### 15. Proof-of-Competency Anti-Bullshitter System
**Status:** Skip for v1
**Reason:** Conflicts with 10-second swipe speed for hospitality/retail beachhead

### 16. AI Resume Substance Detection
**Status:** Skip
**Reason:** Fundamentally incompatible with Hi-Hired's "no resumes" design principle

---

## Unified Priority Rank (all 16)

| # | Feature | Phase | Action | Complexity | Revenue | Trust |
|---|---------|-------|--------|:---------:|:-------:|:-----:|
| 1 | Salary Transparency | P1 | **Build Now** | Low | Medium | High |
| 2 | Centrelink Compliance Suite | P1 | **Build Now** | Low-Med | **$499-$3,999/mo** | High |
| 3 | GPS Proximity Filtering | P1 | **Build Now** | Low | Low | Medium |
| 4 | Core Vision brand positioning | P1 | **Build Now** | Very Low | — | High |
| 5 | Anti-Ghosting Score | P2 | Design First | Low | Medium | High |
| 6 | Company Sentiment Scoring | P2 | Design First | High | Brand diff | Very High |
| 7 | Offer Forecasting | P2 | Design First | High | Pro upsell | High |
| 8 | Feedback Loops | P2 | Design First | Med | Retention | High |
| 9 | Commute Calculator | P2 | Design First | Low | Low | Medium |
| 10 | Tailored Apply | P3 | Hold | — | — | — |
| 11 | Vetted Talent Verification | P3 | Defer | High | Premium tier | High |
| 12 | Hyper-Local Hubs | P3 | Defer | Med-High | Network effect | Medium |
| 13 | Inferred Expertise Engine | P3 | Defer | High | Re-engagement | Medium |
| 14 | Career-Pathing Analytics | P3 | Skip | High | Retention | High |
| 15 | Proof-of-Competency | — | Skip | High | — | — |
| 16 | AI Resume Detection | — | Skip | Med | — | — |
