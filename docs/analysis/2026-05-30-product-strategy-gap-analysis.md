# Product Strategy Gap Analysis — Hi-Hired
## Compliance, Trust & Intelligence Feature Audit

**Date:** 2026-05-30
**Source:** `docs/prompts/2026-05-30-product-strategy-prompts.md`
**Scope:** Sections 1–4: Centrelink Compliance, Offer Forecasting, Company Sentiment, Rejection Analytics

---

## 1. Centrelink / Workforce Australia Compliance Suite

### What Exists in the Project

| Component | Doc | Status |
|-----------|-----|--------|
| `compliance-export` Edge Function spec | `SPEC.md` §6 — weekly cron (Mon 7am AEDT), PDF via @react-pdf/renderer, Supabase Storage, email-to-provider | **Spec'd, not built** |
| DSS activity code mapping (JA/EC/JI/EP) | `ASURIA_PARTNERSHIP.md` §5 — complete mapping table | **Spec'd** |
| Weekly PDF report structure (DSS format) | `ASURIA_PARTNERSHIP.md` §5 — full template with per-candidate layout | **Spec'd** |
| JSON + CSV export formats | `ASURIA_PARTNERSHIP.md` §5, `ANALYTICS_PLAN.md` §6 | **Spec'd** |
| Mentor/caseload dashboard + bulk-swipe | `BUSINESS_MODEL.md` §5 — Provider Enterprise pricing tiers ($499–$3,999/mo) | **Spec'd** |
| Provider notifications (report ready, milestone, inactivity) | `NOTIFICATIONS.md` §2 — push + in-app triage | **Spec'd** |
| Compliance reporting KPIs in analytics | `ANALYTICS_PLAN.md` §6 — metrics mapped to DSS fields | **Spec'd** |
| Asuria partnership structure, 90-day onboarding, pilot criteria | `ASURIA_PARTNERSHIP.md` §6-7 | **Planned** |
| Bulk-swipe consent flag required by Privacy Act | `ARCHITECTURE_AUDIT.md` 🟠 HIGH 5 — missing from schema | **Known gap** |
| Compliance export partial-failure recovery | `ARCHITECTURE_AUDIT.md` 🟠 HIGH 3 — needs per-candidate persistence | **Known gap** |

### What's Planned Elsewhere

- `docs/plans/2026-05-30-phase1-backend-service-foundation.md` — FastAPI backend that could host the compliance service, but the Edge Function approach in SPEC.md is lighter-weight and works independently
- `docs/plans/2026-05-30-master-manifest.md` — maps compliance export to current architecture, not Phase 2 ML

### What's Missing vs Product Strategy

- **Compliance Dashboard UI** — per-period application counts, employer list, outcome tracking (only conceptual in product strategy, partially implied by Provider Enterprise dashboard)
- **Deadline reminders & low-application alerts** — NOTIFICATIONS.md has inactivity checks but no period-relative deadline system
- **Appointment tracking** — users logging upcoming job provider meetings
- **Tamper-proof logging guarantee** — current spec has no audit/tamper-proofing mechanism

### Recommendation

**BUILD NOW — Priority 1**

This is the most mature feature area. The `compliance-export` Edge Function is fully specified across 5 documents. Build the Compliance Dashboard + deadline alerting on top of existing specs.

### Dependencies
- None on Phase 2 ML pipeline — runs on existing Supabase Edge Functions + RN client
- Must fix: `bulk_swipe_consent` schema gap (ARCHITECTURE_AUDIT 🟠 HIGH 5) before provider bulk-swipe launches
- Must fix: compliance export partial-failure recovery (ARCHITECTURE_AUDIT 🟠 HIGH 3)

### Implementation Complexity

**Low–Medium** — Edge function spec exists, DB schema has base tables (swipes, matches), main work is Dashboard UI + deadline system + report generation implementation

### AU Regulatory Considerations

| Concern | Relevance |
|---------|-----------|
| **Privacy Act (APP 11)** | Secure storage of job search activity data — client-side compliance logs must be encrypted at rest |
| **Privacy Act (APP 6)** | Use/disclosure of compliance data to DSS/DES providers — needs explicit consent collection |
| **DSS Data Exchange Protocol** | Report format must match DESE specifications for automated acceptance |
| **NDIS Quality & Safeguards** | If extended to NDIS participants, additional reporting requirements apply |
| **Fair Work Act** | Compliance logging must not inadvertently capture protected attributes or discriminatory data |
| **Bulk-swipe consent** | Privacy Act requires informed consent before provider can act on behalf of candidate (documented gap 🟠 HIGH 5) |

