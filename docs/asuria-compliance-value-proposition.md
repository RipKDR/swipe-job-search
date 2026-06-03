# Asuria / Workforce Australia — Compliance Value Proposition

**Date:** June 1, 2026  
**Project:** Hi-Hired — swipe-to-apply casual job marketplace for Melbourne hospitality, retail, and shift workers  
**Contact:** [H F]

---

## The Problem

Employment Services Providers (ESPs) like Asuria under Workforce Australia need to:

1. **Demonstrate job seeker activity** — evidence that participants are actively searching for work to meet PBAS (Points Based Activation System) targets
2. **Report outcomes** — placements, hours worked, earnings, sustained employment
3. **Comply with DEWR reporting** — the Targeted Compliance Framework (TCF) requires accurate, auditable activity records
4. **Differentiate service quality** — the Provider Performance Framework measures progress toward employment, quality of services, and sustained employment outcomes

Traditional job boards track **applications submitted**. They don't capture:
- The volume of jobs a person has considered (swipes)
- The specific employers they've engaged with
- Pre-application screening activity
- Real-time intent signals

---

## What Hi-Hired Provides

Hi-Hired is a mobile-first swipe-to-apply marketplace focused on casual employment in Melbourne (hospitality, retail, shift work). Every interaction generates structured, auditable data.

### Job Seeker Activity Data

| Data Point | Description | PBAS Relevance |
|---|---|---|
| **Total swipes** | Jobs the candidate has viewed and swiped on (left or right) | Direct evidence of job search activity |
| **Apply/right swipes** | Jobs the candidate actively applied for | Counts as job applications |
| **Unique employers interacted with** | Distinct businesses the candidate engaged | Demonstrates breadth of search |
| **Matches** | Employers who also swiped right (mutual interest) | Progress toward placement |
| **Interview/chat activity** | Messages exchanged after a match | Active engagement with employers |
| **Hires** | Confirmed placements | Outcome — the ultimate measure |
| **Per-period activity** | All metrics scoped to a date range (e.g. weekly/fortnightly) | Maps to PBAS reporting periods |

### Key Differentiator

Most compliance tools provide **self-reported data** or **aggregate application counts**. Hi-Hired provides **timestamped, system-verified interaction data** — every swipe, match, and hire is recorded server-side with immutable timestamps. This is auditable evidence, not self-reporting.

---

## Compliance Report Structure

Our compliance endpoint (`POST /api/v1/compliance/generate`) generates structured reports with:

### Per-Candidate Row (compliance_report_rows)

```
{
  "candidate_id": "uuid",
  "period_start": "2026-05-01",
  "period_end": "2026-05-07",
  "swipe_count": 47,
  "right_swipe_count": 12,
  "unique_jobs_interacted": 35,
  "match_count": 3,
  "hire_count": 1,
  "swipes_data": [ /* raw swipe records with timestamps */ ],
  "matches_data": [ /* match records with status timeline */ ],
  "hires_data": [ /* hire confirmation with employer details */ ],
  "total_earnings": 1248.50
}
```

### Aggregate Report (compliance_reports.report_data)

```json
{
  "activity_summary": {
    "total_swipes": 47,
    "right_swipes": 12,
    "unique_jobs_interacted": 35,
    "total_matches": 3,
    "total_hires": 1,
    "candidate_rows": 1
  },
  "generated_at": "2026-06-01T12:00:00+00:00"
}
```

---

## Provider Partner Value for Asuria

### 1. Richer PBAS Compliance Evidence

Asuria consultants can use Hi-Hired reports to:
- Verify a job seeker's search activity beyond what they self-report
- Identify gaps in search breadth (e.g. applying only to 2 employers vs 35 unique employers)
- Track whether a candidate is actually engaging with suitable roles (right swipes vs total)

### 2. Outcome Tracking

The matched/hired pipeline gives visibility into:
- How many candidates in a caseload are actively getting hired
- Which employers are hiring (repeat employer data)
- Time-to-hire from first swipe to confirmation

### 3. DEWR Audit Readiness

All data is:
- **Server-verified** — timestamps come from the backend, not client-reported
- **Immutable** — records cannot be retroactively modified by the job seeker
- **Period-scoped** — reports can be generated for any date range
- **Bulk-consent gated** — candidates must explicitly grant bulk swipe consent (GDPR/Privacy Act compliant)

### 4. Performance Framework Support

The Provider Performance Framework measures:
- **Progress toward employment** → swipe-to-match-to-hire pipeline shows progression
- **Quality of services** → data helps consultants tailor support (identify candidates swiping on unsuitable roles)
- **Sustained employment** → longitudinal reports across multiple periods track retention

---

## Technical Integration Path

### Phase 1 (Current — Done)
- ✅ Provider role in auth, routing, and rate limiting
- ✅ Compliance report generation endpoint (`POST /api/v1/compliance/generate`)
- ✅ Compliance report listing and retrieval (`GET /api/v1/compliance/reports`)
- ✅ Per-candidate row persistence (retry-safe with `compliance_report_rows`)
- ✅ Run status tracking (`compliance_report_runs`)
- ✅ RLS policies (provider reads own reports, candidate reads own data)
- ✅ Bulk swipe consent requirement (candidate must opt in)

### Phase 2 (Next — Asuria Partnership)
- [ ] **PDF generation** — render reports as DEWR-friendly PDFs from persisted row data
- [ ] **Asuria admin dashboard** — multi-candidate view across a provider's caseload
- [ ] **Scheduled weekly reports** — auto-generate and deliver reports (e.g. every Monday)
- [ ] **CSV export** — for provider-side data processing and legacy system ingestion
- [ ] **Webhook notifications** — push report-ready events to Asuria's systems

### Phase 3 (Scale)
- [ ] **API token auth** — machine-to-machine access for Asuria's backend
- [ ] **Bulk report generation** — generate reports for multiple candidates in one request
- [ ] **White-label reports** — branded with Asuria's logo for DEWR submission

---

## Security & Privacy

- **Bulk swipe consent** is required before any compliance data is accessible
- Consent can be revoked at any time
- RLS ensures providers can only see data for their own candidates
- All API access requires authenticated provider role tokens
- Service role is used only for server-side operations (never exposed client-side)
- Compliance report rows are immutable snapshots — raw data in, raw data persisted

---

## What We Need from Asuria

For the integration to work, Asuria would need to provide:
1. **Candidate ID mapping** — a way to link Asuria's participant IDs to Hi-Hired user accounts
2. **Compliance reporting format preferences** — what specific DEWR compliance forms or data schemas they need
3. **Integration type** — webhook endpoint URL, or do they prefer a portal dashboard?

---

*This document accompanies the demo of the provider compliance dashboard at `/provider/compliance/` in the Hi-Hired mobile app.*
