# Legal Data Sources — SwipeJobs Melbourne

**⚠️ I am not a lawyer. This document represents product research and practical guidance for MVP sourcing. Review current terms and get legal advice before commercial launch.**

## Source Strategy Summary

| Source Type | Safety | MVP Viable? | Recommendation |
|-------------|--------|-------------|----------------|
| Direct employer submissions | ✅ Safest | ✅ **Primary MVP source** | Build employer portal for job posting |
| Manual admin entry with permission | ✅ Safest | ✅ MVP seed data | Create seed jobs manually for demo |
| Adzuna API | ⚠️ Review terms | 🔶 Secondary | Attributable, but check current terms |
| ATS public APIs (Greenhouse/Lever/Workable) | ⚠️ Requires permission | 🔶 Later | Only with employer consent/permission |
| Government / public sector feeds | ⚠️ Check reuse terms | 🔶 Later | Public listings may still have reuse restrictions |
| **Scraping SEEK** | ❌ Unsafe | ❌ Never | Prohibited by terms; legal risk |
| **Scraping Indeed** | ❌ Unsafe | ❌ Never | Prohibited by terms; IP risk |
| **Scraping LinkedIn** | ❌ Unsafe | ❌ Never | Legal action risk |
| **Scraping Jora** | ❌ Unsafe | ❌ Never | Terms likely prohibit automated access |
| **Scraping Facebook / Gumtree** | ❌ Unsafe | ❌ Never | Terms prohibit scraping; no API |

---

## Category 1: Direct Employer Submissions ✅

**Safety:** Safest. The employer voluntarily posts the job on your platform. You own the data relationship.

**MVP approach:**
- Build an employer-facing job posting form in the admin web app
- Employers sign up, accept basic terms of service, and post jobs directly
- Store `source_type = 'direct_employer'` on each job
- Optionally verify employer identity for trust badges

**Benefits:**
- Full legal ownership of the job listing
- Direct relationship with employer (monetisation path)
- No third-party dependency
- Clean data, no attribution requirements

**Risks:**
- Need employer outreach to populate initial job supply
- Cold start: no employers → no jobs → no candidates

---

## Category 2: Manual Admin Entry with Permission ✅

**Safety:** Safe if done with explicit permission.

**MVP approach:**
- Admin manually enters job listings into the system
- Each manual entry should have documented permission source (employer email/phone consent)
- Store `source_type = 'manual_admin'` with optional `source_name` and `source_url`
- Maintain internal log of permission source per job

**Use for MVP:**
- Seed jobs to demonstrate the app to early users
- Jobs sourced from employer conversations
- Jobs from employers who don't want to use the portal but give verbal/written permission

---

## Category 3: Adzuna API ⚠️

**What it is:** Adzuna offers a Jobs API for developers. Historically it has been one of the more accessible job data APIs.

**Research notes (from prior browser checks):**
- Adzuna developer portal exists at `https://developer.adzuna.com/`
- Terms of Service are linked at `/docs/terms_of_service`
- Requires API key registration (App ID + API Key)
- Australia job data is available via `https://api.adzuna.com/v1/api/jobs/au/search/`

**Key considerations for MVP:**
- Must comply with current API Terms of Service
- Attribution/display requirements — likely need to show "Powered by Adzuna" or similar
- Caching/data retention limits may apply
- May prohibit republishing full job descriptions in a competing marketplace
- Rate limits apply

**Recommendation for MVP:**
- Do not integrate Adzuna in MVP
- If used later, integrate behind a feature flag with clear source attribution on each job card
- Store `source_type = 'adzuna'` and display attribution
- Do not claim Adzuna-sourced jobs as "verified" or "direct"
- Monitor terms for changes

---

## Category 4: ATS Public Job Board APIs ⚠️

Several ATS platforms expose public APIs for job listings from their customers:

| ATS | API | Access | Notes |
|-----|-----|--------|-------|
| **Greenhouse** | Job Board API | Public | `https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs` |
| **Lever** | Postings API | Public | `https://api.lever.co/v0/postings/{company}?mode=json` |
| **Workable** | Jobs API | Requires token | `https://[account].workable.com/spi/v3/jobs` |
| **SmartRecruiters** | Postings API | Public | `https://api.smartrecruiters.com/v1/companies/{company}/postings` |
| **Ashby** | Job Board API | Public | Available on request |

**Key considerations:**
- These APIs expose jobs from employers that use the ATS
- Using them in a third-party marketplace may be against API terms or employer expectations
- Safer with explicit employer permission
- Jobs may be stale (not updated in real-time)
- Sourcing from ATS APIs without employer knowledge may create trust issues

**Recommendation for MVP:**
- Do not integrate ATS APIs in MVP
- If used later, require employer opt-in/permission first
- This could become a growth feature: "We'll import your jobs from Greenhouse" as a conversion tool

---

## Category 5: Government / Public Sector Feeds ⚠️

| Source | URL | Notes |
|--------|-----|-------|
| Workforce Australia | `https://www.workforceaustralia.gov.au/` | Government job services; may have feed/API options for registered partners |
| APSJobs | `https://www.apsjobs.gov.au/` | Australian Public Service jobs; public but reuse terms are unclear |
| Victorian Government Careers | `https://www.careers.vic.gov.au/` | State government jobs; public but reuse terms unclear |