---

## 2. Offer-Potential Forecasting Model

### What Exists in the Project

| Component | Doc | Status |
|-----------|-----|--------|
| `LogisticMatchScorer` class — heuristic + ML fallback | `docs/plans/2026-05-30-phase2-data-intelligence.md` Task 4 | **Planned (Phase 2)** |
| `MatchTrainingPipeline` — XGBoost + Optuna + MLflow | `docs/plans/2026-05-30-phase2-data-intelligence.md` Task 4 | **Planned (Phase 2)** |
| Feature vector: skill overlap, salary alignment, location match, type match | `docs/plans/2026-05-30-phase2-data-intelligence.md` Task 4 Step 2 | **Planned (Phase 2)** |
| MLflow model registry with promotion gate | `docs/plans/2026-05-30-phase2-data-intelligence.md` Task 4 Step 3 | **Planned (Phase 2)** |
| Qdrant vector DB for semantic job search | `docs/plans/2026-05-30-phase2-data-intelligence.md` Task 1 | **Planned (Phase 2)** |

### What's Planned Elsewhere

- Phase 2 Data Intelligence layer (`docs/plans/2026-05-30-phase2-data-intelligence.md`) covers Qdrant + ML pipeline + caching + scraper
- Master manifest (`docs/plans/2026-05-30-master-manifest.md`) maps ML pipeline to P2 Task 4, Medium priority

### What's Missing vs Product Strategy

- **Cohort-level analytics** — "Candidates with your profile had X% interview rate at this company" — no historical cohort analysis capability
- **Company-specific patterns** — selectivity ratios, typical interview rates per employer (no data model)
- **Market condition signals** — role age, application-to-hire ratios, posting competition
- **Gap Analysis output** — the scorer outputs `float`, not structured "Missing: 2 years K8s experience" explanations
- **Bridge Path** — skill recommendations to move from Low to Medium match
- **UX display** — no wireframes/spec for how the probability score is shown on job cards
- **Candidate expectation data** — expected salary, preferred employment type, commute radius are all optional/undeveloped

### Recommendation

**DESIGN FIRST — Priority 3**

The Phase 2 ML pipeline plan is a starting point for the scoring engine, but the product strategy's forecasting model requires substantial extension:
1. Extend feature engineering for cohort analysis + company patterns + market signals
2. Add structured explanation output (not just probability float)
3. Design Bridge Path feature with skill database integration
4. Complete UX specification for score presentation on job cards
5. Build candidate expectation data model into profile schema

### Dependencies
- Phase 2 ML Pipeline (P2 Task 4) — prerequisite foundation
- Qdrant vector store (P2 Task 1) — semantic skill matching for Gap Analysis
- User profile enrichment (Inferred Expertise Engine from product strategy §10) — richer skill data
- Job database with historical records — needed for cohort-level statistics
- Market data ingestion — role age, application volume from job posting feeds

### Implementation Complexity

**High** — ML model extension, cohort analytics system, structured explanation generation, skill recommendation engine, market data pipeline, and UX layer. The existing Phase 2 plan covers ~40% of what's needed.

### AU Regulatory Considerations

| Concern | Relevance |
|---------|-----------|
| **Privacy Act (APP 5)** | Candidates must be notified that their application data is used for scoring models — transparency obligation |
| **Privacy Act (APP 12)** | Right of access to personal information includes the scoring model inputs — candidate could request explanation of why a score was low |
| **Fair Work Act** | Scoring must not introduce bias based on age, gender, ethnicity, disability — model fairness auditing required |
| **Disability Discrimination Act** | Scoring must accommodate reasonable adjustments for candidates with disability |
| **NDIS / DES** | Forecast scores for DES participants need special handling — must not discourage applications |
| **Ethical AI notice** | Recommendation: add "How this score is calculated" disclosure on every forecast display |

---

## 3. Company-Sentiment & Culture Scoring

### What Exists in the Project

| Component | Doc | Status |
|-----------|-----|--------|
| `ScrapingSession` — anti-bot HTTP client with proxy rotation | `docs/plans/2026-05-30-phase2-data-intelligence.md` Task 3 | **Planned (Phase 2)** |
| `ScraperHealthMonitor` — quarantine on consecutive failures | `docs/plans/2026-05-30-phase2-data-intelligence.md` Task 3 | **Planned (Phase 2)** |
| **Company sentiment feature** | **None** — no product doc, no schema, no spec | **Not covered** |

### What's Planned Elsewhere

