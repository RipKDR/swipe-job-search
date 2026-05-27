# Data Retention & Purge Plan 2026 (Privacy Act / AU Beachhead)

> **Status:** FULL 2026-05-28 by sam (qa) via swarm SHOULD. Per design spec SHOULD + gap §5 + §4 Structure B (ops/). Builds on GUARDRAILS.md §7 (old retention), PRIVACY_ACT..._2026.md (MUST legal), BACKEND profiles/swipes/matches, ARCH CRITICAL consent flag, 02-mvp <60s onboarding.

## Rationale
Hi-Hired collects jobseeker PII (experience, skills, availability, work rights, avatars, swipes, matches, chats) for the bilateral opt-in casual hiring beachhead. Privacy Act 1988 (APPs) + OAIC recruitment guidance + Fair Work record-keeping (7yr some docs) + App Store + Asuria/DES requirements mandate clear retention, user rights (access/deletion), and automated purge of expired PII. Per ARCH 2026-05-27, missing bulk_swipe_consent on profiles = violation at launch. This plan + Edge purge script + UI hooks (cross legal + a11y) closes it. DRY: no dupe of legal APPs or BACKEND schema.

## 2026 Facts & Sources
- Privacy Act 1988 + OAIC (gap §6 Outline 4 + §8): applies to recruitment platforms; consent for swipes/PII/matches; notifiable breaches; retention limits; deletion on purpose expiry; cross-border (Supabase US disclosed).
- ARCHITECTURE_AUDIT 2026-05-27: "Task 7 ... bulk_swipe_consent ... Missing = Privacy Act violation at launch" for provider bulk swipes/jobseeker data.
- cursor-ide-browser fairwork 2026-05-27 snapshot (gap §8): privacy links e61; pay sections but privacy obligations for casual ads.
- Local 2026-05-28 (gap §1/8): GUARDRAILS has 30d/2yr/7yr policy (stale, Capacitor refs); BACKEND has no purge/ retention fields yet; 04-legal thin.
- Supabase 2026 (MCP 82.6 + BACKEND): Edge Functions for scheduled purge (pg_cron or external cron calling Edge with service_role); RLS on profiles/swipes; storage policies for avatars (owner delete).
- Expo RN 2026 (MCP expo_dev 86.3): SecureStore for consent flags; deep link to privacy settings.

## Retention Policies (Tiered by Data Class)
| Data Class | Retention | Legal Driver | Purge Trigger | Audit |
|------------|-----------|--------------|---------------|-------|
| Active account PII (profile, work rights, avatars) | Indefinite while active + 30d grace post-delete | APPs 11.2 (destroy when no longer needed) | Account delete or 90d inactivity (configurable) | Log to compliance_reports |
| Swipes / ignored jobs (jobseeker) | 30d after swipe or unmatch | APPs + beachhead minimal data | Unmatch or 30d expiry | Aggregate only retained |
| Matches + chat (both parties) | 2 years (Fair Work) or 30d post-hire confirm if shorter | Fair Work record-keeping + Privacy | Hire confirm + 30d or manual | 7yr for provider reports |
| Compliance reports (Asuria/DES) | 7 years | DSS / Fair Work audit | Manual archive to cold storage | Immutable bucket |
| Session recordings / analytics (PostHog) | 30d auto-delete (config) | Privacy + PostHog terms | Time-based in PostHog + new SENTRY retention | - |
| Device tokens | Until user logout or token refresh fail | Functional (push) | Logout / invalid | - |

**Bulk consent flag (ARCH gap, MUST in profiles per PRIVACY legal):** `bulk_swipe_consent boolean default false, consented_at timestamptz, consent_version text`. Required for Asuria/DES bulk reporting. Onboarding <60s per 02-mvp includes minimal consent + link to full policy (cross a11y for screen reader).

## Purge Implementation (Edge + Scheduled 2026)
Use Supabase Edge Function (service_role key, called by pg_cron or external scheduler like GitHub Actions nightly 2am AEST).

