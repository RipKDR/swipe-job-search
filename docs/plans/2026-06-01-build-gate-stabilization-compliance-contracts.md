# Build Gate Stabilization + Compliance Contracts Implementation Plan

> **For Hermes:** Use `software-development/test-driven-development` and `software-development/systematic-debugging` for implementation. Do not overwrite existing dirty backend files without first preserving/reviewing their diff.

**Goal:** Restore reliable backend/mobile verification gates around the compliance provider workflow before starting another product feature.

**Architecture:** This is a stabilization slice, not a new surface-area feature. It locks the current FastAPI structured-error contract work, fixes the mobile TypeScript path/config break, aligns shared Supabase database types with the compliance report migrations, and moves compliance PDF download logic behind a tested mobile helper. The provider compliance screen remains the UI entry point; backend ownership and RLS stay server-side.

**Tech Stack:** Expo SDK 56, React Native 0.85, TypeScript 6, Vitest, FastAPI, Pydantic, Supabase/Postgres, ReportLab PDF generation.

---

## Why this is the next slice

Preflight showed the repo is already mid-change and verification gates are not trustworthy enough for a new feature:

- Current branch: `main`.
- Dirty files already exist and must be protected:
  - `backend/src/api/endpoints/forecast.py`
  - `backend/src/api/endpoints/jobs.py`
  - `backend/tests/test_api.py`
- Targeted backend checks passed after inspecting those dirty files:
  - `backend/.venv/bin/python -m pytest backend/tests/test_api.py -q` → `8 passed`
  - `backend/.venv/bin/python -m pytest backend/tests/test_compliance_api.py -q` → `10 passed`
- Mobile typecheck currently fails before it can validate the compliance screen because `apps/mobile/tsconfig.json` has a malformed `paths` block.
- After that config issue, the known compliance blockers are:
  - shared `Database` type is missing `compliance_report_rows` and `compliance_report_runs` despite migrations existing;
  - `expo-sharing` is used but not declared in `apps/mobile/package.json`;
  - Expo SDK 56 root `expo-file-system` exports the new API, while the current code uses legacy `cacheDirectory` and `downloadAsync`; the package exports these from `expo-file-system/legacy`;
  - compliance UI has inline network/download logic that is hard to test and uses `any` for report data.

Starting Salary Transparency or GPS filtering before this would stack product work on top of broken gates. Fix the gates first.

---

## Systemic Blueprint

### Intent

Give providers a reliable compliance report workflow that can be built on without breaking mobile compilation, API contracts, or AU compliance expectations. The user value is trust: provider-facing compliance artifacts must not be a fragile demo path.

### Constraints

- Do not expose service-role keys or raw provider/candidate PII in logs, docs, or client code.
- Do not weaken RLS. The mobile client may read only via existing provider/candidate policies; writes/generation remain backend/service-controlled.
- Do not claim Centrelink/Workforce Australia legal certainty. Product copy should say “supporting records/summaries”, not “guaranteed compliant evidence”.
- Preserve current dirty backend work unless deliberately continuing that exact diff.
- No new product feature until `@hi-hired/mobile typecheck` is usable again.
- Use TDD for new helper behavior; config/type-generation fixes use the failing typecheck as the RED signal.

### Data Contract

#### Existing backend API contracts to preserve

- `POST /api/v1/compliance/generate`
  - Requires provider JWT.
  - Input: `{ candidate_id, period_start, period_end, report_type }`.
  - Output: persisted compliance report with rows/run status.
  - Error shape: structured FastAPI app error where available: `{ error: { code, message, details? } }`.

- `GET /api/v1/compliance/reports/{report_id}/pdf`
  - Requires provider JWT and ownership check.
  - Output: `application/pdf` attachment.
  - Rejects non-completed reports with structured `INVALID_STATE` error.

#### Shared TypeScript table contracts to add

Add these tables to `packages/shared/src/types/database.ts` under `Database['public']['Tables']`:

