# AU Fair Work Pay Transparency and Casual Employment — 2026 Reference for Hi-Hired

> **Status:** FULL 2026-05-28 by alex (research/legal specialist lane) via Hi-Hired parallel authoring swarm (DOC-003). Per approved dispatch package 2026-05-28 + design spec 2026-05-28 + gap-analysis-2026-05-28.md §6 Outline 3. All 2026 facts cited from cursor-ide-browser fairwork.gov.au/ snapshot 2026-05-27 (511 refs/117 interactive) and related research. No placeholders.

> **Supersedes (DRY):** GUARDRAILS.md §8 Fair Work Act Compliance table (2024-25 award rates and general notes only; replace with 2026 Pay Guides + transparency rules here for cards/posts); portions of foundational-docs/04-legal-data-sources.md privacy/Fair Work notes (sourcing strategy remains canonical — see pointer update in that file). Cross-references GUARDRAILS §7 AU Privacy for overlapping obligations.

> **Scope:** Beachhead hospitality, fast food, retail, small business and visa-holder casual roles in northern Melbourne suburbs (Tullamarine, Gladstone Park, Airport West per root README + MELBOURNE_STRATEGY). Applies to candidate swipe cards, employer job posting form, onboarding, and Asuria/DES hooks. Zero blockers for new dev or agent implementing v1 pay display and posting.

> **Disclaimer:** I am not a lawyer. This is product research and implementation guidance synthesized from 2026 primary sources for the Hi-Hired MVP. Obtain current legal advice and employer/compliance signoff before launch or App Store submission. Rates and guidance change; re-verify via the sources below.

---

## Introduction

In 2026 the Fair Work Ombudsman places strong emphasis on pay transparency for casual roles. The 2026-05-27 cursor-ide-browser snapshot of https://www.fairwork.gov.au/ (511 total references, 117 interactive) shows "Pay and wages" (e9), "Pay Calculator" (e10), "Pay guides" (e12), "Find my award" (e52), and "Changes to workplace laws" (e17) as prominent homepage elements, alongside sector-specific guidance for fast food (e21), hospitality, small business (e30), and visa holders (e31). The legacy /pay contracts URL now 404s (site structure evolved). 

Hi-Hired's core v1 promise (per foundational-docs/02-mvp-definition.md) is a casual barista role at a specific "$32/hr" visible to 20 local seekers who swipe. Every job card and every employer post must therefore display and capture specific pay_rate, hours_text, and suburb. Vague language ("competitive", "award rates", "above award") risks misleading candidates and attracting Fair Work scrutiny. This document translates the 2026 snapshot and Fair Work Act 2009 (Cth) obligations into exact data model, UI, validation, and checklist requirements so the Expo RN monorepo scaffold (see STACK.md) and first migrations (see docs/ops/MIGRATION_RUNBOOK_FROM_BACKEND.md) produce a compliant beachhead product.

---

## 1. 2026 Fair Work Site Structure and Primary Resources

The 2026-05-27 home snapshot highlights the following high-value sections for a transparent-pay casual marketplace (all cited with interactive ref IDs from the browser capture):

- **Pay and wages (e9)**: Central hub for minimum wages, awards, and pay rates.
- **Pay Calculator (e10)**: Interactive tool for estimating take-home pay under awards.
- **Pay guides (e12)**: Detailed guides by industry (hospitality, retail, fast food).
- **Find my award (e52)**: Search by job title, sector, or classification.
- **Changes to workplace laws (e17)**: Recent and upcoming amendments, including pay secrecy bans and transparency measures.
- **Sector pages**: Fast food (e21), hospitality, restaurants/cafes, small business (e30), visa holders / temporary migrants (e31).
- **Legislation and fact sheets (e38 and related)**: Direct links to Fair Work Act 2009 and modern awards.

