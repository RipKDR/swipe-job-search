import type {
  CandidateOnboardingInput,
  EmployerOnboardingInput,
} from '@hi-hired/shared';

export type OnboardingRole = 'candidate' | 'employer';

export function getOnboardingRouteForRole(role: OnboardingRole): string {
  return role === 'candidate'
    ? '/(onboarding)/candidate-profile'
    : '/(onboarding)/employer-profile';
}

export function buildCandidateProfileUpdate(
  data: CandidateOnboardingInput,
  nowIso: string
) {
  return {
    role: 'candidate',
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
  data: EmployerOnboardingInput,
  nowIso: string
) {
  return {
    role: 'employer',
    suburb: data.suburb,
    avatar_url: data.avatar_url ?? null,
    onboarding_completed_at: nowIso,
  };
}

export function buildEmployerProfileInsert(
  userId: string,
  data: EmployerOnboardingInput
) {
  return {
    profile_id: userId,
    business_name: data.business_name,
    contact_name: data.contact_name || null,
  };
}