```ts
compliance_report_runs: {
  Row: {
    id: string;
    report_id: string;
    status: 'pending' | 'generating' | 'completed' | 'failed';
    total_candidates: number;
    completed_candidates: number;
    failed_candidates: number;
    error_message: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    report_id: string;
    status?: 'pending' | 'generating' | 'completed' | 'failed';
    total_candidates?: number;
    completed_candidates?: number;
    failed_candidates?: number;
    error_message?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    report_id?: string;
    status?: 'pending' | 'generating' | 'completed' | 'failed';
    total_candidates?: number;
    completed_candidates?: number;
    failed_candidates?: number;
    error_message?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    created_at?: string;
    updated_at?: string;
  };
};
compliance_report_rows: {
  Row: {
    id: string;
    report_id: string;
    run_id: string;
    candidate_id: string;
    status: 'pending' | 'generating' | 'completed' | 'failed';
    swipe_count: number;
    right_swipe_count: number;
    unique_jobs_interacted: number;
    match_count: number;
    hire_count: number;
    swipes_data: Record<string, unknown> | null;
    matches_data: Record<string, unknown> | null;
    hires_data: Record<string, unknown> | null;
    total_earnings: number | null;
    error_message: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    report_id: string;
    run_id: string;
    candidate_id: string;
    status?: 'pending' | 'generating' | 'completed' | 'failed';
    swipe_count?: number;
    right_swipe_count?: number;
    unique_jobs_interacted?: number;
    match_count?: number;
    hire_count?: number;
    swipes_data?: Record<string, unknown> | null;
    matches_data?: Record<string, unknown> | null;
    hires_data?: Record<string, unknown> | null;
    total_earnings?: number | null;
    error_message?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    report_id?: string;
    run_id?: string;
    candidate_id?: string;
    status?: 'pending' | 'generating' | 'completed' | 'failed';
    swipe_count?: number;
    right_swipe_count?: number;
    unique_jobs_interacted?: number;
    match_count?: number;
    hire_count?: number;
    swipes_data?: Record<string, unknown> | null;
    matches_data?: Record<string, unknown> | null;
    hires_data?: Record<string, unknown> | null;
    total_earnings?: number | null;
    error_message?: string | null;
    created_at?: string;
    updated_at?: string;
  };
};
```

### Success Criteria

- Mobile typecheck reaches and clears the provider compliance code path.
- Shared DB types match the two compliance report migrations added on 2026-06-01.
- Compliance PDF download helper is unit-tested for:
  - structured backend errors;
  - legacy `detail` backend errors;
  - missing auth token;
  - native download using `expo-file-system/legacy` dependency injection;
  - sharing unavailable fallback.
- Provider screen no longer imports `expo-file-system` root legacy members.
- Provider screen has accessibility role/label/state for interactive compliance controls.
- Backend dirty contract work remains covered by targeted tests before any broader changes.

---

## Technical Schema

```text
Data Flow:
  Provider opens compliance tab
    → mobile reads compliance_reports via Supabase RLS
    → provider requests generate via FastAPI with provider JWT
    → FastAPI validates provider role + candidate consent
    → FastAPI persists compliance_reports + compliance_report_runs + compliance_report_rows
    → provider expands report card
    → mobile reads compliance_report_rows via Supabase RLS
    → provider downloads PDF via FastAPI with provider JWT
    → mobile web branch uses blob download
    → mobile native branch downloads to cache with expo-file-system/legacy and shares with expo-sharing

Component Boundaries:
  backend/src/api/endpoints/compliance.py:
    Auth, ownership checks, report generation, PDF response, structured API errors.
  supabase/migrations/*compliance*.sql:
    Tables, RLS policies, storage bucket/policy contracts.
  packages/shared/src/types/database.ts:
    Compile-time mirror of Supabase table/view/function contracts used by mobile.
  apps/mobile/lib/compliance.ts:
    Pure/testable compliance API error parsing, URL building, PDF download/share orchestration.
  apps/mobile/app/(provider)/compliance/index.tsx:
    UI state, user interaction, accessibility, calls into the helper.

Algorithm Selection:
  No complex algorithm. The only transformation is deterministic error-message extraction and deterministic URL/file-path building. Complexity O(1) per request; row rendering is O(n) for displayed rows.

State Management:
  Existing local React state remains. No new global store. Supabase remains source of truth for persisted reports/rows. FastAPI remains source of truth for PDF generation.
```

