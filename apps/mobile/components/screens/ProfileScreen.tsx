import { View, Text, Pressable } from '@/components/tw';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { ThemePicker } from '@/components/ui/ThemePicker';
import { useAuth } from '@/hooks/useAuth';
import { useEmployerProfile } from '@/hooks/useEmployerProfile';
import { useTheme } from '@/providers/ThemeProvider';
import { shareResume, type ResumeData } from '@/lib/resume-export';
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
  const { colors } = useTheme();
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    }}>
      <Text style={{ fontSize: 14 }}>✅</Text>
      <Text style={{
        color: colors.success || '#22c55e',
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

  const handleViewPricing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/(candidate)/pricing');
  };

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
        <ActionButton label="Plans & pricing" emoji="💎" onPress={handleViewPricing} />
      </View>

      {/* Theme picker */}
      <View style={{ width: '100%', marginBottom: 24 }}>
        <ThemePicker />
      </View>

      {/* Sign out */}
      <View style={{ gap: 12, width: '100%' }}>
        <Button title="Sign out" variant="outline" fullWidth onPress={() => void signOut()} />
      </View>
    </AppScreen>
  );
}
