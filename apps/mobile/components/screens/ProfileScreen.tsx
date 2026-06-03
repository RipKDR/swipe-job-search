import { View, Text } from '@/components/tw';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="py-3 border-b border-slate-800/80">
      <Text className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">{label}</Text>
      <Text className="text-white text-base">{value}</Text>
    </View>
  );
}

export function ProfileScreen() {
  const { profile, signOut } = useAuth();

  const roleLabel =
    profile?.role === 'employer' ? 'Employer' : profile?.role === 'candidate' ? 'Job seeker' : '—';

  return (
    <AppScreen scroll centered maxWidth="lg">
      <ScreenHeader
        title="Profile"
        subtitle="Your account details and session"
      />

      <View className="rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-2 mb-8">
        <ProfileRow label="Name" value={profile?.full_name?.trim() || 'Not set'} />
        <ProfileRow label="Email" value={profile?.email?.trim() || '—'} />
        <ProfileRow label="Suburb" value={profile?.suburb?.trim() || '—'} />
        <ProfileRow label="Role" value={roleLabel} />
        {profile?.role === 'candidate' && profile.skills?.length ? (
          <ProfileRow label="Skills" value={profile.skills.join(', ')} />
        ) : null}
      </View>

      <View className="gap-3">
        <Text className="text-slate-500 text-xs text-center">
          Edit profile and preferences are coming in a future update.
        </Text>
        <Button title="Sign out" variant="outline" fullWidth onPress={() => void signOut()} />
      </View>
    </AppScreen>
  );
}