---

## Task 0: Preserve current worktree and lock backend contract diff

**Objective:** Avoid overwriting existing dirty backend work, and establish that the current dirty backend changes are intentional enough to keep.

**Files:**
- Inspect only: `backend/src/api/endpoints/forecast.py`
- Inspect only: `backend/src/api/endpoints/jobs.py`
- Inspect only: `backend/tests/test_api.py`

**Step 1: Re-check dirty state**

Run:

```bash
git status --short
git diff -- backend/src/api/endpoints/forecast.py backend/src/api/endpoints/jobs.py backend/tests/test_api.py
```

Expected: only the known backend contract files are dirty before implementation starts.

**Step 2: Run targeted backend tests**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_api.py backend/tests/test_compliance_api.py -q
```

Expected: PASS. If it fails, stop and debug before touching mobile files.

**Step 3: Do not commit yet**

These files are pre-existing dirty work. Keep them uncommitted until the mobile gate is restored, then commit the full stabilization slice together or split into two commits:

```bash
# likely split later, not now
git add backend/src/api/endpoints/forecast.py backend/src/api/endpoints/jobs.py backend/tests/test_api.py
git commit -m "fix(api): standardize backend contract errors"
```

---

## Task 1: Fix mobile TypeScript path configuration

**Objective:** Repair the malformed `apps/mobile/tsconfig.json` so aliases resolve and typecheck can surface real mobile errors.

**Files:**
- Modify: `apps/mobile/tsconfig.json`

**Step 1: Verify RED**

Run:

```bash
pnpm --filter @hi-hired/mobile typecheck
```

Expected: FAIL. The current output should include `TS5023: Unknown compiler option '@/*'` plus many alias resolution failures.

**Step 2: Replace compilerOptions block path config**

Change `apps/mobile/tsconfig.json` to:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "ignoreDeprecations": "6.0",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@hi-hired/shared": ["../../packages/shared/src/index.ts"],
      "@hi-hired/shared/*": ["../../packages/shared/src/*"]
    },
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowJs": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "noEmit": true,
    "resolveJsonModule": true
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts",
    "global.d.ts",
    "nativewind-env.d.ts"
  ],
  "exclude": [
    "node_modules",
    "babel.config.js",
    "tailwind.config.js"
  ]
}
```

**Step 3: Re-run typecheck**

Run:

```bash
pnpm --filter @hi-hired/mobile typecheck
```

Expected: the alias flood is gone. Remaining failures should be real typing issues, primarily compliance table types / `expo-sharing` / Expo FileSystem legacy API.

---

## Task 2: Add compliance report rows/runs to shared Supabase types

**Objective:** Align `@hi-hired/shared` `Database` with `supabase/migrations/20260601027_compliance_report_rows.sql`.

**Files:**
- Modify: `packages/shared/src/types/database.ts`

**Step 1: Verify RED**

Run:

```bash
pnpm --filter @hi-hired/mobile typecheck
```

Expected: FAIL includes `Property 'compliance_report_rows' does not exist on type ...`.

**Step 2: Add table types**

Insert the `compliance_report_runs` and `compliance_report_rows` definitions from this plan under `Database['public']['Tables']`, immediately after `compliance_reports` and before `bulk_swipe_log`.

Also tighten `compliance_reports` while touching the block:

```ts
report_type: Database['public']['Enums']['compliance_report_type'];
status: 'pending' | 'generating' | 'completed' | 'failed';
```

Apply the same enum/status tightening to `Insert` and `Update` optional fields.

**Step 3: Verify shared package**

Run:

```bash
pnpm --filter @hi-hired/shared typecheck
```

Expected: PASS.

**Step 4: Re-run mobile typecheck**

Run:

```bash
pnpm --filter @hi-hired/mobile typecheck
```

Expected: compliance table-type error is gone. Remaining failures should be `expo-sharing`, `expo-file-system` legacy usage, or screen-local typing.

---

## Task 3: Add tested compliance mobile helper

**Objective:** Move compliance-specific parsing and PDF download orchestration out of the route component into a tested helper.