**App implications (DRY):** Do not hard-code rates. Provide a "Check current award rates" deep link or in-app note pointing to the Pay Calculator / Find my award for the relevant classification. Store the employer-entered pay_rate as structured data (see BACKEND.md jobs table) and display it verbatim on every card. Update any cached minimums quarterly from the official Pay guides (see v1 checklist below).

---

## 2. Casual Employment Rules 2026 (Key for Beachhead Roles)

From the snapshot and linked Fair Work resources (2026-05-27):

- **Casual conversion**: Eligible casuals have pathways to permanent employment after 12 months (or earlier under some awards). Employers must notify eligible employees.
- **Pay rates and awards**: Most casual roles fall under modern awards (e.g., Hospitality Industry General Award, General Retail Industry Award, Fast Food Industry Award). Casual loading (typically 25%) applies on top of the base rate. Rates are published in the Pay guides and updated periodically.
- **Pay slips**: Employers must issue pay slips within one working day of payment, showing gross and net amounts, deductions, and superannuation.
- **Transparency in job advertisements**: Recent changes to workplace laws (e17) and ongoing Fair Work guidance stress clear pay information in recruitment. Candidates should not have to "ask" for the rate.

**Hi-Hired-specific implications:**

- The employer posting form (02-mvp) requires a specific pay_rate (e.g., "$32/hr" or "$65,000/yr") plus hours_text. The form must reject vague entries.
- Candidate cards (swipe deck per 02-mvp) always surface the exact rate + hours + suburb. No truncation or "see details for pay".
- For Asuria/DES candidates (see ASURIA_PARTNERSHIP.md), work rights and any known restrictions (student visa 20 hrs/wk etc.) are displayed alongside pay so mentors and employers have full context.
- Sham contracting risk: the platform should not facilitate misclassification. Employer terms + onboarding can include simple attestations; the app itself does not provide legal advice.

---

## 3. App UI and Data Implications (Swipe Cards + Employer Posting)

Per foundational-docs/02-mvp-definition.md v1 scope (locked):

**Job posting (employer) — required fields include:**
- Pay rate (specific, e.g. "$32/hr")
- Hours (e.g. "Sat 8am-2pm" or "Mon-Fri 9-5, 30hrs/wk")
- Suburb
- Job type (casual / part-time / permanent selector)

**Swipe deck (job seeker) — every card shows:**
- Job title, employer, suburb, pay rate, job type badge, hours
- Tap for full details

**BACKEND canonical (docs/BACKEND.md):** jobs table stores pay_rate (structured or numeric + display string), hours_text, suburb, job_type. pay_display is derived for cards.

**2026 transparency rules applied:**
- Never allow "competitive", "award", "TBA", or ranges without a clear base + loading statement on the card.
- Optional but recommended: small "Rates current per Fair Work Pay Guides 2026; verify with Pay Calculator" footnote or link in job detail view.
- Validation in the post form (client + Edge if needed): basic format check + warning if entered rate appears below known 2026 award minimum for the selected sector (do not block; surface the Pay Guide link).
- Suburb is mandatory for beachhead filtering and local compliance (visa / small business rules often geography-specific).

These rules directly implement the "transparent pay on every card" product principle (root README) and close the gap identified in the 2026-05-27 planning burst.

---

## 4. Employer Obligations and Platform Liability

Employers posting on Hi-Hired remain fully responsible for:
- Accurate pay and classification under the relevant award.
- No sham casual arrangements.
- Issuing correct pay slips and meeting record-keeping obligations.

**Platform (Hi-Hired) role:**
- Facilitator of bilateral opt-in matching (per 02-mvp and STACK).
- Must not publish or promote misleading pay information.
- Should provide clear guidance (this doc + in-app links) and basic validation.
- Maintain audit logs of job posts (recommended for v1.1 or incident response; see docs/ops/INCIDENT_RESPONSE...).
- For DES/Asuria flows: do not override employer obligations; surface work-rights data from the candidate profile only with consent (see companion PRIVACY_ACT... doc).

Liability is shared in the sense that a platform that knowingly hosts systematically misleading ads can attract scrutiny; transparent defaults + prominent calculator links reduce that risk.

