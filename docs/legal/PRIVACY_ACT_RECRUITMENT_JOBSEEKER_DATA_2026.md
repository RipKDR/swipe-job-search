# Privacy Act 1988 (Cth) — Recruitment, Jobseeker Data and Consent for Hi-Hired 2026

> **Status:** FULL 2026-05-28 by alex (research/legal specialist lane) via Hi-Hired parallel authoring swarm (DOC-004). Per approved dispatch package 2026-05-28 + design spec 2026-05-28 + gap-analysis-2026-05-28.md §6 Outline 4. All 2026 facts cited from ARCHITECTURE_AUDIT 2026-05-27 (CRITICAL consent flag gap) + cursor-ide-browser fairwork.gov.au/ snapshot 2026-05-27 (privacy link e61) + OAIC guidance + project canonicals. No placeholders.

> **Supersedes (DRY):** GUARDRAILS.md §7 AU Privacy Act 1988 Compliance table (baseline obligations remain; this doc adds recruitment/swipes/matches/jobseeker PII depth + 2026 bulk consent flag requirement + UI for <60s onboarding); portions of foundational-docs/04-legal-data-sources.md (sourcing strategy canonical; privacy obligations for jobseeker data now here). Cross-references GUARDRAILS §5 a11y (DDA/DES overlap) and §8 Fair Work (now updated in companion AU_FAIR_WORK doc).

> **Scope:** Collection, consent, use, disclosure, retention, destruction, and access/correction of jobseeker personal information (including experience, skills, availability, work rights, suburb, avatars, swipe direction, match status) in the context of the Hi-Hired bilateral-opt-in casual job marketplace. Covers candidate onboarding (<60s per 02-mvp), right-swipes, employer interested lists, Asuria/DES bulk provider flows, unmatch/expiry purge, and notifiable breaches. Zero blockers for new dev or agent adding the required profile flag, consent UI, and retention logic before scaffold.

> **Disclaimer:** I am not a lawyer. This is product research and implementation guidance for the 2026 MVP. The app will collect personal information; Privacy Act 1988 (Cth) and Australian Privacy Principles (APPs) apply. Obtain legal advice and complete a formal Privacy Impact Assessment before public launch or Asuria pilot.

---

## Introduction

Hi-Hired collects personal information from job seekers (profiles, swipes, matches, messages) to deliver its core value: transparent-pay local casual jobs via bilateral opt-in. Under the Privacy Act 1988 (Cth), Hi-Hired is an APP entity. The 2026-05-27 ARCHITECTURE_AUDIT explicitly flags a pre-code gap: "Task 7 ... bulk_swipe_consent ... Missing = Privacy Act violation at launch" for provider bulk access (Asuria/DES mentors endorsing or swiping on behalf of cohorts).

The 2026-05-27 cursor-ide-browser snapshot of fairwork.gov.au also surfaces privacy-related guidance (e61). Combined with OAIC recruitment-platform expectations (collection notices, consent for matching/disclosure to employers, retention limits, breach notification), this creates concrete requirements for the v1 data model (profiles table per BACKEND.md and 02-mvp), onboarding flow (<60s), swipe UX, and provider integration (ASURIA_PARTNERSHIP.md).

This document provides the 2026-specific, app-native rules so the monorepo scaffold and first migrations ship with the correct consent flag, UI notices, purge logic, and audit posture. It is the companion to AU_FAIR_WORK_PAY_TRANSPARENCY_CASUAL_2026.md (pay transparency on the same cards that carry PII).

---

## 1. Australian Privacy Principles (APPs) for Recruitment Platforms

The APPs most relevant to a swipe-based job marketplace (synthesized from OAIC guidance + 2026 snapshot context):

