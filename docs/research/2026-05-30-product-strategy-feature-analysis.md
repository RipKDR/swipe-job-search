# Hi-Hired Product Strategy — Core Market Feature Analysis

**Date:** 2026-05-30
**Source:** `docs/prompts/2026-05-30-product-strategy-prompts.md` (Doc 1)
**Base Project:** `/home/admin/swipe-job-search/`
**Reviewed Docs:** PRD.md, SPEC.md, README.md, AUTH_FLOWS.md, GUARDRAILS.md, MOBILE_STRATEGY.md, STACK.md, 02-mvp-definition.md, PROJECT_CONTEXT.md, BUSINESS_MODEL.md, gap-analysis-2026-05-28.md, docs/plans/*.md (4 phase plans + master manifest), AU_FAIR_WORK_PAY_TRANSPARENCY_CASUAL_2026.md

---

## Feature-by-Feature Analysis

### 1. Anti-Ghosting & Transparency Score

**What the source doc proposes:**
- Candidate rating of employers after application (communication quality, timeliness, job description accuracy, ghost listing detection)
- Aggregate into public-facing Transparency Score per employer
- "Burned" flag — automated warning if enough users report unresponsiveness
- Anti-gaming protections (fake reviews, competitor sabotage)
- B2B selling point: good scores as employer marketing asset

**What exists in current project docs:**
- **02-mvp-definition.md** explicitly defers this: adds "Reputation / reviews — Add when there's completed hires to review" in "What Does NOT Ship in v1"
- **GUARDRAILS.md** has Fair Work compliance checks (ABN verification, award rate validation, employment type labelling) but nothing about candidate-to-employer ratings
- **PRD.md** has engagement metrics (match rate, time-to-application) but no transparency/quality-of-experience metrics
- **PROJECT_CONTEXT.md** lists trust/safety as a high risk but frames it as moderation (report/block), not transparency scoring
- **BACKEND.md** has no tables for reviews/ratings/transparency scores

**What's planned in docs/plans/:**
- Nothing. None of the 4 Phase plans (2026-05-30) mention rating systems.

**Recommendation: Design First**
- The MVP doc correctly notes there's no point in reviews until there are completed hires to review
- However, the **data model** for transparency scoring should be designed now alongside the core schema (ratings table, aggregation views, scoring logic) even if the UI ships later
- The "Role Truth Verification" sub-component (contract type at posting — already in MVP via job_type field) is the foundation; extend with conversion tracking
- Build post-MVP after reaching ~50+ completed hires

**Dependencies:**
- Hire confirmation flow (already in MVP — match → hired confirmation)
- Jobs data model (already has job_type for contract type tracking)
- New tables: `employer_reviews`, `transparency_scores`, `burned_flags`

**Implementation Complexity: Medium**

**Priority within this cluster: #4**

---

### 2. Vetted Talent Verification

**What the source doc proposes:**
- Multi-tier verification levels: Identity (Gov ID), Skill (competency tests), Reference (automated), Portfolio (peer review)
- "Golden Profile" badges for verified candidates
- Employers pay premium to access pre-vetted talent pools
- Integration with HackerRank, LeetCode, GitHub for tech roles

**What exists in current project docs:**
- **02-mvp-definition.md** explicitly excludes references, resume upload, CV parsing, video introductions, personality tests
- **README.md** states "No resume upload in v1"
- **PROJECT_CONTEXT.md** lists "No AI/ML matching — ever" as a strategic non-goal (though verification ≠ matching)
- **BUSINESS_MODEL.md** mentions "Asuria Verified Badge" as a Provider Enterprise feature (employer-side endorsement, not candidate-side)
- **GUARDRAILS.md** references "CV parsed tags exist" as an onboarding gate from the old SPEC.md (superseded)

**What's planned in docs/plans/:**
- **Phase 2 (Data Intelligence)** adds Qdrant vector DB + ML match scoring, which could eventually underpin skill verification, but is not explicitly planned for this
- **Master Manifest** maps Phase 2 as "Medium" priority, weeks away from implementation

**Recommendation: Defer**
- Entirely beyond v1 scope per multiple canonical docs
- Conflicts with the v1 principle of "minimal profile — experience text + 5 skill tags suffice"
- Requires significant infra: identity verification integration, test-taking platform (HackerRank etc), reference automation
- The Phase 2 data intelligence layer would be a natural foundation but that's not planned for weeks
- Revisit post-v1 when the platform has critical mass of candidates and employers demanding screening signals

**Dependencies:**
- Phase 2 data intelligence (Qdrant, ML pipeline)
- Third-party integrations (identity verification, coding platforms)
- Candidate volume sufficient to make verification tiers valuable

**Implementation Complexity: High**

**Priority within this cluster: #5**

---

### 3. Proof-of-Competency Anti-Bullshitter System

**What the source doc proposes:**
- 5-minute interactive "Work-Sample Simulation" for technical roles
- LLM-evaluated responses against industry-standard troubleshooting guides
- Detects AI-generated fluff vs practical specificity
- Practice mode, employer-configurable thresholds
- Role-specific scenarios (technician, barista, etc.)

**What exists in current project docs:**
- **02-mvp-definition.md** explicitly says "No screening questions" in job posting
- **02-mvp-definition.md** says "Time to apply: 10 seconds" — a 5-minute assessment contradicts this value prop
- **PROJECT_CONTEXT.md** says "No AI/ML matching — ever" (though assessment ≠ matching)
- No existing doc references work-sample testing or practical assessments

**What's planned in docs/plans/:**
- Nothing. Phase 2 has ML match scoring but nothing about work-sample simulations or LLM-based assessment evaluation
- Phase 4 (Frontend Advanced) focuses on 60FPS swipe, not assessment UI

**Recommendation: Skip (for v1 beachhead)**
- The beachhead is hospitality/retail casual work — assessments are less relevant for barista/all-rounder roles
- A 5-minute assessment before applying directly contradicts the core value prop of "apply in 10 seconds"
- Requires LLM integration for evaluation, role-specific scenario database, employer-configurable thresholds — all heavy infra
- If the platform later expands to technical/professional roles (beyond hospitality beachhead), this becomes more relevant
- Consider as a premium employer add-on post-v1, not a core platform feature

**Dependencies:**
- LLM provider integration for evaluation
- Industry-specific scenario databases per role type
- Employer configuration UI (thresholds, pass/fail criteria)
- Practice mode infrastructure

**Implementation Complexity: High**

**Priority within this cluster: #6 (can re-evaluate if product expands beyond casual roles)**

---

### 4. AI Resume Substance Detection

**What the source doc proposes:**
- "Substance Scanner" that parses uploaded resumes for AI-generated fluff ("Excellent communication skills", "Results-driven professional")
- Prompts users for concrete evidence and quantification
- "Verified Profile" badge for substantiated resumes
- "AI Rewrite Assist" to transform vague claims into specific statements

**What exists in current project docs:**
- **02-mvp-definition.md** explicitly excludes resume upload/CV parsing ("No resume / CV requirements" repeated in both v1 ships and non-ships lists)
- **README.md** states "No resume upload in v1" and "No keyword search, no resume upload in v1"
- **PROJECT_CONTEXT.md** lists "No resume/CV requirements" as a fundamental principle
- **GUARDRAILS.md** references "CV parsed tags exist" as an onboarding gate from old SPEC.md — this is a superseded artifact

**What's planned in docs/plans/:**
- Nothing. Phase 1 backend has `job_normalizer.py` for job data normalization, not resume parsing

**Recommendation: Skip (fundamentally incompatible with product)**
- The entire Hi-Hired product is built on the principle of **no resumes** — candidates express themselves through short-form profile text (experience blurb, 5 skill tags, availability, work rights)
- Resume scanning is antithetical to this design philosophy
- A reframed version could exist post-v1 as a "Profile Enhancement Coach" that helps users write better experience text without requiring resume upload
- But as proposed (resume upload + AI scanning), it's a non-starter

**Dependencies:**
- None — would require fundamental product direction change
- If reframed: LLM integration, profile text analysis pipeline

**Implementation Complexity: Medium (low if product used resumes, but it doesn't)**

**Priority within this cluster: #6 (skip — product design conflict)**

---

### 5. Salary Transparency & Collective Leverage

**What the source doc proposes:**
- Anonymous salary reporting after offer acceptance (base, bonuses, benefits, role level)
- Aggregate market rate ranges per role/location
- "Your Position" — where the user's offer sits relative to market
- Negotiation talking points based on verified data
- Employer-facing anonymized benchmarking reports for purchase
- Minimum sample size thresholds (5+ submissions) for privacy

**What exists in current project docs:**
- **02-mvp-definition.md** requires "Pay rate" as a mandatory field on every job post — "must be specific"
- **READNE.md** states "Transparent pay on every card" as product principle #3
- **GUARDRAILS.md §8** (Fair Work Act Compliance) validates entered salary against Award minimums, labels employment type clearly, verifies ABN
- **RECRUITER_FLOW.md** says "No salary hiding: salary range is always visible on the card — no 'competitive salary' vagueness allowed"
- **docs/legal/AU_FAIR_WORK_PAY_TRANSPARENCY_CASUAL_2026.md** covers pay transparency compliance, card display requirements, employer obligations
- **02-mvp-definition.md** does include a hire confirmation flow (both parties tap "Hired")
- **BACKEND.md** has `hire_confirmations` table for confirmed hires

**What's planned in docs/plans/:**
- **Phase 2 (Data Intelligence)** CacheManager + ML pipeline could support aggregation but not explicitly planned for salary analysis
- The master manifest does not list salary transparency as a feature

**Recommendation: Build Now (design + partial implementation)**
- This is the single most-aligned feature with existing product direction — pay transparency is already a core principle and required field
- The hire confirmation flow (already in v1) provides the trigger point for anonymous salary reporting
- **What to build now:**
  1. Add a `salary_reports` table linked to hire confirmations (anonymous, with min sample size protection)
  2. Extend the hire confirmation flow with an optional "Report your salary" prompt
  3. Add a `market_rates` materialized view for aggregation
- **What to defer to post-MVP:**
  1. Employer-facing benchmarking reports (Phase 2 reporting infra)
  2. Negotiation support tool (needs sufficient data volume)
  3. Public market rate pages (needs trust + volume)
- The "collective leverage" narrative (empowering candidates with data) builds exactly on the existing brand promise of a candidate-first platform

**Dependencies:**
- Hire confirmation flow (already in MVP — §9 of 02-mvp-definition.md)
- Phase 2 analytics/aggregation for employer benchmarking (post-MVP)
- Privacy compliance per docs/legal/PRIVACY_ACT_RECRUITMENT_JOBSEEKER_DATA_2026.md

**Implementation Complexity: Low-Medium (core data model is simple; aggregation is medium)**

**Priority within this cluster: #1**

---

### 6. Disrupting the Staffing Mill Economy

**What the source doc proposes:**
- **Role Truth Verification** — employers must specify contract type at posting; system monitors if perm roles actually convert
- **Churn Alerts** — warning if a company cycles 3+ temps through same role in 6 months
- **Conversion Tracking** — temp-to-perm conversion rates by company
- **Worker Protection** — union/worker advocacy partnerships
- **Ethical Employer Certification** — badge for fair hiring practices
- Premium pricing for high-churn employers to disincentivize bad behavior
- Brand: "We are not a job board. We are a market correction tool."

**What exists in current project docs:**
- **GUARDRAILS.md §8** enforces contract type (casual/part-time/full-time) and ABN verification
- **02-mvp-definition.md** requires job_type selector on every post
- **RECRUITER_FLOW.md** includes ABN verification at account creation
- **PROJECT_CONTEXT.md** frames the platform as fighting the "gig economy" framing problem but doesn't address staffing mill mechanics
- **01-strategy-memo.md** mentions agency staffing as a competitor (15-25% cut) but no systematic anti-staffing-mill strategy
- Nothing about tracking conversion rates, churn alerts, or ethical certification

**What's planned in docs/plans/:**
- Nothing specifically. Phase 1 backend could support conversion tracking through the hire confirmation flow data model, but it's not planned

**Recommendation: Design First (with incremental build)**
- **Build now (low effort):**
  1. **Role Truth Verification** — extend the existing job post job_type field with a monitoring flag. After hire confirmation, track whether the role actually matched the stated type. This is a data integrity field, not a feature.
  2. Add a `conversion_events` table to track role history (hired → converted → retained)
- **Build post-MVP (medium effort):**
  1. **Churn Alerts** — aggregate query on conversion_events, display warning on employer's job cards
  2. **Conversion Tracking** — per-company temp-to-perm stats
- **Long-term:**
  1. **Ethical Employer Certification** — requires trust + volume
  2. **Worker Protection** — union/advocacy partnerships
- The "market correction tool" brand positioning is powerful and worth designing early, even if the full feature set takes time

**Dependencies:**
- Hire confirmation flow (already in MVP)
- Jobs data model already has job_type field — needs minimal extension
- Long-term: sufficient hire volume for meaningful churn/conversion stats

**Implementation Complexity:**
- Role Truth Verification: Low (data tracking)
- Churn Alerts: Medium (aggregation + display)
- Ethical Certification: High

**Priority within this cluster: #2**

---

## Ranked Priority List (All 6 Features)

| Rank | Feature | Recommendation | Rationale |
|------|---------|---------------|-----------|
| 1 | **Salary Transparency & Collective Leverage** | **Build Now** | Highest alignment with existing product. Pay transparency already a core principle and required field. Hire confirmation flow (MVP) provides the perfect trigger. Low complexity data model extension. Strengthens brand credibility. |
| 2 | **Disrupting the Staffing Mill Economy** | **Design First → Build Incrementally** | Maps to brand identity ("market correction tool"). Role Truth Verification is low-effort data tracking on existing job_type field. Churn Alerts and Conversion Tracking need design but are powerful differentiators. Best positioned as the overarching narrative. |
| 3 | **Anti-Ghosting & Transparency Score** | **Design Now → Build Post-MVP** | Explicitly deferred per 02-mvp (needs completed hires first). However, data model should be designed now alongside core schema. Design reviews table + aggregation logic even if UI ships later. Important trust mechanic. |
| 4 | **Vetted Talent Verification** | **Defer** | Beyond v1 scope per multiple docs. Conflicts with minimal-profile principle. Requires significant third-party integrations (ID verification, test platforms, reference automation). Phase 2 data infra could support later. |
| 5 | **Proof-of-Competency Anti-Bullshitter System** | **Skip (for beachhead)** | 5-min assessment conflicts with 10-second apply speed. Wrong audience for hospitality/retail beachhead. Requires LLM integration + role-specific scenario DB. Revisit if product expands to professional/technical roles. |
| 6 | **AI Resume Substance Detection** | **Skip (product conflict)** | Fundamentally incompatible with Hi-Hired's "no resumes" design principle. Would require reversing a core product decision. A "Profile Enhancement Coach" reframe could work post-v1 but not resume scanning as proposed. |

---

## Implementation Roadmap Summary

```
Phase 1 (v1 / Current MVP)
├── Ship: Mandatory pay on every card (done — in 02-mvp)
├── Ship: Job type selection (done — in 02-mvp)
├── Ship: Hire confirmation flow (done — §9 in 02-mvp)
├── Add: salary_reports table + hire confirmation extension (Rank 1)
├── Add: conversion_events table + Role Truth tracking (Rank 2)
└── Design: employer_reviews data model for future anti-ghosting (Rank 3)

Phase 2 (Post-MVP — ~50+ hires)
├── Launch: Salary market rate aggregation + "Your Position" view (Rank 1)
├── Launch: Churn Alerts for high-turnover employers (Rank 2)
├── Launch: Anti-Ghosting Transparency Score UI (Rank 3)
└── Design: Vetted Talent Verification requirements (Rank 4)

Phase 3 (Scale — ~500+ hires, expanded role types)
├── Launch: Employer-facing salary benchmarking reports (Rank 1)
├── Launch: Ethical Employer Certification badges (Rank 2)
├── Launch: Vetted Talent verification — Identity + Skill tiers (Rank 4)
└── Evaluate: Work-sample assessments for professional roles (Rank 5)
```
