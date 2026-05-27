# Risks and Mitigations — SwipeJobs Melbourne

## 1. Marketplace Cold Start 🧊

**Risk:** No jobs → no candidates → no employers → nothing works. The classic two-sided marketplace problem.

**Severity:** Critical  
**Likelihood:** High  
**Impact:** If not solved, the product never reaches useful scale.

**Mitigations:**
- **Seed jobs manually** — Admin-enter 20-30 realistic Melbourne jobs with employer consent before launch.
- **Curated supply first** — Manually recruit 3-5 committed employers who agree to post jobs before any candidate marketing.
- **Single-sided start** — If employer supply is the bottleneck, start as a candidate-facing job discovery tool with curated/sourced jobs.
- **Narrow geography** — Focus on 2-3 Melbourne suburbs (e.g., Fitzroy/Collingwood, CBD, South Yarra) instead of all Melbourne. Higher density = better experience.
- **Community-led growth** — Leverage existing Melbourne casual-work Facebook groups, subreddits, and university noticeboards.

**Check:** Do we have 20 real jobs before we market to any candidates?

---

## 2. Big Competitors Can Copy the Feature 🏢

**Risk:** SEEK, Indeed, or Jora add a swipe view to their existing apps with their massive job inventory and employer base.

**Severity:** High  
**Likelihood:** Medium  
**Impact:** Loss of differentiation; user acquisition becomes harder.

**Mitigations:**
- **Move fast** — Build, validate, and iterate before incumbents notice this wedge.
- **Don't compete on features alone** — Compete on focus (casual Melbourne jobs), community, speed, and employer relationships.
- **Network effects** — The real moat is local employer relationships and candidate trust, not the swipe UI.
- **Incumbent inertia** — SEEK and Indeed have massive product debt; adding a swipe view is easy, but making their core product work better for casual hiring is hard.
- **Brand + community** — Build a Melbourne identity. "Local jobs for locals" is harder for a national platform to authentically replicate.

