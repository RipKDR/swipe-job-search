# Product Strategy UX & Intelligence Features Analysis — Hi-Hired

**Date:** 2026-05-30
**Source:** `docs/prompts/2026-05-30-product-strategy-prompts.md` (Doc 1)
**Compared against:** SPEC.md, MOBILE_STRATEGY.md, APP_FLOW.md, GUARDRAILS.md, STACK.md, foundational-docs/02-mvp-definition.md, docs/plans/ (Phases 1-4 + Master Manifest), docs/research/gap-analysis-2026-05-28.md

---

## Section 1: Core App Vision & Philosophy

### What Exists (Overlap)
- **STACK.md** — "The algorithm is you" tagline, mobile-first Expo RN, AU beachhead Tullamarine. Explicitly prioritizes transparent pay, bilateral opt-in, speed.
- **foundational-docs/02-mvp-definition.md** — Clear v1 promise: "An employer posts a casual barista role at $32/hr. 20 locals see it. Employer picks who to chat with. Both tap 'Hired'. No ads. No applications. No waiting."
- **GUARDRAILS.md** — Fair Work compliance (minimum wage display, award rate warning, ABN verification), AU Privacy Act 1988 compliance, WCAG 2.2 AA for DES/Asuria.
- **AGENTS.md** — Project DNA explicitly includes AU compliance, Fair Work pay transparency 2026, candidate-first orientation.
- **README.md** — Product principles: mobile-first, bilateral opt-in, transparent pay, no keywords/resumes v1.
- **APP_FLOW.md** — Core swipe loop, role selection, match flow align with Tinder-like UX.

### What's Already Planned
- **Phase 1-4** plans focus on technical architecture (FastAPI backend, Qdrant, ML, 60FPS swipe) — building the engine for the vision.
- **gap-analysis-2026-05-28.md** — Identified and closed `anti-ghosting/compliance/transparency` gaps in legal/ops docs during pre-scaffold audit.

### Gaps Between Doc Vision and Current Plan
- Strategy doc positions the app as an "anti-staffing mill" market correction tool. Current docs are more neutral ("job finder like SEEK, but built for humans"). The activist/correction brand voice is not reflected.
- Strategy doc suggests all features must solve a real problem ("no features for features' sake") — this *is* aligned with 02-mvp's "What Does NOT Ship" list.

### Recommendation: **Build Now** (minor polish)
The core vision is already well-established across STACK, 02-mvp, GUARDRAILS, and AGENTS.md. Add a paragraph to STACK.md or README.md explicitly codifying the "anti-staffing mill / market correction tool" positioning from the strategy doc to sharpen brand voice.

### Dependencies
- None (documentation-only change).

### Implementation Complexity
- **Very Low** — 15 minutes to update one document.

### Priority: **P0** (within this cluster — foundational alignment)

---

## Section 2: Hyper-Local Job Discovery & Community

### What Exists (Overlap)
- **STACK.md** — `expo-location` listed for suburb validation and optional radius sort.
- **Phase 1 schemas** (`jobs.py`) — `Location` model with suburb, state, postcode, lat/lng. `JobSearchQuery` with `radius_km`, `location_suburb`, `location_state` filters.
- **APP_FLOW.md** — Basic location-based job discovery via suburb field on job cards.
- **02-mvp-definition.md** — Suburb field on job posts and profiles; auto-expire after 30 days.
- **SPEC.md** (superseded) — Basic location field in data schema.

### What's Already Planned
- **Phase 2 (Qdrant vector DB)** — Semantic job search with payload indexes for `location_state`, `salary_min`, `salary_max`, `employment_type`. Can support filtered search by location but not "job hubs" or heatmap.
- **Phase 1 (Data Normalization)** — Location normalization with AU postcode validation, lat/lng coordinates.
- **docs/legal/AU_FAIR_WORK_PAY_TRANSPARENCY_CASUAL_2026.md** — Legal compliance for pay/location display.

### Gaps Between Doc Vision and Current Plan
| Strategy Feature | Current Status | Gap |
|---|---|---|
| Job hubs (Cremorne tech hub, South Melbourne, Docklands) | ❌ Not planned | No zone mapping exists |
| GPS-enabled proximity filters | ⚠️ Partial | `radius_km` exists in schema but no GPS integration |
| Application Heatmap (anonymized competition data) | ❌ Not planned | Entirely new feature |
| Local Hub Insights (community-sourced area info) | ❌ Not planned | Entirely new feature |
| Commute Calculator (public transport API) | ❌ Not planned | Entirely new feature |
| Hidden gem employer surfacing | ❌ Not planned | No employer discovery mechanism beyond swipe deck |
| Hyper-local push notifications | ❌ Not planned | No geofenced push trigger |
| Melbourne_STRATEGY.md | ⚠️ Very thin (20 lines) | Needs expansion with job hub definitions |