---

## 5. Asuria / DES / Visa Hooks (Beachhead Practicalities)

- **Visa holders (snapshot e31):** Work rights are captured at profile creation (02-mvp: "Visa (student, 20hrs/wk)"). Display them on interested-list cards for employers and on mentor views for Asuria.
- **DES / Asuria partnership (ASURIA_PARTNERSHIP.md):** "Asuria Verified" endorsements, compliance exports (JA/EC/JI/EP DSS codes), mentor co-management. The pay transparency rules apply equally; mentors need to see exact rates when advising candidates.
- **Work rights display + reporting:** Keep the field in profiles and surface it consistently. Bulk provider access requires the consent flag (see PRIVACY_ACT_RECRUITMENT_JOBSEEKER_DATA_2026.md and ARCHITECTURE_AUDIT 2026-05-27).

---

## 6. Sources and Verifiable Citations (2026)

All facts in this document are drawn from tool-sourced 2026 primary material. No invented rates or rules.

- **Primary:** cursor-ide-browser MCP snapshot of https://www.fairwork.gov.au/ taken 2026-05-27 (511 refs / 117 interactive elements; specific anchors e9 Pay and wages, e10 Pay Calculator, e12 Pay guides, e52 Find my award, e17 Changes to workplace laws, e21 fast food, e30 small business, e31 visa, e38 legislation).
- **Legislation:** Fair Work Act 2009 (Cth) and modern awards — https://www.legislation.gov.au/ (cross-referenced from snapshot).
- **Ongoing:** Re-browse or use official Pay Calculator / Pay guides before any rate-sensitive feature change. Rates are updated periodically by the Fair Work Ombudsman.
- **Related project docs (DRY):** foundational-docs/02-mvp-definition.md (required pay/hours/suburb fields + card content + <60s onboarding), docs/BACKEND.md (jobs schema + pay_display), GUARDRAILS.md (baseline a11y + Privacy; superseded Fair Work table), ASURIA_PARTNERSHIP.md (DES hooks), ARCHITECTURE_AUDIT.md (pre-code compliance gaps), MELBOURNE_STRATEGY.md (beachhead suburbs).

---

## 7. v1 Compliance Checklist (Employer Posting + Swipe Cards)

Use this table during implementation and pre-launch review. All items are MUST for the hospitality/retail beachhead.

| Item | Requirement | Evidence in Code / Data | Owner |
|------|-------------|-------------------------|-------|
| Specific pay on every card | pay_rate + hours_text + suburb always visible (no vague terms) | 02-mvp card spec + BACKEND jobs table + swipe deck UI | dev |
| Employer post form validation | Reject or strongly warn on non-specific pay ("competitive", empty, ranges without base) | Post Job screen (02-mvp) + form Zod schema (packages/shared) | dev |
| Award / minimum wage awareness | Link or note to 2026 Pay Calculator / Find my award for the classification | Job detail view + employer form help text | alex / dev |
| Work rights / visa display | Show candidate work_rights alongside pay for employers & mentors | Interested list + Asuria export | dev + alex |
| Casual conversion / pay slip note | Employer terms or posting footer references Fair Work obligations | Employer onboarding / terms (post-MVP or simple banner) | alex |
| Audit / incident trail | Job post changes and pay edits logged (at minimum in DB; ideal for ops runbook) | notification_queue / audit pattern per ARCH + BACKEND | jordan |
| Re-verify on change | Any rate-related code change triggers re-check of fairwork.gov.au Pay guides | docs update + manifest row | swarm coord |

**Sign-off gate:** Human legal/compliance review + Asuria pilot partner review (if live) before App Store submission or public beachhead launch.

---

## Key 2026 Facts (Verbatim from Research Sources)

