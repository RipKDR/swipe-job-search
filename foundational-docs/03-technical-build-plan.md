# Technical Build Plan — SwipeJobs Melbourne

## Recommended Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Mobile** | Expo (React Native) + TypeScript | Fastest path to iOS/Android MVP; one codebase |
| **Styling** | NativeWind (Tailwind for RN) | Familiar, productive, consistent |
| **Admin web** | Next.js 15 + TypeScript + Tailwind | Rapid admin UI, easy SSR when needed |
| **Backend** | Supabase (Auth, Postgres, Storage, RLS) | Auth+DB+storage+RLS in one; generous free tier; Sydney region |
| **State / data** | TanStack Query | Server-state management, cache, refetch |
| **Forms** | React Hook Form + Zod | Validation, type safety |
| **Maps** | react-native-maps (Apple/Google Maps) | Location display on job details |
| **Location** | Expo Location API | Candidate suburb/radius on onboarding |
| **Push** | Expo Notifications | Phase 2 feature |
| **Hosting** | Vercel (admin web) + Supabase (backend) | Minimal DevOps, generous free tier |
| **Repo** | Monorepo (pnpm workspaces or turborepo) | Shared types, one version, clean separation |

## Monorepo Structure

```
/apps
  /mobile          — Expo React Native app
  /admin           — Next.js employer/admin dashboard
/packages
  /shared          — Shared TypeScript types, constants, validation schemas
/supabase
  /migrations      — SQL migrations
  /seed            — Seed data SQL/scripts
/docs
  /planning        — Planning docs (this folder)
  /spec            — Future spec docs
CLAUDE.md
PROJECT_CONTEXT.md
README.md
package.json       — Workspace root
turbo.json         — (optional) Turborepo config
```

## Data Model (Supabase)

### Tables

#### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | References auth.users |
| role | text | 'candidate' or 'employer' |
| full_name | text | |
| email | text | |
| phone | text | Nullable |
| suburb | text | Melbourne suburb |
| latitude | float | |
| longitude | float | |
| avatar_url | text | Nullable |
| created_at | timestamptz | |

#### `candidate_preferences`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK → profiles.id | |
| categories | text[] | Array of work categories |
| availability | jsonb | Days/times available |
| min_pay | numeric | Minimum hourly rate |
| employment_types | text[] | casual, part-time, temp |
| work_rights | text | citizen, pr, visa, student |
| experience_level | text | none, some, experienced |
| created_at | timestamptz | |

#### `employers`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | Business name |
| description | text | |
| website | text | Nullable |
| contact_email | text | |
| contact_phone | text | Nullable |
| verified | boolean | Admin-verified employer |
| owner_id | uuid FK → profiles.id | |
| created_at | timestamptz | |

#### `jobs`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| employer_id | uuid FK → employers.id | Nullable for manual/sourced jobs |
| title | text | |
| description | text | |
| category | text | hospitality, retail, warehouse, events, cleaning, student |
| employment_type | text | casual, part-time, temp, full-time |
| suburb | text | |
| address_text | text | |
| latitude | float | |
| longitude | float | |
| pay_min | numeric | |
| pay_max | numeric | Nullable |
| pay_type | text | hourly, weekly, per_shift |
| shift_summary | text | e.g. "Weekend evening shifts" |
| requirements | text | Nullable |
| status | text | active, filled, expired, draft |
| source_type | text | direct_employer, manual_admin, adzuna, api_partner |
| source_name | text | Name of source |
| source_url | text | Original listing URL |
| external_id | text | ID from source system |
| expires_at | timestamptz | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `job_swipes`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK → profiles.id | |
| job_id | uuid FK → jobs.id | |
| action | text | interested, skipped, saved |
| created_at | timestamptz | |

Unique constraint on (user_id, job_id) — one swipe per job per user.

#### `applications`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK → profiles.id | |
| job_id | uuid FK → jobs.id | |
| status | text | interested, shortlisted, rejected, contacted, hired, closed |
| employer_note | text | Nullable — internal employer note |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Unique constraint on (user_id, job_id).

#### `employer_notes`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| employer_id | uuid FK → employers.id | |
| candidate_user_id | uuid FK → profiles.id | |
| job_id | uuid FK → jobs.id | |
| note | text | |
| created_at | timestamptz | |

### Indexes
- jobs: (status, category, suburb, created_at)
- job_swipes: (user_id, job_id)
- applications: (user_id, job_id)
- applications: (job_id, status)

### RLS Policies (summary)
- Candidates: read own profile, create/read own swipes, read/swipe on active jobs
- Employers: CRUD own jobs, read applicants for own jobs, create employer notes
- Admins: full access

## Implementation Phases

### Phase 0: Repo Scaffold
- Create monorepo structure
- pnpm workspaces / turborepo
- Add Expo + Next.js apps
- Add shared package with types
- Set up ESLint, Prettier, TypeScript config
- Add Supabase migrations + seed
- Write README with setup instructions
- Commit scaffold

### Phase 1: Auth + Database
- Supabase Auth setup (email/password + magic link)
- Run all migrations
- Write RLS policies
- Create seed data (20-30 Melbourne jobs + demo employers)
- Verify with Supabase local or cloud

### Phase 2: Candidate Mobile App
- Onboarding flow (role selection, profile, preferences)
- Swipe deck (fetch active jobs, swipe interaction)
- Job detail screen
- Save + interested actions
- Saved jobs list
- Applications / matches screen
- Profile editing

### Phase 3: Employer Admin Web
- Login flow
- Job CRUD (create, edit, deactivate)
- Applicant management (list, shortlist, reject, contact)
- Basic dashboard (job stats)

### Phase 4: Integration + Polish
- Empty states, loading states, error handling
- Form validation
- Melbourne suburb picker
- Location-based sorting
- Undo swipe
- Employer verification badge
- Source attribution display

### Phase 5: QA + Launch Prep
- End-to-end flow testing
- Edge case handling
- App store preparation (if launching to stores)
- Performance review
- Security review

## Local Development Setup

```bash
# Prerequisites
node >= 20
pnpm >= 8
Expo CLI

# Clone and install
git clone <repo-url>
cd swipejobs-melbourne
pnpm install

# Supabase setup
# Option A: Local Supabase (docker)
npx supabase start
# Option B: Cloud project
# Set SUPABASE_URL and SUPABASE_ANON_KEY in .env

# Run apps
pnpm --filter mobile dev     # Expo dev server
pnpm --filter admin dev      # Next.js dev server on :3000
```

## Deferred Technical Decisions

| Decision | Current State | Future Trigger |
|----------|--------------|----------------|
| CI/CD | Manual deploy | On first paying employer |
| Native build | Expo dev client | Before TestFlight/beta |
| Sentry/monitoring | Not included | Before paid launch |
| E2E tests (Playwright/Detox) | Manual QA only | Before public beta |
| Notifications | Not building | After 50+ DAU on swipe deck |
| Analytics (PostHog) | Deferred | On beta launch |
| Payments (Stripe) | Deferred | On employer monetisation |
| API rate limiting | Supabase default | At scale |