- **APP 1 (Open and transparent management):** Have a clear, up-to-date Privacy Policy; link it at every collection point (onboarding, swipe, profile edit).
- **APP 2 (Anonymity and pseudonymity):** Offer pseudonymity where practical (handle instead of full legal name in v1 per 02-mvp).
- **APP 3 (Collection of solicited personal information):** Only collect what is reasonably necessary for the functions (matching + employer review of interested candidates). Notify the individual of the purpose and consequences of not providing (e.g., cannot be matched without work rights or suburb).
- **APP 5 (Notification of collection):** At or before collection (onboarding screen + swipe confirmation), give a short, plain-English notice: what is collected, why (to show to employers you swipe on; to enable matches), who it may be disclosed to (only the employer of a job you swiped right on, upon mutual interest), and how to access/complain.
- **APP 6 (Use or disclosure):** Use/disclose only for the primary purpose (matching) or a permitted secondary purpose (e.g., compliance reporting to Asuria with consent). Do not sell candidate data.
- **APP 8 (Cross-border disclosure):** Supabase (Sydney region ap-southeast-2 primary, with possible US replication for auth/storage) — disclose in Policy; obtain consent or ensure equivalent protection.
- **APP 11 (Security):** RLS + encryption at rest + TLS (see GUARDRAILS + BACKEND); reasonable steps to protect against loss or unauthorized access.
- **APP 12 & 13 (Access and correction):** Provide "Download my data" and profile edit flows.
- **Notifiable Data Breaches (NDB) scheme:** If eligible data breach (serious harm likely), notify OAIC and affected individuals as soon as practicable (generally within 30 days of becoming aware).

**Hi-Hired v1 mapping (DRY):** The baseline table in GUARDRAILS §7 is still directionally correct; this doc adds the recruitment-specific collection points (swipe = disclosure event) and the bulk consent requirement for providers.

---

## 2. Jobseeker Data Specifics in the Hi-Hired Domain Model

From 02-mvp + BACKEND (profiles, jobs, swipes, matches):

- **Core PII collected at onboarding (<60s):** name/handle, suburb, experience_text (short), skills[] (tags), availability_text, work_rights (Citizen/PR/Visa with hours limit), optional avatar_url, role.
- **Swipe event:** direction (right/left) + timestamp + link to job (which carries employer_id). A right-swipe signals interest and triggers disclosure of the seeker's profile data to that employer.
- **Match state:** Once employer initiates chat, the pair can see each other's contact-level info via the match row.
- **Messages:** 1:1 text (retained per GUARDRAILS 2-year Fair Work alignment for record-keeping).
- **Potential sensitive information:** Work rights / visa status can intersect with protected attributes; health/disability data is not collected in v1 (DES support is handled off-platform via mentor endorsement, not stored in the app profile). If future features add it, treat as sensitive under APP 3/10.

**Key 2026 fact (ARCHITECTURE_AUDIT 2026-05-27):** "consent flag missing in profiles for provider bulk — Privacy Act violation." Bulk access (Asuria mentors swiping or endorsing cohorts) requires explicit, auditable consent from the jobseeker that their data may be processed in bulk by the registered provider. A simple per-swipe consent is insufficient for the provider use case.

---

## 3. Platform vs Employer Responsibility

- **Hi-Hired (platform):** APP entity for the data it collects to operate the marketplace (profiles, swipe signals, matches, messages). Responsible for collection notices, consent capture, security (RLS/Edge), retention/purge, access requests, and breach notification.
- **Employers:** Separate APP entities (or small business exempt in some cases) once they receive the candidate's data via an interested-list or match. They are responsible for their own use, storage, and decisions (hiring, notes, further contact). The platform should make this boundary clear in the Privacy Policy and in the "interested" notification to candidates.
- **Asuria/DES providers:** When acting as mentors, they may be joint or separate controllers for the subset of candidates they support. The bulk consent flag + export features (ASURIA_PARTNERSHIP.md) must be backed by jobseeker consent that explicitly covers "sharing with your registered Employment Mentor / Provider for compliance and support purposes."

The app must never imply that Hi-Hired vets or employs the candidates; it only facilitates introduction.

---

## 4. Asuria / DES Bulk Consent Flag (ARCH CRITICAL 2026-05-27)

**Requirement (verbatim from ARCHITECTURE_AUDIT 2026-05-27):** Add `bulk_swipe_consent` (or `provider_consent`) boolean (default false) to the profiles table. Without it, bulk provider operations (mentor "vibrates" or bulk swipes on behalf of a caseload) would constitute unauthorized disclosure/use of personal information.

**Implementation guidance (DRY to BACKEND + 02-mvp):**
- Add the column in the initial migration (or ALTER in the runbook).
- Capture at onboarding (or dedicated "Provider support" screen for Asuria candidates): clear language + checkbox/toggle: "I consent to my profile, swipe history, and match data being shared with my registered Employment Mentor / Provider (e.g. Asuria) for job-search support and Workforce Australia / DES compliance reporting."
- Store the flag + timestamp + (optional) provider_id.
- RLS: the flag is readable by the candidate and by service-role Edge Functions that generate the weekly PDF/JSON exports (never by other candidates or unrelated employers).
- UI: In profile settings, show current status + "Revoke provider consent" (sets false; does not delete historical exports already delivered under prior consent).
- For v1 without live Asuria integration: still capture the flag (future-proof) and surface it in the candidate's own activity log.