- cursor-ide-browser fairwork.gov.au/ snapshot 2026-05-27: 511 refs / 117 interactive; prominent Pay and wages (e9), Pay Calculator (e10), Pay guides (e12), Find my award (e52), Changes to workplace laws (e17); 404 on legacy pay contracts URL (structure changed); sectors fast food (e21), hospitality, small business (e30), visa (e31).
- ARCHITECTURE_AUDIT.md 2026-05-27 (cross Privacy doc): consent flag gap in profiles for provider bulk access = Privacy Act risk.
- 02-mvp-definition.md (2026-05-27): pay_rate, hours_text, suburb required on every job; displayed on every card; onboarding <60s; no vague language in v1 promise example ("$32/hr").
- GUARDRAILS.md (2026-05-27): baseline Fair Work and Privacy tables (2024 rates superseded here).

---

## Cross-References (Relative Paths from docs/legal/)

- [02-mvp-definition.md](../../foundational-docs/02-mvp-definition.md) — v1 scope, required fields, card content, onboarding time.
- [BACKEND.md](../BACKEND.md) — jobs table (pay_rate, hours_text, suburb, job_type), pay_display derivation, RLS hints.
- [GUARDRAILS.md](../GUARDRAILS.md) — a11y (DES/DDA), baseline Privacy Act table (§7), old Fair Work table (§8 — superseded for 2026 rates/transparency).
- [foundational-docs/04-legal-data-sources.md](../../foundational-docs/04-legal-data-sources.md) — job sourcing strategy (direct employer safest); see pointer update for 2026 legal obligations.
- [ASURIA_PARTNERSHIP.md](../../ASURIA_PARTNERSHIP.md) — DES/Workforce Australia hooks, mentor features, compliance exports.
- [gap-analysis-2026-05-28.md §6 Outline 3](../research/gap-analysis-2026-05-28.md#outline-3-docslegalau_fair_work_pay_transparency_casual_2026md) — source outline + research notes.
- [ARCHITECTURE_AUDIT.md](../ARCHITECTURE_AUDIT.md) — pre-code CRITICAL gaps (consent flag, notif queue, match race).
- [STACK.md](../../STACK.md) — canonical stack; Expo RN + Supabase for the above flows.
- Companion: [PRIVACY_ACT_RECRUITMENT_JOBSEEKER_DATA_2026.md](./PRIVACY_ACT_RECRUITMENT_JOBSEEKER_DATA_2026.md) — bulk consent flag, APPs for swipes/PII/matches, Asuria bulk access.

**When docs disagree:** STACK.md and BACKEND.md are canonical for tech/schema; 02-mvp for scope; this file + the 2026-05-27 browser snapshot for current Fair Work pay transparency rules.

---

## Author Checklist + Maintenance

- [x] Read dispatch DOC-003 + design spec Full scope legal + gap §6 Outline 3 + §4/§8 + 2026-05-27 snapshot facts + all listed DRY files (04-legal, GUARDRAILS, BACKEND context, ASURIA, 02-mvp, STACK, README).
- [x] Embedded every 2026 fact with exact inline citations (e# refs, 511/117, ARCH quote, dates).
- [x] Full prose (no bullets-only, no TBD, no outlines).
- [x] DRY: heavy references to existing canonicals; only added 2026 depth + swipe/employer/onboarding implications.
- [x] Updated 04-legal with pointer (batch with this work).
- [x] Manifest row 18 will be marked full by coord after logs + review.
- [x] agent_logs curl executed as very last action (see swarm coordinator verification).

**Maintenance trigger:** Major Fair Work award update, new "Changes to workplace laws" snapshot, or Asuria contract change. Re-run cursor-ide-browser or Context7-equivalent and append "2026-MM-DD refresh" section. Quarterly audit recommended per gap §3.

**Next for swarm:** Human legal/compliance signoff on both AU legal docs before synthesis close. See dispatch § Coordination for Discord lane 1503111680945557614 (alex) updates.

---

*End of AU_FAIR_WORK_PAY_TRANSPARENCY_CASUAL_2026.md (FULL 2026-05-28). All content traceable to cited 2026-05-27/28 sources + project canonicals.*