### Recommendation: **Design First** (ready for detailed spec, not implementation)
The GPS proximity filter and commute calculator are the most immediately valuable and technically feasible. They depend on basic Phase 1 infrastructure (lat/lng on jobs). The community features (heatmap, hub insights) should be deferred until user base reaches critical mass — they provide no value with <100 active users.

### Dependencies
- **Phase 1 Backend Foundation** (location normalization, lat/lng storage) — required for distance calculations.
- **Phase 2 Data Intelligence** (Qdrant geo-filtering could support proximity queries).
- `expo-location` integration in mobile app.

### Implementation Complexity
- GPS proximity: **Medium** (expo-location + Supabase geo-query)
- Commute Calculator: **Medium-High** (PTV/Google Maps API integration, caching)
- Application Heatmap: **High** (anonymization, real-time aggregation)
- Hub Insights / community features: **High** (moderation, spam prevention, UGC infrastructure)

### Priority: **P2** (GPS proximity first, community features later)

---

## Section 3: Inferred Expertise Engine (Passive Profiler)

### What Exists (Overlap)
- **Nothing substantial.** No current plan document or feature spec addresses passive profile building.
- **Phase 2 (match_scorer.py)** — ML-based skill overlap calculation exists but is for job-candidate matching, not profile construction.
- **APP_FLOW.md** — CV upload A/B variant (Variant A: "Upload CV → AI parses skills/experience") is the closest thing, but it's manual upload, not passive/OAuth.
- **02-mvp-definition.md** — Explicitly excludes "LinkedIn import, resume upload" from v1.

### What's Already Planned
- Nothing in Phases 1-4 addresses this.
- Phase 2 ML pipeline is designed for job matching, not candidate profiling.

### Gaps Between Doc Vision and Current Plan
| Strategy Feature | Current Status | Gap |
|---|---|---|
| GitHub OAuth2 integration → skill graph | ❌ Not planned | Entirely new |
| StackOverflow OAuth2 integration → expertise validation | ❌ Not planned | Entirely new |
| LinkedIn OAuth2 → professional history | ❌ Not planned | Entirely new |
| LLM agent for skill inference | ❌ Not planned | Requires LLM integration architecture |
| Hard Skill Graph visualization | ❌ Not planned | New UI work |
| Auto-updating profiles | ❌ Not planned | Background sync infrastructure |
| Per-integration privacy controls | ❌ Not planned | Privacy engineering |
| Solves cold-start problem | ❌ Not planned | This is the key value prop |

### Recommendation: **Defer** (post-Phase 2)
This is a high-differentiation feature that would give Hi-Hired a unique moat — no other Australian job platform auto-builds profiles from GitHub/LinkedIn. However, it requires:
1. Phase 2 ML infrastructure (vector DB, ML pipeline, LLM integration) as technical foundation
2. Significant privacy/OAuth2 engineering (each platform integration is a separate project)
3. A decision on the "resume-free" product philosophy (current MVP explicitly avoids resume/LinkedIn imports)

### Dependencies
- Phase 2 Data Intelligence (ML pipeline, LLM integration, vector DB)
- OAuth2 infrastructure (not in current Phase 1-4 plans)
- Privacy impact assessment for cross-platform data collection
- Product decision: does profile auto-building contradict the "no keywords, no resumes" philosophy?

### Implementation Complexity
- **Very High** — 3-4 independent OAuth integrations, LLM agent pipeline, skill graph data model, UI for visualization, privacy controls. Estimated 4-6 weeks for a focused team.

### Priority: **P4** (tentative Phase 5 candidate — re-evaluate after launch)

---

## Section 4: Career-Pathing Analytics

### What Exists (Overlap)
- **Nothing.** No current plan or feature spec addresses career pathing.
- **Phase 2 (match_scorer.py)** — Computes features like skill overlap, salary alignment, location proximity. These *could* theoretically feed into career pathing but are designed for job recommendation, not trajectory analysis.
- **02-mvp-definition.md** — No mention of analytics or career coaching.