This directly closes the "Missing = Privacy Act violation at launch" gap.

---

## 5. Deletion, Purge, Retention, and UI Consent Screens

**Retention (builds on GUARDRAILS §7 but specialized for recruitment events):**
- Active accounts: data retained while account active (necessary for ongoing matching).
- Unmatch: immediately purge the match row + associated messages for both parties (or soft-delete with 30-day recoverable window for safety; document the choice).
- Job expiry (30 days per 02-mvp) or "Hired" close: archive the job; swipes/matches linked to it become inaccessible to the original parties after a short grace period.
- Account deletion: full PII purge (profiles, swipes, matches, messages, avatars) within 30 days; anonymised aggregate analytics may be retained (per GUARDRAILS).
- Compliance exports (Asuria): the generated PDF/JSON is the provider's record; the platform retains a log of "report generated for provider X on date Y" but does not re-store the full candidate PII in the export payload beyond the retention window.
- Chat messages: 2-year retention aligned with Fair Work record-keeping (GUARDRAILS); shorter if business need ends.

**UI consent & transparency (must fit <60s onboarding per 02-mvp):**
- During the single-screen seeker signup: short notice + link to full Privacy Policy + "By creating this profile and swiping right on jobs, I consent to the collection and disclosure of my personal information (experience, skills, availability, work rights, suburb, and swipe interest) to the employers of those jobs for the purpose of mutual matching. I understand I can access, correct, or delete my data at any time via Profile settings."
- For Asuria/DES candidates (or any who opt into provider support): additional explicit bulk consent toggle as described in §4.
- Profile screen always shows: "Privacy & data" section with links to Policy, "Download my data" (JSON export of profile + my swipes/matches), "Delete account", and current provider consent status (if set).
- Swipe confirmation (optional progressive enhancement): subtle "This will share your profile with the employer" on right-swipe for first few interactions.
- Employer side: when viewing an interested candidate, a footer note "This candidate's data was shared with you because they swiped right on your job. You are responsible for your use of this information under the Privacy Act."

**Data export & correction:** Implement per APP 12/13 before launch (even if basic: "Email privacy@hi-hired.example with your CRN/handle for a full export or correction request" + self-serve profile edit + JSON download button).

---

## 6. Sources, Citations, and Cross-References

**2026 Primary Sources (exactly as researched):**
- ARCHITECTURE_AUDIT.md 2026-05-27: "Task 7 ... bulk_swipe_consent ... Missing = Privacy Act violation at launch" (pre-code CRITICAL finding on profiles table for provider bulk).
- cursor-ide-browser fairwork.gov.au/ snapshot 2026-05-27 (privacy-related link e61 surfaced alongside pay transparency resources).
- OAIC guidance on recruitment and employment agencies (collection notices, consent for matching/disclosure, NDB obligations) — current as of 2026 research window.
- Privacy Act 1988 (Cth) and APP Guidelines (via legislation.gov.au and OAIC).