**Files:**
- Create: `apps/mobile/lib/compliance.ts`
- Create: `apps/mobile/lib/__tests__/compliance.test.ts`

**Step 1: Write failing tests first**

Create `apps/mobile/lib/__tests__/compliance.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  buildCompliancePdfFilename,
  buildCompliancePdfUrl,
  extractComplianceApiErrorMessage,
  downloadCompliancePdfNative,
} from '@/lib/compliance';

describe('compliance helpers', () => {
  it('builds stable PDF filenames and URLs', () => {
    expect(buildCompliancePdfFilename('report-123')).toBe('compliance-report-123.pdf');
    expect(buildCompliancePdfUrl('http://localhost:8000', 'report-123')).toBe(
      'http://localhost:8000/api/v1/compliance/reports/report-123/pdf'
    );
    expect(buildCompliancePdfUrl('http://localhost:8000/', 'report-123')).toBe(
      'http://localhost:8000/api/v1/compliance/reports/report-123/pdf'
    );
  });

  it('extracts structured FastAPI app errors', () => {
    expect(
      extractComplianceApiErrorMessage(
        { error: { code: 'INVALID_STATE', message: 'Report is not completed' } },
        'Fallback'
      )
    ).toBe('Report is not completed');
  });

  it('extracts legacy FastAPI detail errors', () => {
    expect(extractComplianceApiErrorMessage({ detail: 'Candidate not found' }, 'Fallback')).toBe(
      'Candidate not found'
    );
  });

  it('falls back for unknown error payloads', () => {
    expect(extractComplianceApiErrorMessage({ nope: true }, 'Fallback')).toBe('Fallback');
    expect(extractComplianceApiErrorMessage(null, 'Fallback')).toBe('Fallback');
  });

  it('downloads and shares a native PDF with injected Expo modules', async () => {
    const downloadAsync = vi.fn().mockResolvedValue({ uri: 'file:///cache/compliance-1.pdf' });
    const isAvailableAsync = vi.fn().mockResolvedValue(true);
    const shareAsync = vi.fn().mockResolvedValue(undefined);

    const result = await downloadCompliancePdfNative({
      apiBase: 'http://localhost:8000',
      reportId: '1',
      token: 'jwt-token',
      fileSystem: {
        cacheDirectory: 'file:///cache/',
        downloadAsync,
      },
      sharing: {
        isAvailableAsync,
        shareAsync,
      },
    });

    expect(result.localUri).toBe('file:///cache/compliance-1.pdf');
    expect(result.shared).toBe(true);
    expect(downloadAsync).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/compliance/reports/1/pdf',
      'file:///cache/compliance-1.pdf',
      { headers: { Authorization: 'Bearer jwt-token' } }
    );
    expect(shareAsync).toHaveBeenCalledWith('file:///cache/compliance-1.pdf');
  });

  it('does not fail when native sharing is unavailable', async () => {
    const result = await downloadCompliancePdfNative({
      apiBase: 'http://localhost:8000',
      reportId: '1',
      token: 'jwt-token',
      fileSystem: {
        cacheDirectory: 'file:///cache/',
        downloadAsync: vi.fn().mockResolvedValue({ uri: 'file:///cache/compliance-1.pdf' }),
      },
      sharing: {
        isAvailableAsync: vi.fn().mockResolvedValue(false),
        shareAsync: vi.fn(),
      },
    });

    expect(result.shared).toBe(false);
  });
});
```

Run:

```bash
pnpm --filter @hi-hired/mobile exec vitest run lib/__tests__/compliance.test.ts
```

Expected: FAIL because `apps/mobile/lib/compliance.ts` does not exist yet.

**Step 2: Implement the helper**

Create `apps/mobile/lib/compliance.ts`:

```ts
type ErrorPayload = {
  detail?: unknown;
  error?: {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
};

type LegacyFileSystemModule = {
  cacheDirectory: string | null;
  downloadAsync: (
    uri: string,
    fileUri: string,
    options?: { headers?: Record<string, string> }
  ) => Promise<{ uri: string }>;
};

type SharingModule = {
  isAvailableAsync: () => Promise<boolean>;
  shareAsync: (url: string) => Promise<void>;
};

export function buildCompliancePdfFilename(reportId: string): string {
  return `compliance-${reportId}.pdf`;
}

export function buildCompliancePdfUrl(apiBase: string, reportId: string): string {
  const base = apiBase.replace(/\/+$/, '');
  return `${base}/api/v1/compliance/reports/${encodeURIComponent(reportId)}/pdf`;
}

export function extractComplianceApiErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;

  const payload = body as ErrorPayload;
  if (typeof payload.error?.message === 'string' && payload.error.message.trim()) {
    return payload.error.message;
  }
  if (typeof payload.detail === 'string' && payload.detail.trim()) {
    return payload.detail;
  }
  return fallback;
}

export async function downloadCompliancePdfNative(params: {
  apiBase: string;
  reportId: string;
  token: string;
  fileSystem: LegacyFileSystemModule;
  sharing: SharingModule;
}): Promise<{ localUri: string; shared: boolean }> {
  const { apiBase, reportId, token, fileSystem, sharing } = params;
  const cacheDirectory = fileSystem.cacheDirectory;
  if (!cacheDirectory) {
    throw new Error('PDF download cache is unavailable on this device.');
  }

  const localUri = `${cacheDirectory}${buildCompliancePdfFilename(reportId)}`;
  await fileSystem.downloadAsync(buildCompliancePdfUrl(apiBase, reportId), localUri, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const canShare = await sharing.isAvailableAsync();
  if (canShare) {
    await sharing.shareAsync(localUri);
  }

  return { localUri, shared: canShare };
}
```

**Step 3: Verify GREEN**

Run:

```bash
pnpm --filter @hi-hired/mobile exec vitest run lib/__tests__/compliance.test.ts
```

Expected: PASS.

---

## Task 4: Declare `expo-sharing` and switch native download to Expo FileSystem legacy export

**Objective:** Make the existing PDF download path compile under Expo SDK 56.

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/mobile/app/(provider)/compliance/index.tsx`

**Step 1: Add SDK-compatible sharing package**

Run:

```bash
pnpm --filter @hi-hired/mobile add expo-sharing@~56.0.15
```

Expected: `apps/mobile/package.json` and `pnpm-lock.yaml` are updated. Do not manually edit the lockfile.

**Step 2: Update route imports**

Add helper imports to `apps/mobile/app/(provider)/compliance/index.tsx`:

```ts
import {
  buildCompliancePdfFilename,
  buildCompliancePdfUrl,
  downloadCompliancePdfNative,
  extractComplianceApiErrorMessage,
} from '@/lib/compliance'
```

**Step 3: Replace generate error parsing**

Replace:

```ts
const errBody = await resp.json().catch(() => ({ detail: resp.statusText }))
throw new Error(errBody.detail || `Server error (${resp.status})`)
```

with:

```ts
const errBody = await resp.json().catch(() => null)
throw new Error(
  extractComplianceApiErrorMessage(errBody, `Server error (${resp.status})`)
)
```

**Step 4: Replace inline PDF download branch**

In the web branch, keep blob download but use helpers:

```ts
const filename = buildCompliancePdfFilename(report.id)

if (Platform.OS === 'web') {
  const blob = await resp.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
} else {
  const FileSystem = await import('expo-file-system/legacy')
  const Sharing = await import('expo-sharing')
  await downloadCompliancePdfNative({
    apiBase,
    reportId: report.id,
    token,
    fileSystem: FileSystem,
    sharing: Sharing,
  })
}
```

The fetch URL should use:

```ts
buildCompliancePdfUrl(apiBase, report.id)
```

**Step 5: Verify typecheck progress**

Run:

```bash
pnpm --filter @hi-hired/mobile typecheck
```

Expected: no `expo-sharing` module error and no `cacheDirectory`/`downloadAsync` root-export error.

---

## Task 5: Remove `any` from compliance report data

**Objective:** Keep the compliance screen type-safe without hiding report JSON behind `any`.

**Files:**
- Modify: `apps/mobile/app/(provider)/compliance/index.tsx`

**Step 1: Add local report-data types**

Add near the existing type aliases:

```ts
type ComplianceActivitySummary = {
  total_swipes?: number
  right_swipes?: number
  unique_jobs_interacted?: number
  total_matches?: number
  total_hires?: number
  candidate_rows?: number
}