- Phase 2 Task 3 scraper infrastructure is intended for job board scraping (SEEK, Jora), NOT company review sites
- No existing company sentiment or culture scoring feature exists anywhere in the project docs

### What's Missing vs Product Strategy

- **Everything.** This feature has zero coverage in the current project. Required from scratch:
  - Sentiment analysis pipeline (LLM/NLP pipeline for review classification)
  - Glassdoor, Blind, Reddit, Twitter/X integration (scraping + API rate limits + auth)
  - Structured scoring model across 5 dimensions
  - Review bombing detection logic
  - Trending/sentiment direction indicators
  - UX design for culture score display on job cards
  - Legal review of source platform TOS compliance
  - Weighting algorithm (verified vs anonymous, recency)

### Recommendation

**DESIGN FIRST — Priority 2**

This is a high-differentiation trust feature. It directly supports the "market correction tool" brand positioning from the product strategy. But it has significant legal risk, requires new infrastructure (sentiment analysis), and touches scraping sources with complex TOS.

Phase 2 (scraper infrastructure) can be extended to support this, but needs a dedicated design pass first.

### Dependencies
- Phase 2 scraper infrastructure (P2 Task 3) — proxy rotation, health monitoring reusable
- LLM/NLP pipeline — sentiment classification from review text
- Data sourcing strategy — determine whether to scrape, use APIs, or partner with Glassdoor/Blind
- Legal clearance — defamation risk assessment, TOS compliance, platform usage terms
- Anti-Ghosting/Transparency Score (§2 of product strategy) — companies also rated on responsiveness, could merge data model

### Implementation Complexity

**High** — legal risk, multi-platform data sourcing, NLP pipeline, scoring model, real-time trending, UX. This is the most complex feature in the cluster.

### AU Regulatory Considerations

| Concern | Relevance |
|---------|-----------|
| **Defamation Law** | Publicly scoring companies carries defamation risk if scores are inaccurate or based on unverified reviews — critical to include methodology disclaimers, appeal/remove process |
| **Privacy Act (APP 3)** | Collecting personal opinions (Glassdoor reviews) about identifiable individuals (company managers) — sensitive collection issue |
| **Australian Consumer Law (S 18)** | Misleading representations about businesses if scores are inaccurate — need robust methodology |
| **Competition & Consumer Act** | Anti-competitive considerations if scores systematically harm certain businesses |
| **Scraping TOS risk** | Glassdoor, Blind, Reddit TOS may prohibit commercial scraping — alternative data sourcing or API licensing needed |
| **Recommendation:** | Show aggregate scores only (no individual review text), use minimum sample thresholds (5+ reviews), include "report inaccuracy" button, annual legal review |

---

## 4. Feedback Loops & Rejection Analytics

### What Exists in the Project

| Component | Doc | Status |
|-----------|-----|--------|
| `job_closed` PostHog event with reason enum | `ANALYTICS_PLAN.md` §3 | **Spec'd** |
| Job-closed notification sent to candidates | `NOTIFICATIONS.md` §2 — "Application status" notification | **Spec'd** |
| Recruiter swipe RLS policy gap | `ARCHITECTURE_AUDIT.md` 🟠 HIGH 4 — recruiter cannot read swipes client-side | **Known gap** |

### What's Planned Elsewhere

- No feedback/rejection table in DB schema (SPEC.md has no such table)
- No feedback UI for employers
- No rejection analytics aggregation
- No growth tracker or skill bridging

### What's Missing vs Product Strategy

- **Structured rejection reason taxonomy** — certification gap, experience gap, skill mismatch, role filled, other
- **Feedback record schema** — no database table defined
- **Employer feedback UI** — structured form with incentives (reduced fees, "Top Employer" badges)
- **Candidate feedback presentation** — constructive framing, recommended actions
- **Aggregation engine** — systemic gap identification over 10+ applications
- **Growth Tracker** — marking addressed feedback items over time
- **Employer incentive system** — for detailed feedback provision
- **Bidirectional connection with Bridge Path** — rejection gaps should feed skill recommendations

### Recommendation

**DESIGN FIRST — Priority 4**

This is a powerful retention and trust feature but has low immediate revenue impact. It requires schema design, employer behavioral design (getting them to provide feedback), and connection to the skill recommendation system. Highest value once candidate base is established and rejection volume provides useful aggregated data.