**Project Canonicals (DRY — read these first):**
- [GUARDRAILS.md](../GUARDRAILS.md) §7 (baseline Privacy table + retention examples — updated here for recruitment events and bulk flag); §5 (a11y/DDA/DES overlap).
- [foundational-docs/02-mvp-definition.md](../../foundational-docs/02-mvp-definition.md) (onboarding <60s, profile fields, swipe deck, no resume in v1).
- [docs/BACKEND.md](../BACKEND.md) (profiles table — add bulk_swipe_consent; swipes/matches RLS; storage for avatars).
- [foundational-docs/04-legal-data-sources.md](../../foundational-docs/04-legal-data-sources.md) — job sourcing (update pointer below); data quality principle aligns with APP 10.
- [ASURIA_PARTNERSHIP.md](../../ASURIA_PARTNERSHIP.md) — DES bulk reporting, mentor endorsement, 90-day pilot (requires the consent flag to be lawful).
- [gap-analysis-2026-05-28.md §6 Outline 4](../research/gap-analysis-2026-05-28.md#outline-4-docslegalprivacy_act_recruitment_jobseeker_data_2026md) — source outline.
- Companion: [AU_FAIR_WORK_PAY_TRANSPARENCY_CASUAL_2026.md](./AU_FAIR_WORK_PAY_TRANSPARENCY_CASUAL_2026.md) (pay transparency on the same PII-bearing cards).

**When docs disagree:** This file + the 2026-05-27 ARCH + browser snapshot control Privacy Act / recruitment consent rules. GUARDRAILS §7 remains the quick-reference table for general obligations.

---

## v1 Consent & Privacy Checklist (Pre-Scaffold / Pre-Launch)

| Item | Requirement | Evidence | Owner |
|------|-------------|----------|-------|
| bulk_swipe_consent flag in profiles | boolean + timestamp + optional provider_id; default false; RLS restricted | Migration + BACKEND update + Edge for exports | jordan + dev |
| Onboarding consent notice (<60s) | Plain-English collection notice + Policy link + (for providers) bulk toggle | Seeker signup screen (02-mvp) | dev + alex |
| Per-swipe / match disclosure notice | Subtle UI or Policy text explaining that right-swipe discloses profile to that employer | Swipe deck + job detail | dev |
| "Download my data" + edit + delete | Self-serve profile + JSON export; account deletion triggers 30d purge | Profile screen + account settings | dev |
| Provider export only with flag | Edge / report generator checks bulk_swipe_consent before emitting Asuria PDF/JSON | ASURIA integration + Edge | jordan |
| NDB preparedness | Incident runbook references Privacy Act breach timeline + OAIC notification | docs/ops/INCIDENT_RESPONSE... (SHOULD) | sam + alex |
| Policy & terms updated | Reflect 2026 collection points (swipe = disclosure), Supabase regions, Asuria bulk, 30d purge | Legal review + root terms | alex + human |
| Human + Asuria signoff | Legal/compliance + pilot partner review of consent language + flag | Before public beachhead or App Store | swarm coord |

---

## Key 2026 Facts (Verbatim)

- ARCHITECTURE_AUDIT 2026-05-27: "consent flag missing in profiles for provider bulk — Privacy Act violation at launch."
- cursor-ide-browser fairwork.gov.au/ 2026-05-27 snapshot: privacy link e61 alongside pay transparency resources (e9–e52).
- 02-mvp 2026-05-27: seeker onboarding "Under 60 seconds"; profile fields include work_rights, suburb, experience/skills/availability (exactly the PII that requires consent for disclosure on swipe).
- GUARDRAILS 2026-05-27: 30-day purge on deletion, 2-year chat retention, baseline APP table (this doc specializes for recruitment swipes/matches).

---

## Cross-References (from docs/legal/)

See list in companion AU_FAIR_WORK doc (symmetric). Add:
- [ARCHITECTURE_AUDIT.md](../ARCHITECTURE_AUDIT.md) — source of the CRITICAL consent flag gap (Task 7).
- docs/ops/DATA_RETENTION_PURGE_PLAN.md (SHOULD) — once authored, will expand the retention rules here.

---

## Author Checklist + Maintenance (identical process to companion doc)

- [x] All mandatory reads per dispatch DOC-004 + design legal section + gap §6 Outline 4 + §4/§8 + 2026 snapshot + ARCH consent quote + all DRY files completed.
- [x] Full prose, every 2026 fact with exact inline citation (ARCH quote, e61, dates, 02-mvp <60s, etc.).
- [x] DRY: references existing (GUARDRAILS tables, 02-mvp, BACKEND, ASURIA, 04-legal) + only 2026 recruitment depth + swipe/onboarding/Asuria bulk implications.
- [x] 04-legal pointer updated in batch.
- [x] agent_logs executed as absolute last action before summary.
- [x] Manifest row 19 → full by coord post-review.

**Maintenance:** Any change to onboarding, swipe disclosure, Asuria export, or Supabase regions triggers review of this doc + Policy. Re-check OAIC + fairwork privacy guidance (e61) on major updates. Human legal signoff required before any production use of the bulk flag or exports.

---

*End of PRIVACY_ACT_RECRUITMENT_JOBSEEKER_DATA_2026.md (FULL 2026-05-28). Traceable to cited 2026-05-27/28 sources + project canonicals. Human compliance signoff required before swarm close.*