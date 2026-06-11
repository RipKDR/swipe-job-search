import { View, Text, Pressable } from '@/components/tw';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { ThemePicker } from '@/components/ui/ThemePicker';
import { useAuth } from '@/hooks/useAuth';
import { useDeleteAccount } from '@/hooks/useDeleteAccount';
import { useEmployerProfile } from '@/hooks/useEmployerProfile';
import { useSavedJobs } from '@/hooks/useSavedJobs';
import { useTheme } from '@/providers/ThemeProvider';
import { shareResume, type ResumeData } from '@/lib/resume-export';
import { ActiveSeekerBadge } from '@/components/streak/ActiveSeekerBadge';
import { InviteFriendRow } from '@/components/share/InviteFriendRow';
import { ReferralRewardBanner } from '@/components/share/ReferralRewardBanner';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

function ProfileRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '500', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 16 }}>{value}</Text>
    </View>
  );
}

function ActionButton({ label, emoji, onPress, variant = 'outline' }: {
  label: string;
  emoji: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
}) {
  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-70 flex-row items-center gap-3 py-4 px-4 border-b border-slate-800/50"
    >
      <Text className="text-xl">{emoji}</Text>
      <Text className={`text-base flex-1 ${variant === 'primary' ? 'text-indigo-400 font-medium' : 'text-slate-300'}`}>{label}</Text>
      <Text className="text-slate-600 text-lg">›</Text>
    </Pressable>
  );
}

function VerificationBadge() {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    }}>
      <Text style={{ fontSize: 14 }}>✅</Text>
      <Text style={{
        color: '#22c55e',
        fontSize: 13,
        fontWeight: '600',
      }}>
        Verified employer
      </Text>
    </View>
  );
}

