# Employer Edit Profile Flow

Date: 2026-06-04
Repo: `/home/admin/swipe-job-search`

## Intent

Replace the employer profile dead end (`Edit profile` → "Coming soon") with a real edit screen so employers can update the business details candidates and candidates' employers rely on: business name, suburb, contact name, about text, and logo/avatar URL.

## Constraints

- Expo Router / React Native / TypeScript, no new dependencies.
- Reuse `EmployerProfileForm` and `EmployerOnboardingSchema` where safe.
- Follow existing candidate edit profile pattern.
- Update both `profiles` and `employer_profiles`.
- Keep Supabase casts isolated at the call boundary with `(supabase as any)`.
- Invalidate/refetch employer profile cache after mutation.
- Do not change candidate edit behavior.

## Data Contract

Inputs from form (`EmployerOnboarding`):
- `business_name`
- `suburb`
- `contact_name`
- `about_text?`
- `avatar_url?`

Writes:
- `profiles`: `suburb`, `avatar_url`, `updated_at`
- `employer_profiles`: `profile_id`, `business_name`, `contact_name`, `about_text`, `updated_at`

Reads:
- `useAuth().profile` for base profile fields
- `useEmployerProfile(profile.id)` for business fields

## Technical Schema

- Add pure helper to `lib/onboarding-submit.ts` for employer profile upsert/update payload including `about_text`.
- Add or extend tests in `app/(onboarding)/__tests__/onboarding-flow.test.tsx` so helper behavior is covered before UI work.
- Create `app/(employer)/edit-profile.tsx` using `AppScreen`, `ScreenHeader`, `EmployerProfileForm`, `Button`.
- Patch `ProfileScreen.handleEditProfile()` to route employers to `/(employer)/edit-profile` instead of alert.
- Use `queryClient.invalidateQueries({ queryKey: ['employer-profile', profile.id] })` after successful save.
- Capture PostHog event: `employer_profile_updated`.

## Success Criteria

- Employer tapping Edit Profile opens the edit screen.
- Form prepopulates from `profiles` + `employer_profiles`.
- Save updates both tables and refreshes local/cached state.
- Missing employer profile row is created via upsert.
- Existing candidate edit profile still routes unchanged.
- Targeted helper tests pass; full Vitest may retain known Expo native-module baseline failures.