Example `supabase/functions/purge-expired-pii/index.ts` (Deno 2026, per SUPABASE stack MCP):
```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  const { data: expired } = await supabase.rpc('find_expired_pii'); // SQL view or func: swipes older 30d, profiles deleted 30d+, etc.
  for (const row of expired || []) {
    await supabase.from('swipes').delete().eq('id', row.id); // or anonymize
    // storage: await supabase.storage.from('avatars').remove([row.avatar_path])
    await supabase.from('audit_logs').insert({ action: 'pii_purged', subject_id: row.user_id, details: row });
  }
  return new Response(JSON.stringify({ purged: expired?.length || 0 }));
});
```

SQL helper (in migration, cross MIGRATION_RUNBOOK):
```sql
create or replace function find_expired_pii()
returns setof record language sql security definer as $$
  select id, user_id, 'swipe' as type from swipes where created_at < now() - interval '30 days'
  union ...
$$;
```

Schedule: Supabase pg_cron (if enabled) or external (EAS + GitHub nightly calling the Edge URL with auth).

**Idempotency / safety:** Use soft delete first (deleted_at), then hard purge after 7d grace; never purge active matches/chats without legal hold.

## User Rights UI (Cross-Refs)
- "Download my data" (JSON export of profile/swipes/matches — Edge func, RLS owner only).
- "Delete account" (cascades to purge after 30d grace; consent flag cleared).
- Privacy policy link in onboarding + settings (WCAG 2.2 AA per new a11y checklist + GUARDRAILS update).
- Consent toggle for bulk (Asuria) with versioned text.

## Compliance & Audit
- Annual review (or on Fair Work/Privacy amendment — trigger in manifest/gap).
- Log all purges/access to immutable audit table (queryable for OAIC/DES).
- Notifiable breach: if PII exposed, notify OAIC + affected within 72h (playbook in SECURITY.md).
- Cross legal: PRIVACY_ACT..._2026.md for APPs details + UI consent; AU_FAIR_WORK for pay data in reports.

## Testing (2026 RN)
- Unit: Vitest on purge func (mock dates).
- E2E: Maestro flow (new TESTING_STRATEGY): signup (consent) → swipe 5 → delete account → run purge Edge → assert PII gone (admin view or export empty) + audit row.
- a11y: axe-core/react-native on delete flow + screen reader announcement of "Data will be purged in 30 days" (cross docs/a11y/).
- Privacy: RLS tests (anon cannot purge; owner can request export).

## Gotchas 2026
- Supabase Storage: public buckets need owner RLS delete policy + Edge service_role for bulk purge.
- Realtime: unsubscribe before purge to avoid ghost updates.
- Analytics: PostHog identify deleted → alias to anon aggregate only (30d retention).
- Legal hold: provider audits may require 7yr hold on subset — tag rows, exclude from purge.
- Cold Edge: queue the purge request if processor busy (tie to INCIDENT_RESPONSE).

## References (DRY)
- gap-analysis-2026-05-28.md §5 SHOULD, §6 Outline 4 (Privacy), §8 (ARCH + browser + MCP 2026-05-28 + tool rules).
- docs/legal/PRIVACY_ACT_RECRUITMENT_JOBSEEKER_DATA_2026.md + AU_FAIR_WORK... (MUST).
- GUARDRAILS.md (old policy — superseded by this; see 2026-05-28 update).
- BACKEND.md (schema, RLS, Edge, notification_queue for audit).
- ARCHITECTURE_AUDIT.md 2026-05-27 (consent flag).
- New: docs/a11y/ACCESSIBILITY_AUDIT_CHECKLIST.md (inclusive delete UX), docs/analytics/POSTHOG... (retention config), TESTING_STRATEGY (Maestro privacy flows), docs/ops/INCIDENT... (breach playbooks).
- STACK.md (Supabase Sydney, Edge, EAS for scheduler), 02-mvp (onboarding consent), foundational-docs/04-legal-data-sources.md (pointer), required-docs-manifest (this row).

**Zero blockers test:** New dev reads this + 2 legal MUST + GUARDRAILS + BACKEND first 50 + gap §8, can implement purge Edge + onboarding consent toggle + export button in RN without hunting OAIC/Fair Work or re-deriving retention.

*Full prose + code patterns 2026-05-28 sam/maya per design spec + gap §4 ops/ subdir. All 2026 facts cited with sources/dates. DRY. Implementation-ready for scaffold + first migrations.*