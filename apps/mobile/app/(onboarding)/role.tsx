import { Text, View } from '@/components/tw';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { usePostHog } from '@/hooks/usePostHog';
import { Button } from '@/components/ui/Button';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { SelectionTile } from '@/components/onboarding/SelectionTile';
import { buildProviderProfileUpdate, getOnboardingRouteForRole } from '@/lib/onboarding-submit';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { PROFILE_SELECT, type Profile } from '@/providers/AuthProvider';

export default function RoleSelection() {
  const router = useRouter();
  const posthog = usePostHog();
  const { user, applyProfile } = useAuth();
  const [selected, setSelected] = useState<'candidate' | 'employer' | 'provider' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectRole = (role: 'candidate' | 'employer' | 'provider') => {
    setSelected(role);
    setErrorMessage(null);
  };

  const handleContinue = async () => {
    if (!selected) return;
    posthog.capture('role_selected', { role: selected });

    // Provider onboarding: skip profile screen, update role directly
    if (selected === 'provider') {
      if (!user) {
        setErrorMessage('You need to sign in before activating provider mode.');
        return;
      }
      setSubmitting(true);
      setErrorMessage(null);
      const providerRoute = getOnboardingRouteForRole('provider');
      try {
        const { data: updatedProfile, error } = await supabase.from('profiles')
          .update(buildProviderProfileUpdate(new Date().toISOString()))
          .eq('id', user.id)
          .select(PROFILE_SELECT)
          .single();
        if (error) throw error;
        if (!updatedProfile) throw new Error('Provider profile update returned no row');
        applyProfile(updatedProfile as Profile);
        router.replace(providerRoute as any);
      } catch (error) {
        console.error('[onboarding] Provider role update error:', error);
        setErrorMessage('Could not activate provider mode. Please try again.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    router.push(getOnboardingRouteForRole(selected) as any);
  };

  return (
    <OnboardingShell
      title="Welcome to Hi-Hired"
      subtitle="Choose how you want to use the app. Role changes later need support."
      step={1}
      totalSteps={2}
      footer={
        <Button title="Continue" fullWidth disabled={!selected || submitting} loading={submitting} onPress={handleContinue} />
      }
    >
      <View className="gap-3">
        <SelectionTile
          title="I'm looking for work"
          description="Swipe on local jobs, match with employers, and get hired faster."
          selected={selected === 'candidate'}
          onPress={() => selectRole('candidate')}
        />
        <SelectionTile
          title="I'm hiring"
          description="Post roles, review interested candidates, and hire the right fit."
          selected={selected === 'employer'}
          onPress={() => selectRole('employer')}
        />
        <SelectionTile
          title="I'm a provider / mentor"
          description="Manage candidates, generate compliance reports, and track placements."
          selected={selected === 'provider'}
          onPress={() => selectRole('provider')}
        />
        {errorMessage ? (
          <Text accessibilityRole="alert" className="text-sm text-red-300">
            {errorMessage}
          </Text>
        ) : null}
      </View>
    </OnboardingShell>
  );
}
