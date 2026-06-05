// Dev-only auth bypass.
// When EXPO_PUBLIC_DEV_AUTH_BYPASS=true (and not a production build), the
// AuthProvider seeds a mock authenticated candidate so the app skips the login
// wall and routes straight to the role home. Never enable in production.
import type { Session } from '@supabase/supabase-js';
import type { Database } from '@hi-hired/shared';

type Profile = Database['public']['Tables']['profiles']['Row'];

export const DEV_AUTH_BYPASS =
  process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS === 'true' &&
  process.env.EXPO_PUBLIC_APP_ENV !== 'production';

// Stable fake UUID so cached state stays consistent across reloads.
const DEV_USER_ID = '00000000-0000-4000-8000-000000000001';

export function makeDevSession(): Session {
  const nowSec = Math.floor(Date.now() / 1000);
  return {
    access_token: 'dev-bypass-access-token',
    refresh_token: 'dev-bypass-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: nowSec + 3600,
    user: {
      id: DEV_USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'dev@hi-hired.local',
      phone: '',
      app_metadata: { provider: 'dev', providers: ['dev'] },
      user_metadata: { full_name: 'Dev Candidate' },
      identities: [],
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
    },
  } as Session;
}

export function makeDevProfile(): Profile {
  const ts = new Date().toISOString();
  return {
    id: DEV_USER_ID,
    role: 'candidate',
    full_name: 'Dev Candidate',
    email: 'dev@hi-hired.local',
    phone: null,
    suburb: 'Melbourne VIC',
    avatar_url: null,
    experience_text: 'Dev bypass account — no real data.',
    skills: [],
    availability_text: 'Available anytime',
    work_rights: null,
    onboarding_completed_at: ts,
    bulk_swipe_consent: false,
    consent_granted_at: null,
    created_at: ts,
    updated_at: ts,
  } as Profile;
}
