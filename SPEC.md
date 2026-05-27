# Technical Specification - Swipe Job Search

> ⚠️ **Superseded (stack & schema):** This doc reflects the original Next.js + Capacitor direction. **Canonical stack:** [`STACK.md`](STACK.md). **Canonical backend:** [`docs/BACKEND.md`][def]. Product scope remains valid in [`foundational-docs/02-mvp-definition.md`](foundational-docs/02-mvp-definition.md). Kept for historical reference — do not scaffold from §1–§6 without reconciling against canonical docs.

## 1. Tech Stack
- **Framework:** Next.js 14+ (App Router).
- **Language:** TypeScript.
- **Styling:** Tailwind CSS + Framer Motion (for the physics-based swipe).
- **Database/Auth:** Supabase (Auth, PostgreSQL, Realtime for Chat).
- **Media:** Supabase Storage (for Profile/Job images).
- **Icons:** Lucide React.

## 2. Component Architecture
- `SwipeDeck`: The container handling the stack logic and `AnimatePresence`.
- `JobCard`: The individual card with job details and gestures.
- `ActionButtons`: Explicit "Pass", "Apply", and "Super" buttons for desktop users.
- `MatchOverlay`: A "Success" modal when a match is detected.
- `ChatRoom`: Real-time messaging component.

## 3. Data Schema
- `profiles`: id, user_id, type (candidate|recruiter), bio, images[], data (JSONB).
- `jobs`: id, recruiter_id, title, company, salary, location, description, tags[].
- `swipes`: id, swiper_id, target_id (job_id or candidate_id), direction (left|right|up), created_at.
- `matches`: id, candidate_id, job_id, created_at.
- `messages`: id, match_id, sender_id, text, created_at.

## 4. Guardrails & Performance
- **Optimistic UI:** Every swipe must update the local deck immediately before the network call finishes.
- **Pagination:** Cards are fetched in batches of 20 to keep initial load low.
- **RLS:** Only authenticated users can swipe. Only matched users can chat.

## 5. Complete RLS Policies

```sql
-- Enable RLS on all tables
alter table profiles enable row level security;
alter table jobs enable row level security;
alter table swipes enable row level security;
alter table matches enable row level security;
alter table messages enable row level security;
alter table streaks enable row level security;

-- Profiles: own row only
create policy "profiles_own" on profiles
  for all using (auth.uid() = user_id);

-- Jobs: all authenticated users can read; only recruiters can write
create policy "jobs_read" on jobs
  for select using (auth.role() = 'authenticated');
create policy "jobs_insert" on jobs
  for insert with check (
    exists (select 1 from profiles where user_id = auth.uid() and type = 'recruiter')
  );
create policy "jobs_update" on jobs
  for update using (recruiter_id = auth.uid());
create policy "jobs_delete" on jobs
  for delete using (recruiter_id = auth.uid());

-- Swipes: users insert only their own; read own swipes only
create policy "swipes_insert" on swipes
  for insert with check (swiper_id = auth.uid());
create policy "swipes_read" on swipes
  for select using (swiper_id = auth.uid());

-- Matches: participants only (candidate or recruiter who owns the job)
create policy "matches_read" on matches
  for select using (
    candidate_id = auth.uid() or
    exists (select 1 from jobs where id = job_id and recruiter_id = auth.uid())
  );

-- Messages: match participants only
create policy "messages_all" on messages
  for all using (
    exists (
      select 1 from matches m
      where m.id = match_id
      and (
        m.candidate_id = auth.uid() or
        exists (select 1 from jobs j where j.id = m.job_id and j.recruiter_id = auth.uid())
      )
    )
  );

-- Streaks: own row only
create policy "streaks_own" on streaks
  for all using (user_id = auth.uid());
```

## 6. Edge Function Specs

### `match-notification` — fires when a match row is inserted
- **Trigger:** DB trigger on `matches` INSERT
- **Input:** `{ match_id, candidate_id, job_id }`
- **Actions:** Push to candidate + recruiter via OneSignal; Realtime broadcast
- **Full spec:** See `NOTIFICATIONS.md`

### `check-match` — called by swipe API to detect reciprocal interest
- **Trigger:** HTTP POST from `/api/swipe` after `direction=right` swipe
- **Input:** `{ swiper_id, target_id, swiper_type: 'candidate'|'recruiter' }`
- **Logic:** Query swipes table for reciprocal swipe; if found, insert into matches
- **Output:** `{ matched: boolean, match_id?: string }`

### `compliance-export` — weekly provider report generation
- **Trigger:** Cron (every Monday 7:00 AEDT) + manual POST
- **Input:** `{ provider_id, week_start: ISO date }`
- **Actions:** Aggregate candidate swipes/matches/hires → generate PDF via `@react-pdf/renderer` → upload to Supabase Storage → email link to provider admin
- **Output:** `{ report_url: string, candidate_count: number, activities_logged: number }`

### `update-streak` — updates daily streak after swipes
- **Trigger:** DB trigger on `swipes` INSERT
- **Input:** `{ user_id, swipe_date }`
- **Logic:** Upsert into `streaks` table; check if consecutive day; trigger milestone push if threshold hit

## 7. API Route Error Schema

All API routes return consistent error objects:

```typescript
// Standard error response shape
type ApiError = {
  error: string        // human-readable message
  code: string         // machine-readable code
  status: number       // HTTP status
}

// Error codes
'UNAUTHORIZED'         // 401 — no valid session
'FORBIDDEN'            // 403 — authenticated but no permission
'NOT_FOUND'            // 404 — resource doesn't exist
'VALIDATION_ERROR'     // 422 — invalid input
'DUPLICATE_SWIPE'      // 409 — swipe already exists (handled via upsert, rarely thrown)
'RATE_LIMITED'         // 429 — too many requests
'INTERNAL_ERROR'       // 500 — unexpected server error
```

## 8. Image Upload Constraints

- **Profile photos:** max 5MB per image, JPEG/PNG/WEBP, min 400x400px, max 4 per profile
- **Job card photos:** max 5MB per image, JPEG/PNG/WEBP, min 800x600px, max 4 per job
- **Storage buckets:** `profile-photos` (public), `job-photos` (public), `compliance-reports` (private, provider-only RLS)
- **Transformations:** Supabase Image Transformation used for thumbnails — `?width=400&quality=75` for deck cards


[def]: docs/BACKEND.md
