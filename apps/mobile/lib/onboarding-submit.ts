import type { CandidateOnboarding, Database, EmployerOnboarding } from '@hi-hired/shared';

export type OnboardingRole = 'candidate' | 'employer' | 'provider';
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export function getOnboardingRouteForRole(role: OnboardingRole): string {
  if (role === 'candidate') return '/(onboarding)/candidate-profile';
  if (role === 'provider') return '/(provider)/compliance';
  return '/(onboarding)/employer-profile';
}

export function buildCandidateProfileUpdate(
  data: CandidateOnboarding,
  nowIso: string
) {
  return {
    role: 'candidate' as const,
    full_name: data.full_name,
    suburb: data.suburb,
    experience_text: data.experience_text,
    skills: data.skills,
    availability_text: data.availability_text,
    work_rights: data.work_rights,
    avatar_url: data.avatar_url ?? null,
    onboarding_completed_at: nowIso,
  };
}

export function buildEmployerProfileUpdate(
  data: EmployerOnboarding,
  nowIso: string
) {
  return {
    role: 'employer' as const,
    suburb: data.suburb,
    avatar_url: data.avatar_url ?? null,
    onboarding_completed_at: nowIso,
  };
}

export function buildProviderProfileUpdate(nowIso: string): ProfileUpdate {
  return {
    role: 'provider',
    onboarding_completed_at: nowIso,
  };
}

export function buildEmployerProfileInsert(
  userId: string,
  data: EmployerOnboarding
) {
  return {
    profile_id: userId,
    business_name: data.business_name,
    contact_name: data.contact_name || null,
    about_text: data.about_text || null,
  };
}

export function buildEmployerProfileDetailsUpdate(
  data: EmployerOnboarding,
  nowIso: string
) {
  return {
    business_name: data.business_name,
    contact_name: data.contact_name || null,
    about_text: data.about_text || null,
    updated_at: nowIso,
  };
}