### What's Already Planned
- **Phase 2: ML pipeline (XGBoost)** — Match scoring, not career pathing.
- **Phase 2: Qdrant vector DB** — Semantic job search that *could* identify "next role" opportunities.
- **docs/analytics/POSTHOG_ANALYTICS_TAXONOMY_RN_IMPL.md** — Analytics instrumentation for user behavior tracking.

### Gaps Between Doc Vision and Current Plan
| Strategy Feature | Current Status | Gap |
|---|---|---|
| Career trajectory inference from swipe patterns | ❌ Not planned | Requires months of usage data |
| Skill Gap Analysis with time estimates | ❌ Not planned | Entirely new data model |
| Market Demand data | ❌ Not planned | Requires job market analytics pipeline |
| Salary Trajectory estimates | ❌ Not planned | Requires salary data aggregation |
| Milestone tracking | ❌ Not planned | New UI and notification system |
| Learning platform integration (Coursera/Udemy) | ❌ Not planned | Partnership + affiliate integration |
| Career Map visualization | ❌ Not planned | Significant UX work |

### Recommendation: **Skip for Now**
This is a genuinely valuable feature that transforms the app from a job finder into a career development platform. However:
1. It requires **months of user activity data** before the analytics become meaningful (you need swipe history, application patterns, job outcomes).
2. It depends on Phase 2 ML infrastructure + aggregated salary/market data.
3. It has the longest time-to-value of any feature in this analysis.
4. No learning platform partnerships exist.

Revisit after Phase 2 completion and 3+ months of production usage. If the product gains traction, this could be the #1 engagement driver.

### Dependencies
- Phase 2 (ML pipeline, vector DB) as technical foundation
- 3+ months of production user activity data
- Salary transparency data (from "Salary Transparency & Collective Leverage" feature — §13 in Doc 1, not in this analysis scope)
- Learning platform partnership agreements

### Implementation Complexity
- **Very High** — ML models for trajectory prediction, complex visualizations, integration with external platforms, significant data infrastructure.

### Priority: **P5** (post-launch, after Phase 2, after data accumulation)

---

## Section 5: Tailored Apply & One-Swipe Application

### What Exists (Overlap)
- **APP_FLOW.md** — "Swipe Right -> Apply" is described as the core mechanic, but "Apply" here means expressing interest, not submitting an application with cover letters.
- **02-mvp-definition.md** — v1 model: candidate swipes right → employer sees interested list → employer initiates chat. The word "application" is deliberately avoided. No cover letters, no selection criteria.
- **SPEC.md** (superseded) — Basic "swipe right = apply" concept from the original Next.js direction.

### What's Already Planned
- The match model (employer-initiated) is deliberately **not** an application flow. It's "express interest → chat → hire."
- **02-mvp-definition.md** explicitly excludes: "application form, screening questions, keyword fields."
- **Phase 4** (frontend enhancements) — 60FPS swipe, predictive buffering — does not include AI application features.

### Gaps Between Doc Vision and Current Plan
| Strategy Feature | Current Status | Gap |
|---|---|---|
| Quick Apply (AI-generated tailored cover letter) | ❌ Not planned | Contradicts v1's "no applications" philosophy |
| Custom Apply (pre-filled selection criteria) | ❌ Not planned | Contradicts v1's "no applications" philosophy |
| AI tailoring engine (JD → profile matching) | ❌ Not planned | Requires LLM integration |
| Application Quality Score for employers | ❌ Not planned | New data model |
| Draft Applications folder | ❌ Not planned | New UI work |

### Product Direction Conflict
This is the most significant gap in this analysis because it represents a **fundamental product philosophy difference**:

- **Current MVP philosophy (02-mvp):** "No applications. No waiting. Express interest. Chat. Hire." The product eliminates the traditional application process entirely.
- **Strategy Doc vision:** AI-assisted applications that reduce friction but still follow the traditional application paradigm.

These are two different product models. The strategy doc assumes applications exist and makes them easier. The current MVP assumes applications shouldn't exist at all in the swipe-to-chat model.

### Recommendation: **Hold / Defer with Strategy Question**
Before any implementation, the product team should resolve this philosophy question:
- **Option A:** Stay with "no applications" (current MVP). Invest in chat-based hiring. Drop Tailored Apply.
- **Option B:** Add applications as an optional layer. Quick Apply becomes the "swipe right" action with AI assistance.