**Key considerations:**
- Even "public" job listings may have copyright or reuse restrictions
- Government feeds may require registration, partnership, or licensing
- Mostly professional/clerical roles — less relevant for casual/shift-based MVP
- Could be useful later for expanding into broader job categories

**Recommendation for MVP:**
- Do not pursue government feeds for MVP
- These are not relevant to the casual/shift-based wedge

---

## Category 6: Scraping — Unsafe and Prohibited ❌

**Never scrape these sources under any circumstances:**

| Source | Risk |
|--------|------|
| **SEEK** | Terms explicitly prohibit automated access, scraping, copying for commercial use. SEEK actively enforces against scrapers. Legal action risk. |
| **Indeed** | Terms prohibit scraping, automated access, and republishing job data. Indeed has legal and technical anti-scraping measures. |
| **LinkedIn** | Banned scraping in court (HiQ Labs case). Aggressive legal enforcement. Technical blocks (rate limiting, CAPTCHA). |
| **Jora** | Terms likely prohibit scraping and automated access. No public API available. |
| **Facebook / Gumtree** | Terms prohibit scraping. No API for job listings. Technical blocks. Can result in account/IP bans. |

**Why scraping is wrong for this product:**
1. **Legal risk** — You could face cease-and-desist letters, lawsuits, or DMCA takedowns
2. **Technical fragility** — Scrapers break when sites change layout
3. **Data quality** — Stale jobs, missing fields, no employer relationship
4. **Trust risk** — Candidates see a job, apply, and the employer has no idea who you are
5. **Attribution issues** — You're republishing someone else's content without permission
6. **Competitive positioning** — Your product becomes a "thin wrapper" around scraped data rather than a real marketplace

---

## Safe MVP Approach

### Phase 1 (MVP — direct from day one)
1. **Manual seed jobs** — Admin creates 20-30 realistic Melbourne jobs manually (with documented consent from the employers or as demo/placeholder jobs clearly marked)
2. **Employer portal** — Employers sign up and post jobs directly (source_type = 'direct_employer')
3. **Attribution badges** — "Direct from employer" or "Verified employer" badge on direct job cards

### Phase 2 (after validation)
4. **Adzuna API** — With attribution, behind feature flag, clear source badges
5. **Employer ATS import** — With employer permission only

### Never
6. Scraping — Never implement; remove from any consideration

## Source Attribution Design

Every job in the database must track:

```
source_type: 'direct_employer' | 'manual_admin' | 'adzuna' | 'api_partner'
source_name: string           // e.g., 'Adzuna', 'Greenhouse via [Employer]'
source_url: string            // Original URL if applicable
external_id: string           // ID in source system
```

Display rules:
- `direct_employer` jobs: show employer name directly, show "Verified" badge if employer is verified
- `manual_admin` jobs: show employer name, no special badge
- `adzuna` jobs: show "via Adzuna" attribution, do not show employer name as verified
- `api_partner` jobs: show "via [Partner]" attribution

Never display third-party-sourced jobs as "verified" or "direct."

---

## 2026-05-28 Update — AU Legal Obligations for Pay Transparency & Recruitment Data (Hi-Hired Swarm)

**Added by:** alex (research/legal) via swarm DOC-003 + DOC-004.

**New canonical references (read these for all 2026 compliance work):**
- [docs/legal/AU_FAIR_WORK_PAY_TRANSPARENCY_CASUAL_2026.md](../docs/legal/AU_FAIR_WORK_PAY_TRANSPARENCY_CASUAL_2026.md) — Full 2026 Fair Work pay transparency, casual rules, site structure (e9/e10/e12/e52 etc from 2026-05-27 cursor-ide-browser snapshot), app UI implications for every swipe card and employer post (specific pay/hours/suburb required per 02-mvp; no vague "competitive"), employer obligations, Asuria/DES/visa hooks, v1 checklist. **Supersedes** the 2024-25 award rates and general Fair Work table in GUARDRAILS.md §8 for Hi-Hired beachhead implementation.
- [docs/legal/PRIVACY_ACT_RECRUITMENT_JOBSEEKER_DATA_2026.md](../docs/legal/PRIVACY_ACT_RECRUITMENT_JOBSEEKER_DATA_2026.md) — Privacy Act 1988 / APPs for recruitment platforms, jobseeker PII in profiles/swipes/matches (experience/skills/availability/work rights/avatars), platform vs employer vs provider responsibility, **ARCHITECTURE_AUDIT 2026-05-27 CRITICAL gap** (add `bulk_swipe_consent` flag to profiles or risk violation at launch for Asuria/DES bulk), deletion/purge, UI consent in <60s onboarding (02-mvp), notifiable breaches, retention. **Supersedes** the baseline Privacy table in GUARDRAILS.md §7 for recruitment-specific collection/disclosure events.

**What remains authoritative here:** The overall job data sourcing strategy (direct employer safest, no scraping, attribution rules, source_type tracking). The 2026 legal docs focus on *obligations once data is on the platform* (pay display, consent for swipes/PII, provider bulk).

**Action for future authors:** When refreshing this file, keep the sourcing tables; point all Fair Work / Privacy Act / DDA / DES questions to the two 2026 docs in docs/legal/. Update the pointer date on any material change.

See gap-analysis-2026-05-28.md §6 Outlines 3 & 4 + dispatch package 2026-05-28 for full research citations (cursor-ide-browser 2026-05-27 with 117 interactive refs; ARCH CRITICAL consent flag quote).
