// AuthProvider with session management and profile fetch
// Per AUTH_FLOWS.md adapted for Expo + STACK.md mobile conventions
import React, { createContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { DEV_AUTH_BYPASS, makeDevSession, makeDevProfile } from '@/lib/devAuth';
import { posthog } from '@/lib/posthog';
import { queryClient } from '@/lib/queryClient';
import type { Database } from '@hi-hired/shared';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export const PROFILE_SELECT =
  'id, role, full_name, email, phone, suburb, avatar_url, experience_text, skills, availability_text, work_rights, onboarding_completed_at, bulk_swipe_consent, consent_granted_at, created_at, updated_at';

const PROFILE_FETCH_EVENTS = new Set<AuthChangeEvent>([
  'INITIAL_SESSION',
  'SIGNED_IN',
  'USER_UPDATED',
]);

export type AuthContextType = {
  session: Session | null;
  user: Session['user'] | null;
  profile: Profile | null;
  loading: boolean;
  profileLoadFailed: boolean;
  signOut: () => Promise<void>;
  applyProfile: (profile: Profile) => void;
  retryProfileFetch: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  profileLoadFailed: false,
  signOut: async () => { },
  applyProfile: () => { },
  retryProfileFetch: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(DEV_AUTH_BYPASS ? makeDevSession() : null);
  const [profile, setProfile] = useState<Profile | null>(DEV_AUTH_BYPASS ? makeDevProfile() : null);
  const [loading, setLoading] = useState(!DEV_AUTH_BYPASS);
  const [profileLoadFailed, setProfileLoadFailed] = useState(false);
  const profileEpochRef = useRef(0);

  const user = session?.user ?? null;

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[auth] Profile fetch error:', error);
        return null;
      }

      return data as Profile;
    } catch (err) {
      console.error('[auth] Profile fetch exception:', err);
      return null;
    }
  }, []);

  const applyProfile = useCallback((next: Profile) => {
    profileEpochRef.current += 1;
    setProfile(next);
    setProfileLoadFailed(false);
  }, []);

  const loadProfile = useCallback(
    async (userId: string, epochAtStart: number) => {
      const freshProfile = await fetchProfile(userId);
      if (epochAtStart !== profileEpochRef.current) return;
      if (freshProfile) {
        setProfile(freshProfile);
        setProfileLoadFailed(false);
        if (freshProfile.id) {
          void posthog.identify(freshProfile.id);
        }
      } else {
        setProfile(null);
        setProfileLoadFailed(true);
      }
    }, [fetchProfile]);
  const retryProfileFetch = useCallback(async () => {
    const user = session?.user;
    if (!user) return;
    setProfileLoadFailed(false);
    const epochAtStart = profileEpochRef.current;
    await loadProfile(user.id, epochAtStart);
  }, [session, loadProfile]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[auth] Sign out error:', error);
      throw error;
    }
    void posthog.capture('user_signed_out', {
      user_id: profile?.id ?? undefined,
    });
    void posthog.reset();
    // Clear cached server state so a subsequent login doesn't show stale data
    queryClient.clear();
    setSession(null);
    setProfile(null);
    setProfileLoadFailed(false);
  }, [profile?.id]);

  useEffect(() => {
    // Dev bypass: state is pre-seeded with a mock candidate; skip real auth.
    if (DEV_AUTH_BYPASS) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);

      if (event === 'TOKEN_REFRESHED') {
        setLoading(false);
        return;
      }

      if (!nextSession?.user) {
        setProfile(null);
        setProfileLoadFailed(false);
        setLoading(false);
        return;
      }

      if (PROFILE_FETCH_EVENTS.has(event)) {
        const epochAtStart = profileEpochRef.current;
        void loadProfile(nextSession.user.id, epochAtStart);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      profileLoadFailed,
      signOut,
      applyProfile,
      retryProfileFetch,
    }),
    [session, user, profile, loading, profileLoadFailed, signOut, applyProfile, retryProfileFetch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
