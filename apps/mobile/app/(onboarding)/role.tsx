import { View } from '@/components/tw';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { usePostHog } from '@/hooks/usePostHog';
import { Button } from '@/components/ui/Button';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { SelectionTile } from '@/components/onboarding/SelectionTile';
import { getOnboardingRouteForRole } from '@/lib/onboarding-submit';

export default function RoleSelection() {
  const router = useRouter();
  const posthog = usePostHog();
  const [selected, setSelected] = useState<'candidate' | 'employer' | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    posthog.capture('role_selected', { role: selected });
    router.push(getOnboardingRouteForRole(selected) as any);
  };

  return (
    <OnboardingShell
      title="Welcome to Hi-Hired"
      subtitle="Choose how you want to use the app. Role changes later need support."
      step={1}
      totalSteps={2}
      footer={
        <Button title="Continue" fullWidth disabled={!selected} onPress={handleContinue} />
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
      </View>
    </OnboardingShell>
  );
}
