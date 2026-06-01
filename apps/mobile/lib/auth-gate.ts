type Role = 'candidate' | 'employer' | 'provider' | null;

type GateSession = { user: { id: string } } | null;
type GateProfile = {
  role: Role;
  onboarding_completed_at: string | null;
} | null;

type AuthGateInput = {
  loading: boolean;
  session: GateSession;
  profile: GateProfile;
  segments: string[];
};

export function resolveAuthRedirect({
  loading,
  session,
  profile,
  segments,
}: AuthGateInput): string | null {
  if (loading) return null;

  const inAuth = segments[0] === '(auth)';
  const inOnboarding = segments[0] === '(onboarding)';

  if (!session && !inAuth) {
    return '/(auth)/login';
  }

  if (session && !profile && !inAuth) {
    return null;
  }

  if (!session || !profile) {
    return null;
  }

  if (!profile.onboarding_completed_at && !inOnboarding && !inAuth) {
    return '/(onboarding)/role';
  }

  if (profile.onboarding_completed_at && inAuth) {
    if (profile.role === 'candidate') return '/(candidate)/(tabs)/deck';
    if (profile.role === 'employer') return '/(employer)/(tabs)/jobs';
    if (profile.role === 'provider') return '/(provider)/compliance';
    return '/(onboarding)/role';
  }

  if (profile.onboarding_completed_at && inOnboarding) {
    if (profile.role === 'candidate') return '/(candidate)/(tabs)/deck';
    if (profile.role === 'employer') return '/(employer)/(tabs)/jobs';
    if (profile.role === 'provider') return '/(provider)/compliance';
  }

  return null;
}
