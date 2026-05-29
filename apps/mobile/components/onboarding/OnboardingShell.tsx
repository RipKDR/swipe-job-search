import { View, Text } from '@/components/tw';
import { AppScreen } from '@/components/ui/AppScreen';
import { fluidSubtitle, fluidTitle, pageGap } from '@/lib/responsive-layout';
import type { ReactNode } from 'react';

type OnboardingShellProps = {
  title: string;
  subtitle: string;
  step?: number;
  totalSteps?: number;
  children: ReactNode;
  footer?: ReactNode;
};

function StepIndicator({ step, totalSteps }: { step: number; totalSteps: number }) {
  return (
    <View className="mb-6" accessibilityRole="progressbar">
      <Text className="text-indigo-400 text-xs font-semibold tracking-wide uppercase mb-3">
        Step {step} of {totalSteps}
      </Text>
      <View className="flex-row gap-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <View
            key={i}
            className={`h-1 flex-1 rounded-full ${i < step ? 'bg-indigo-500' : 'bg-slate-800'}`}
          />
        ))}
      </View>
    </View>
  );
}

export function OnboardingShell({
  title,
  subtitle,
  step,
  totalSteps,
  children,
  footer,
}: OnboardingShellProps) {
  const showSteps = step != null && totalSteps != null && totalSteps > 0;

  return (
    <AppScreen scroll centered maxWidth="md" footer={footer}>
      {showSteps && totalSteps != null && step != null ? (
        <StepIndicator step={step} totalSteps={totalSteps} />
      ) : null}
      <View className="mb-6 sm:mb-8">
        <Text className={`${fluidTitle} mb-2`}>{title}</Text>
        <Text className={fluidSubtitle}>{subtitle}</Text>
      </View>
      <View className={pageGap}>{children}</View>
    </AppScreen>
  );
}