export function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const { data: employerProfile, isLoading: employerLoading } = useEmployerProfile(
    profile?.role === 'employer' ? profile.id : undefined,
  );

  // Streak badge state (only for candidates)
  const [streakBadgeEarned, setStreakBadgeEarned] = useState(false);
  const [streakCount, setStreakCount] = useState(0);

  useEffect(() => {
    if (profile?.role !== 'candidate') return;

    // Fetch streak data from the streaks table
     
    const streakQuery = (supabase.from('streaks' as any) as any)
      .select('current_streak, longest_streak')
      .eq('user_id', profile.id)
      .maybeSingle();

    streakQuery.then(({ data, error }: { data: unknown; error: { message: string } | null }) => {
      if (error) {
        console.warn('[profile] streak fetch failed:', error.message);
        return;
      }
      const typed = data as { current_streak: number; longest_streak: number } | null;
      if (typed) {
        setStreakCount(typed.current_streak);
        // Badge earned if longest streak >= 30
        if (typed.longest_streak >= 30) {
          setStreakBadgeEarned(true);
          return;
        }
      }
      // Also check the profiles column as a fallback
       
      (supabase.from('profiles') as any)
        .select('active_seeker_badge_earned')
        .eq('id', profile.id)
        .single()
        .then(({ data: profileData }: { data: { active_seeker_badge_earned: boolean } | null }) => {
          if (profileData?.active_seeker_badge_earned) {
            setStreakBadgeEarned(true);
          }
        });
    });
  }, [profile]);

  const roleLabel =
    profile?.role === 'employer' ? 'Employer' : profile?.role === 'candidate' ? 'Job seeker' : '—';

  const handleEditProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (profile?.role === 'candidate') {
      router.push('/(candidate)/edit-profile' as any);
      return;
    }
    if (profile?.role === 'employer') {
      router.push('/(employer)/edit-profile' as any);
      return;
    }
    Alert.alert('Profile unavailable', 'Please sign in again to edit your profile.');
  };

  const handleShareResume = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (!profile) return;

    const resumeData: ResumeData = {
      full_name: profile.full_name,
      email: profile.email,
      suburb: profile.suburb,
      experience_text: profile.experience_text,
      skills: profile.skills,
      availability_text: profile.availability_text,
      work_rights: profile.work_rights,
    };

    await shareResume(resumeData);
  };

  const handleViewSaved = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/(candidate)/(tabs)/saved' as any);
  };

  const handleViewPricing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/(candidate)/pricing' as any);
  };

  const handleSignOut = () => {
    void signOut();
  };

  const { confirmDeleteAccount, isDeleting } = useDeleteAccount();
  const { savedJobs } = useSavedJobs();

  const isEmployer = profile?.role === 'employer';

  return (
    <AppScreen scroll centered maxWidth="lg">
      <ScreenHeader
        title="Profile"
        subtitle={isEmployer ? 'Your business account details' : 'Your account details and preferences'}
      />

      {/* Account info */}
      <View style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.elevated,
        paddingHorizontal: 20,
        paddingVertical: 8,
        marginBottom: 24,
        width: '100%',
      }}>
        {/* Always show common fields */}
        <ProfileRow label="Name" value={profile?.full_name?.trim() || 'Not set'} />
        <ProfileRow label="Email" value={profile?.email?.trim() || '—'} />
        {!isEmployer && profile?.suburb?.trim() ? (
          <ProfileRow label="Suburb" value={profile.suburb.trim()} />
        ) : null}
        <ProfileRow label="Role" value={roleLabel} />

        {/* Employer-specific fields from employer_profiles table */}
        {isEmployer && (
          <>
            <ProfileRow
              label="Business name"
              value={employerLoading ? 'Loading...' : employerProfile?.business_name?.trim() || 'Not set'}
            />
            {employerProfile?.about_text?.trim() ? (
              <ProfileRow label="About" value={employerProfile.about_text.trim()} />
            ) : null}
            {employerProfile?.contact_name?.trim() ? (
              <ProfileRow label="Contact name" value={employerProfile.contact_name.trim()} />
            ) : null}
            {employerProfile?.verified && (
              <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <VerificationBadge />
              </View>
            )}
          </>
        )}

        {/* Candidate-specific fields */}
        {profile?.role === 'candidate' && (
          <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <ActiveSeekerBadge
              earned={streakBadgeEarned}
              currentStreak={streakCount}
            />
          </View>
        )}
        {profile?.role === 'candidate' && profile.skills?.length ? (
          <ProfileRow label="Skills" value={profile.skills.join(', ')} />
        ) : null}
        {profile?.role === 'candidate' && profile.experience_text ? (
          <ProfileRow label="Experience" value={profile.experience_text} />
        ) : null}
        {profile?.role === 'candidate' && profile.availability_text ? (
          <ProfileRow label="Availability" value={profile.availability_text} />
        ) : null}
      </View>

      {/* Referral reward banner — appears above actions */}
      <View style={{ width: '100%', marginBottom: 4 }}>
        <ReferralRewardBanner location="profile" />
      </View>

      {/* Invite friends section (only for candidates) */}
      {profile?.role === 'candidate' && (
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.elevated,
            width: '100%',
            marginBottom: 24,
            overflow: 'hidden',
          }}
        >
          <InviteFriendRow />
        </View>
      )}

      {/* Actions */}
      <View style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.elevated,
        width: '100%',
        marginBottom: 24,
        overflow: 'hidden',
      }}>
        <ActionButton label="Edit profile" emoji="✏️" onPress={handleEditProfile} />
        {profile?.role === 'candidate' && (
          <ActionButton label="Share my resume" emoji="📄" onPress={handleShareResume} />
        )}
        {profile?.role === 'candidate' && (
          <ActionButton
            label={`Saved Jobs${savedJobs.length > 0 ? ` (${savedJobs.length})` : ''}`}
            emoji="🔖"
            onPress={handleViewSaved}
          />
        )}
        <ActionButton label="Plans & pricing" emoji="💎" onPress={handleViewPricing} />
      </View>

      {/* Theme picker */}
      <View style={{ width: '100%', marginBottom: 24 }}>
        <ThemePicker />
      </View>

      {/* Sign out + delete account */}
      <View style={{ gap: 12, width: '100%' }}>
        <Button title="Sign out" variant="outline" fullWidth onPress={handleSignOut} />
        <Pressable
          onPress={confirmDeleteAccount}
          disabled={isDeleting}
          className="active:opacity-70 items-center py-3"
          accessibilityRole="button"
          accessibilityLabel="Delete account"
        >
          <Text className="text-red-500/70 text-sm">
            {isDeleting ? 'Deleting account…' : 'Delete account'}
          </Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}