type ComplianceReportData = {
  activity_summary?: ComplianceActivitySummary
}

function asComplianceReportData(value: unknown): ComplianceReportData | null {
  if (!value || typeof value !== 'object') return null
  return value as ComplianceReportData
}
```

**Step 2: Replace `any` usage**

Replace:

```ts
const reportData = report.report_data as Record<string, any> | null
```

with:

```ts
const reportData = asComplianceReportData(report.report_data)
```

**Step 3: Verify no explicit `any` in compliance route**

Run:

```bash
python - <<'PY'
from pathlib import Path
p = Path('apps/mobile/app/(provider)/compliance/index.tsx')
text = p.read_text()
assert 'any' not in text, 'explicit any remains in compliance screen'
print('ok')
PY
```

Expected: `ok`.

---

## Task 6: Add accessibility labels/states to provider compliance controls

**Objective:** Make compliance controls usable with VoiceOver/TalkBack and less ambiguous for providers.

**Files:**
- Modify: `apps/mobile/app/(provider)/compliance/index.tsx`

**Step 1: Add accessible form toggle**

Update the generate button `Pressable`:

```tsx
<Pressable
  className="bg-indigo-600 py-3 px-4 rounded-xl active:opacity-80"
  onPress={() => setShowForm(!showForm)}
  accessibilityRole="button"
  accessibilityLabel={showForm ? 'Cancel compliance report generation' : 'Generate a compliance report'}
  accessibilityState={{ expanded: showForm }}
>
```

**Step 2: Label text inputs**

For candidate ID:

```tsx
<TextInput
  accessibilityLabel="Candidate ID for compliance report"
  accessibilityHint="Enter the candidate UUID to generate a report for"
  className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
  placeholder="UUID of the candidate"
  placeholderTextColor="#64748b"
  value={candidateId}
  onChangeText={setCandidateId}
  autoCapitalize="none"
/>
```

For period:

```tsx
<TextInput
  accessibilityLabel="Compliance report period in days"
  accessibilityHint="Enter a number between 1 and 90"
  className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
  placeholder="7"
  placeholderTextColor="#64748b"
  value={periodDays}
  onChangeText={setPeriodDays}
  keyboardType="number-pad"
/>
```

**Step 3: Add submit state**

Update the submit `Pressable`:

```tsx
<Pressable
  className={`py-3 px-4 rounded-xl ${generating ? 'bg-indigo-800/50' : 'bg-emerald-600'} active:opacity-80`}
  onPress={handleGenerate}
  disabled={generating}
  accessibilityRole="button"
  accessibilityLabel="Submit compliance report generation request"
  accessibilityState={{ disabled: generating, busy: generating }}
>
```

**Step 4: Add report card expand/download semantics**

For the card toggle:

```tsx
<Pressable
  onPress={handleToggle}
  accessibilityRole="button"
  accessibilityLabel={`Compliance report for candidate ${report.candidate_id.slice(0, 8)}. ${statusLabel}. ${expanded ? 'Collapse details' : 'Expand details'}`}
  accessibilityState={{ expanded }}
>
```

For the PDF download button:

```tsx
<Pressable
  className="mt-3 bg-indigo-600/20 border border-indigo-500/30 rounded-lg py-2 px-3 active:opacity-80"
  accessibilityRole="button"
  accessibilityLabel="Download compliance report PDF"
  onPress={async () => {
    // existing handler
  }}
>
```

**Step 5: Verify compile**

Run:

```bash
pnpm --filter @hi-hired/mobile typecheck
```

Expected: PASS or only unrelated pre-existing strictness errors. If unrelated errors remain, list them explicitly and do not claim mobile gate is fully restored.

---

## Task 7: Contract and regression verification

**Objective:** Prove this stabilization did not break backend contracts or mobile/shared typing.

**Files:**
- No new files unless a test fails and requires a regression test.

**Step 1: Backend targeted tests**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_api.py backend/tests/test_compliance_api.py -q
```

Expected: PASS.

**Step 2: Shared typecheck**

Run:

```bash
pnpm --filter @hi-hired/shared typecheck
```

Expected: PASS.

**Step 3: Mobile helper tests**

Run:

```bash
pnpm --filter @hi-hired/mobile exec vitest run lib/__tests__/compliance.test.ts
```

Expected: PASS.

**Step 4: Mobile typecheck**

Run:

```bash
pnpm --filter @hi-hired/mobile typecheck
```

Expected: PASS. If not, capture the remaining errors and classify them as:

- caused by this slice — fix before closing;
- pre-existing but now exposed — document and create a follow-up plan;
- generated type drift — regenerate/update shared types.

**Step 5: Final diff review**

Run:

```bash
git diff --stat
git diff -- apps/mobile/tsconfig.json packages/shared/src/types/database.ts apps/mobile/lib/compliance.ts apps/mobile/lib/__tests__/compliance.test.ts apps/mobile/app/\(provider\)/compliance/index.tsx apps/mobile/package.json pnpm-lock.yaml
```

Expected: diff is limited to the stabilization files plus the already-dirty backend contract files.

---

## Compliance Check

**Assessment:** Proceed with conditions.

**Relevant obligations/risk areas:**

- Australian Privacy Act / APPs: candidate IDs, swipe history, matches, hires, and provider report artifacts are personal information. Keep report data minimal and access-controlled.
- DDA/accessibility: provider controls must be accessible; add roles/labels/state and avoid visual-only status indicators.
- Centrelink/Workforce Australia / DEWR positioning: describe reports as activity summaries/supporting records, not guaranteed evidence of compliance.
- Supabase RLS: mobile reads must rely on provider/candidate policies; generation/storage should remain backend/service-controlled.

**Required mitigations in this slice:**

- No raw report payload logging in mobile or backend.
- No service-role key in the mobile bundle.
- PDF download requires provider JWT and backend ownership check.
- UI copy remains “Compliance Reports” / “summaries”; no legal guarantee language.
- Error messages should be actionable but not leak other candidate/provider data.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---:|---:|---|
| Accidentally overwriting dirty backend contract work | Medium | High | Start with `git diff`; edit only named files; no broad formatter over backend. |
| Mobile typecheck reveals unrelated strictness errors after tsconfig fix | High | Medium | Classify remaining errors; fix slice-caused errors only; document unrelated blockers. |
| Manual Supabase types drift from migrations again | Medium | Medium | Add this to follow-up: generate types from Supabase/OpenAPI or create a schema sync check. |
| Native PDF sharing behaves differently on iOS/Android | Medium | Medium | Use dependency-injected helper tests plus manual Expo device check before release. |
| Compliance report wording implies legal certainty | Low | High | Keep language framed as summaries/supporting records; require human/legal review before provider sales material. |
| `expo-sharing` version mismatch with SDK 56 | Low | Medium | Pin `expo-sharing@~56.0.15` and run mobile typecheck/tests after install. |

---

## Commit Strategy

After verification, prefer two commits if the backend contract diff remains logically separate:

```bash
git add backend/src/api/endpoints/forecast.py backend/src/api/endpoints/jobs.py backend/tests/test_api.py
git commit -m "fix(api): standardize backend contract errors"

git add apps/mobile/tsconfig.json packages/shared/src/types/database.ts apps/mobile/lib/compliance.ts apps/mobile/lib/__tests__/compliance.test.ts apps/mobile/app/\(provider\)/compliance/index.tsx apps/mobile/package.json pnpm-lock.yaml docs/plans/2026-06-01-build-gate-stabilization-compliance-contracts.md
git commit -m "fix(mobile): restore compliance contract typechecks"
```

If the first commit is already someone else's in-progress work, do not commit it without confirming ownership. Keep the plan committed only with the mobile stabilization once safe.

---

## Done Means

- The plan file exists at `docs/plans/2026-06-01-build-gate-stabilization-compliance-contracts.md`.
- Dirty work is understood before editing.
- RED signals are captured before fixes.
- New helper tests are observed failing before helper implementation.
- Targeted backend tests, shared typecheck, mobile helper tests, and mobile typecheck are run fresh before any completion claim.
- Remaining failures, if any, are reported with exact command output and classified.
