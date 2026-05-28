# Evaluation Specification Scratchpad: Hi-Hired U6 Employer UI Components (Combined)

User Prompt: Continue Hi-Hired MVP U6 — Employer job posting, My Jobs, Interested List
Artifact Type: code (4 related components + test)

Tasks: JobForm (A), JobListItem (B), InterestedCard (C), InterestedCard.test (D)

---

## Context Summary

- U5 patterns: NativeWind v5, `@/components/tw`, `Button` from `@/components/ui/Button`
- `EmployerProfileForm`: FormField, SuburbPicker, Controller, space-y-6 layout
- `JobCreateSchema` in `@hi-hired/shared` — expires_at NOT in schema (set in post-job.tsx on submit)
- Fair Work: `isBelowFairWorkMinimum`, `fairWorkWarningMessage` — warn only, do not block
- Photo: upload in `jobPhotoUpload.ts` path `{employer_id}/{job_id}/{timestamp}.{ext}`; JobForm uses local URI callbacks
- JobListItem/InterestedCard: slate-900 cards, rounded-xl, border-slate-800, mb-3
- Tests: vitest + @testing-library/react; form tests use harness pattern; mock expo-image-picker for photo

---

## Final Evaluation Specification

(See orchestrator return — YAML only)