**Check:** If SEEK launched a swipe view tomorrow, would we still have a reason to exist? (Answer should be: yes — because we're faster, more local, and focused on casual work.)

---

## 3. Legal Risk from Job Data Sourcing ⚖️

**Risk:** Using third-party job data in ways that violate terms of service, copyright, or data licensing.

**Severity:** High  
**Likelihood:** Low (if we follow the plan)  
**Impact:** Cease-and-desist letters, legal costs, product takedown, reputational damage.

**Mitigations:**
- **No scraping** — Hard rule, documented in CLAUDE.md, PROJECT_CONTEXT.md, and source strategy doc.
- **Direct employer jobs first** — All MVP job supply comes from employer submissions or manual admin entry with documented permission.
- **Adzuna attribution** — If Adzuna is integrated later, comply with attribution requirements and display source badges.
- **Legal review** — Before adding any third-party data source, review current terms or consult a lawyer.
- **Source tracking** — Every job has a `source_type` field so we know exactly where each listing came from.

**Check:** Is every job in the database traceable to a legitimate source with clear reuse permission?

---

## 4. Candidate Trust and Safety 🔒

**Risk:** Fake jobs, spam employer posts, or candidate safety incidents damage trust and brand.

**Severity:** High  
**Likelihood:** Medium  
**Impact:** User loss, bad reviews, potential regulatory issues.

**Mitigations:**
- **Employer verification** — Manual or automated verification for employers (business name, ABN, phone, email domain).
- **Job moderation** — Admin review of new job posts before they go live in early stages.
- **Report/flag** — Basic reporting flow for candidates to flag suspicious jobs.
- **No in-app chat in MVP** — Contact handoff via email/SMS reduces abuse surface.
- **Privacy-first** — Candidate profiles are not publicly searchable. Employers only see candidates who express interest.
- **Basic rate limiting** — Prevent individual employers from posting 50+ jobs at once.

**Check:** What happens when the first fake job is posted? Is there a clear response path?

---

## 5. Monetisation Uncertainty 💰

**Risk:** Employers won't pay for casual job listings on a new platform.

**Severity:** High  
**Likelihood:** Medium  
**Impact:** No revenue model; product can't sustain itself.

**Mitigations:**
- **Free MVP** — Validate demand before building payment infrastructure.
- **Low-cost entry** — Pricing should be significantly lower than SEEK ($300+/ad).
- **Value-first selling** — Show employers the quality/quantity of interested candidates before asking for payment.
- **Subscription model** — Monthly pass for regular hirers (cafes, venues) rather than per-ad pricing.
- **Freemium** — Basic job posting free; paid for features like priority listing, candidate contact details, analytics.

**Check:** Do at least 2 beta employers express willingness to pay before we build billing?

---

## 6. Employer Outreach is Hard 📞

**Risk:** We can't get enough employers to post jobs fast enough to build job supply.

**Severity:** High  
**Likelihood:** Medium-High  
**Impact:** Stale or thin job supply kills candidate engagement.

**Mitigations:**
- **Walkable outreach** — Target high-density hospitality/retail strips (Lygon St, Chapel St, Smith St, Sydney Rd). Walkable outreach is harder to ignore than email.
- **Offer free trial** — "Post your first 5 jobs free" removes risk for employers.
- **Value proposition clarity** — Employers get interested candidates without paying $300/ad or 20% agency fee.
- **Employer referral** — After first job post, ask employers to refer other businesses.
- **If employer supply is blocked** — Pivot to curated/agent-sourced jobs: manually find and list relevant jobs from public sources with permission.

**Check:** Can we get 5 real jobs in the system within 2 weeks of outreach start?

---

## 7. Candidate Quality (for Employers) 📋

**Risk:** Employers get irrelevant or unserious interested candidates.

**Severity:** Medium  
**Likelihood:** Medium  
**Impact:** Employers stop using the platform.

**Mitigations:**
- **Minimum profile fields** — Require basic profile (suburb, availability, work rights, experience level) before a candidate can express interest.
- **Employer controls** — Shortlist/reject flow lets employers filter.
- **Basic friction** — Requiring a profile (even minimal) reduces "swipe everything" behaviour vs truly interested applications.
- **Contact handoff** — Employer contacts candidate directly (no in-app messaging), so the employer controls the relationship.

**Check:** Do employers report that interested candidates are generally relevant?

---

## 8. Mobile App Distribution 📱

**Risk:** Getting a mobile app in front of enough Melbourne casual workers is expensive and slow.

**Severity:** Medium  
**Likelihood:** Medium  
**Impact:** Slow candidate adoption.

**Mitigations:**
- **Expo/React Native** — One codebase for iOS + Android, faster to build and deploy.
- **Web-first MVP alternative** — If app distribution is too slow, start with a mobile-optimised PWA (progressive web app) that doesn't require app store approval.
- **Community distribution** — Melbourne Facebook groups, Reddit, university job boards, classifieds — free or low-cost.
- **QR codes in cafes/shops** — Physical distribution: "Looking for work? Scan here."
- **Referral mechanics** — Later: "Refer a friend, get early access" to bootstrap word-of-mouth.

**Check:** Can we get 50 candidate signups without paid advertising?

---

## 9. Feature Creep 🧩

**Risk:** Adding chat, AI matching, ratings, notifications, payments, and other features before core swipe-to-apply is validated.

**Severity:** Medium  
**Likelihood:** High (it always happens)  
**Impact:** Delayed launch, wasted engineering effort, unfocused product.

**Mitigations:**
- **Strict "Not Doing" list** — Documented in MVP definition with explicit reasons.
- **Validation-first** — No feature beyond the core swipe/apply flow until MVP success criteria are met.
- **Ask-first policy** — Any feature not in the MVP definition requires user approval before building.
- **Scope reviews** — Before each implementation phase, review scope against the MVP definition.

**Check:** Are we building anything that doesn't directly support "candidate swipes job → employer sees interested candidates"?

---

## 10. Technical Delivery Risk 🛠️

**Risk:** The mobile app, admin dashboard, or backend takes longer than expected or hits integration issues.

**Severity:** Low-Medium  
**Likelihood:** Medium  
**Impact:** Delayed launch, developer frustration.

**Mitigations:**
- **Proven stack** — Expo, Next.js, Supabase are all well-documented and stable.
- **Phase-based plan** — Each phase produces a working increment.
- **Shared types** — Monorepo with shared TypeScript package prevents integration bugs.
- **Local-first development** — Supabase local dev works offline.
- **Deferred complexity** — Push notifications, chat, payments, and AI are explicitly deferred.

**Check:** After Phase 2, can a candidate browse and swipe jobs? If yes, the core works. Everything else is polish.
