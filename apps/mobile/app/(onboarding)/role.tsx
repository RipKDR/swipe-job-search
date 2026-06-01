import { View } from '@/components/tw';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { usePostHog } from '@/hooks/usePostHog';
import { Button } from '@/components/ui/Button';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { SelectionTile } from '@/components/onboarding/SelectionTile';
import { getOnboardingRouteForRole } from '@/lib/onboarding-submit';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function RoleSelection() {
  const router = useRouter();
  const posthog = usePostHog();
  const { user, applyProfile } = useAuth();
  const [selected, setSelected] = useState<'candidate' | 'employer' | 'provider' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!selected) return;
    posthog.capture('role_selected', { role: selected });

    // Provider onboarding: skip profile screen, update role directly
    if (selected === 'provider') {
      if (!user) return;
      setSubmitting(true);
      try {
        await supabase
          .from('profiles')
          .update({
            role: 'provider',
            onboarding_completed_at: new Date().toISOString(),
          })
          .eq('id', user.id);
        await applyProfile();
        router.replace('/(provider)/compliance');
      } catch {
        // fall through to route-based redirect if update fails
        router.push('/(provider)/compliance' as any);
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
        <Button title="Continue" fullWidth disabled={!selected || submitting} onPress={handleContinue} />
      }
    >
      <View className="gap-3">
        <SelectionTile
          title="I'm looking for work"
          description="Swipe on local jobs, match with employers, and get hired faster."
          selected={selected === 'candidate'}
          onPress={() => setSelected('candidate')}
        />
        <SelectionTile
          title="I'm hiring"
          description="Post roles, review interested candidates, and hire the right fit."
          selected={selected === 'employer'}
          onPress={() => setSelected('employer')}
        />
        <SelectionTile
          title="I'm a provider / mentor"
          description="Manage candidates, generate compliance reports, and track placements."
          selected={selected === 'provider'}
          onPress={() => setSelected('provider')}
        />
      </View>
    </OnboardingShell>
  );
}