If Option B is chosen, implementation should be **Design First** to explore how applications coexist with the chat-first match model.

### Dependencies
- Product strategy decision on application paradigm
- LLM integration (not in current plans — could use Supabase Edge Functions with OpenAI)
- Phase 2 data pipeline if quality scores use ML
- If deferring: no dependencies

### Implementation Complexity
- Quick Apply v1 (basic cover letter gen): **Medium** (LLM call + profile-to-JD mapping)
- Full AI tailoring + Quality Score: **High** (selection criteria parsing, verification loops, scoring model)
- Current product direction change: **Highest** (requires rethinking core flow)

### Priority: **P3** (blocked pending product strategy decision)

---

## Ranked Priority List — All Covered Features for Hi-Hired

| Rank | Feature | Priority Label | Recommendation | Key Dependency | Complexity |
|------|---------|---------------|---------------|----------------|------------|
| **1** | Core Vision: "Anti-staffing mill" brand positioning | **P0 — Build Now** | Update STACK.md/README.md with sharper market correction language | None | Very Low |
| **2** | Hyper-Local: GPS proximity filtering | **P1 — Build Now/Design First** | Implement expo-location + radius-based job filtering | Phase 1 lat/lng storage | Medium |
| **3** | Hyper-Local: Commute Calculator (PTV API) | **P2 — Build Now** | Integrate public transport API for realistic commute times | GPS proximity (#2) | Medium-High |
| **4** | Tailored Apply: Product strategy decision | **P3 — Hold (Strategy Question)** | Resolve "applications vs. no applications" product direction | Product strategy alignment | N/A (decision) |
| **5** | Hyper-Local: Job hubs mapping & zone discovery | **P3 — Design First** | Define Melbourne job hub zones, phase after GPS proximity | GPS proximity (#2) | Medium |
| **6** | Tailored Apply: Quick Apply (AI cover letter) | **P3 — Design First** | Only if product direction shifts toward applications | Product decision (#4), LLM integration | Medium |
| **7** | Hyper-Local: Application Heatmap | **P4 — Defer** | Requires critical user mass for anonymity | 1,000+ active users | High |
| **8** | Hyper-Local: Local Hub Insights (community UGC) | **P4 — Defer** | Requires moderation infrastructure, community manager | User base + mod tooling | High |
| **9** | Hyper-Local: Hyper-local geofenced push notifications | **P4 — Defer** | Requires stable user base and geofencing infra | GPS proximity (#2), Push infra | Medium |
| **10** | Inferred Expertise Engine (Passive Profiler) | **P4 — Defer to Phase 5** | After Phase 2 ML infra, requires OAuth2 + LLM + privacy work | Phase 2, OAuth2 infra, privacy audit | Very High |
| **11** | Career-Pathing Analytics | **P5 — Skip for Now** | Requires months of data, Phase 2 ML, salary data aggregation | Phase 2, 3+ months usage data | Very High |

### Summary of Recommendations by Action

**Build Now (1 feature):**
- Core Vision brand positioning update (documentation, ~15 min)

**Design First (3 features):**
- GPS proximity filtering
- Commute Calculator
- Job hubs mapping

**Hold / Pending Decision (1 feature):**
- Tailored Apply / One-Swipe Application — requires product philosophy resolution

**Defer (5 features):**
- Application Heatmap
- Local Hub Insights
- Hyper-local push notifications
- Inferred Expertise Engine (post-Phase 2)
- Career-Pathing Analytics (post-launch, post-data accumulation)

**Skip for Now (1 feature):**
- Career-Pathing Analytics (revisit post-Phase 2)

### Phase Integration Map

```
Phase 1 (Backend Foundation) ─── GPS proximity #2 (lat/lng storage)
                                │
Phase 2 (Data Intelligence)  ─── Inferred Expertise #10 (vector DB, ML)
                             ─── Career-Pathing #11 (ML pipeline, salary data)

Phase 3 (Infrastructure)     ─── Commute Calculator #3 (API gateway, caching)

Phase 4 (Frontend Advanced)  ─── Tailored Apply UI #6 (if product decides)
                             ─── GPS proximity UI #2 (expo-location integration)

Post-Launch / Phase 5        ─── Application Heatmap #7
                             ─── Local Hub Insights #8
                             ─── Hyper-local Push #9
                             ─── Inferred Expertise Engine #10
                             ─── Career-Pathing Analytics #11
```
