// AuthProvider with session management and profile fetch
// Per AUTH_FLOWS.md adapted for Expo + STACK.md mobile conventions
import React, { createContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Database } from '@hi-hired/shared';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export const PROFILE_SELECT =
  'id, role, full_name, email, phone, suburb, avatar_url, experience_text, skills, availability_text, work_rights, onboarding_completed_at, created_at, updated_at';

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
  signOut: () => Promise<void>;
  applyProfile: (profile: Profile) => void;
};

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  applyProfile: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
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
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[auth] Sign out error:', error);
      throw error;
    }
    setSession(null);
    setProfile(null);
  }, []);

  useEffect(() => {
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
        setLoading(false);
        return;
      }

      if (PROFILE_FETCH_EVENTS.has(event)) {
        const epochAtStart = profileEpochRef.current;
        void fetchProfile(nextSession.user.id).then((freshProfile) => {
          if (epochAtStart !== profileEpochRef.current) return;
          setProfile(freshProfile);
        });
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      signOut,
      applyProfile,
    }),
    [session, user, profile, loading, signOut, applyProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