### Dependencies
- Recruiter RLS fix (ARCHITECTURE_AUDIT 🟠 HIGH 4) — prerequisite for any recruiter dashboard feature including feedback submission
- Match system + job closure flow — feedback triggers when job is closed and candidate had right-swiped
- Notification system (NOTIFICATIONS.md) — for employer feedback prompts and candidate notification of new feedback
- Anti-Ghosting/Transparency Score — rejection patterns feed into transparency scoring
- Bridge Path / Gap Analysis (Offer Forecasting) — feedback gaps should connect to skill recommendations
- Offer-Potential Forecasting model — aggregated rejection patterns inform cohort analysis

### Implementation Complexity

**Medium** — schema design + employer UI + candidate UI + analytics aggregation. The behavioral challenge (getting employers to provide feedback) is higher complexity than the technical build.

### AU Regulatory Considerations

| Concern | Relevance |
|---------|-----------|
| **Privacy Act (APP 12)** | Candidate right of access to personal information includes structured rejection feedback — must be stored and retrievable |
| **Privacy Act (APP 13)** | Correction rights — candidate can dispute inaccurate feedback |
| **Fair Work Act (General Protections)** | Rejection reasons must not be discriminatory (age, gender, disability, race) — structured reason lists must exclude protected attributes |
| **Disability Discrimination Act** | If a DES candidate receives "skill mismatch" feedback, reasonable adjustment considerations apply |
| **Recommendation:** | Rejection reasons must use a controlled taxonomy vetted for discrimination risk; include "Other (confidential)" option that doesn't require explanation; provide an appeals/rebuttal mechanism |

---

## Ranked Priority List

| # | Feature | Rec | Complexity | Revenue Impact | Trust Impact | Dependencies |
|---|---------|-----|-----------|---------------|-------------|-------------|
| **1** | **Centrelink / Workforce Australia Compliance Suite** | **Build Now** | Low–Med | **High** (Provider Enterprise $499–$3,999/mo) | Medium | ARCHITECTURE_AUDIT fixes 🟠 HIGH 3 + 🟠 HIGH 5 |
| **2** | **Company-Sentiment & Culture Scoring** | **Design First** | High | Medium (brand differentiation) | **Very High** | Phase 2 scraper infra + legal clearance |
| **3** | **Offer-Potential Forecasting Model** | **Design First** | High | Medium (retention + Pro upsell) | High | Phase 2 ML Pipeline (P2 Task 4) + Qdrant (P2 Task 1) |
| **4** | **Feedback Loops & Rejection Analytics** | **Design First** | Medium | Low (indirect retention) | **High** | ARCHITECTURE_AUDIT 🟠 HIGH 4 + notification system + Offer Forecasting |

### Rationale for Priority Order

1. **Compliance Suite first** — it's the only feature at "Build Now" readiness, has the clearest revenue path ($499–$3,999/mo provider subscriptions), is already cross-specified across 5+ docs, and the Asuria partnership (§3 of BUSINESS_MODEL.md) is the fastest path to sustainable revenue. It also has the lowest implementation complexity.

2. **Company Sentiment second** — it has zero coverage today and carries legal risk, so starting the design/legal process immediately is critical. It's the highest trust-building feature and directly supports the "market correction" brand positioning. The Phase 2 scraper infrastructure can be extended to support it, but needs a dedicated design pass.

3. **Offer Forecasting third** — the Phase 2 ML pipeline plan covers ~40% of requirements. Needs significant extension for cohort analysis, structured explanations, and Bridge Path. Best sequenced after Phase 2 ML pipeline is delivered so feature engineering can build on real infrastructure.

4. **Rejection Analytics fourth** — lowest immediate impact, though high long-term retention value. Best sequenced after the feedback infrastructure (recruiter RLS fix, notification system, match flow) is operational and there's enough candidate volume for meaningful aggregation. Should be designed in tandem with Offer Forecasting (shared Bridge Path / skill gap logic).

### Recommended Next Actions

1. **Immediate:** Fix architecture audit findings 🟠 CRITICAL 1 (match UNIQUE constraint), 🟠 HIGH 3 (compliance export persistence), 🟠 HIGH 5 (bulk_swipe_consent), and 🟠 HIGH 4 (recruiter swipe RLS) — these block compliance suite and feedback features
2. **Week 1:** Begin Compliance Dashboard UI implementation + deadline/alert system
3. **Week 1:** Start legal review for Company Sentiment data sourcing (Glassdoor TOS, AU defamation risk)
4. **Week 2:** Update Phase 2 Data Intelligence plan to include Offer Forecasting extensions (cohort analysis, structured explanations, Bridge Path)
5. **Week 3–4:** Design Rejection Analytics schema + employer feedback UX
6. **Phase 2 delivery:** ML pipeline (P2 Task 4) + Qdrant (P2 Task 1) unlocks Offer Forecasting and Feedback Analytics
