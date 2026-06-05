import React from 'react';
import { View, Text } from '@/components/tw';
import { ScrollView, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: PlanFeature[];
  highlighted?: boolean;
  badge?: string;
}

const PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Everything you need to find casual work',
    features: [
      { text: 'Unlimited job swipes', included: true },
      { text: 'Match with employers', included: true },
      { text: 'In-app chat', included: true },
      { text: 'Push notifications', included: true },
      { text: 'Profile & skills showcase', included: true },
      { text: 'Commute distance badges', included: true },
      { text: 'Priority matching', included: false },
      { text: 'Featured profile', included: false },
      { text: 'Resume PDF export', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9.99',
    period: '/month',
    description: 'Stand out and get hired faster',
    highlighted: true,
    badge: 'COMING SOON',
    features: [
      { text: 'Everything in Free', included: true },
      { text: 'Priority matching — see jobs first', included: true },
      { text: 'Featured profile — top of employer lists', included: true },
      { text: 'Resume PDF export', included: true },
      { text: 'Salary insights & market data', included: true },
      { text: 'Early access to new features', included: true },
      { text: 'Priority support', included: true },
    ],
  },
];

function FeatureRow({ text, included }: PlanFeature) {
  return (
    <View className="flex-row items-center py-1.5">
      <Text className={`text-base mr-3 ${included ? 'text-emerald-400' : 'text-slate-600'}`}>
        {included ? '✓' : '—'}
      </Text>
      <Text className={`text-sm flex-1 ${included ? 'text-slate-200' : 'text-slate-500'}`}>
        {text}
      </Text>
    </View>
  );
}

function PricingCard({ plan, onSelect }: { plan: PricingPlan; onSelect: (id: string) => void }) {

  return (
    <View
      className={`rounded-2xl p-6 mb-4 border ${
        plan.highlighted
          ? 'border-indigo-500/60 bg-indigo-950/40'
          : 'border-slate-800 bg-slate-900/80'
      }`}
    >
      {plan.badge ? (
        <View className="bg-indigo-600 rounded-full px-3 py-1 self-start mb-3">
          <Text className="text-white text-xs font-bold tracking-wider">{plan.badge}</Text>
        </View>
      ) : null}

      <Text className="text-white text-2xl font-bold">{plan.name}</Text>

      <View className="flex-row items-baseline mt-2 mb-1">
        <Text className={`text-4xl font-bold ${plan.highlighted ? 'text-indigo-400' : 'text-white'}`}>
          {plan.price}
        </Text>
        <Text className="text-slate-400 text-base ml-1">{plan.period}</Text>
      </View>

      <Text className="text-slate-400 text-sm mb-4">{plan.description}</Text>

      <View className="border-t border-slate-800/50 pt-4 mb-5">
        {plan.features.map((feature, i) => (
          <FeatureRow key={i} {...feature} />
        ))}
      </View>

      <Button
        title={plan.id === 'free' ? 'Current plan' : 'Notify me when available'}
        variant={plan.highlighted ? 'primary' : 'outline'}
        fullWidth
        disabled={plan.id === 'free'}
        onPress={() => onSelect(plan.id)}
      />
    </View>
  );
}

export default function PricingScreen() {
  const router = useRouter();

  const handleSelect = (planId: string) => {
    if (planId === 'free') return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    Alert.alert(
      'Coming soon',
      "We're working on Hi-Hired Pro. We'll notify you when it's ready!",
      [
        { text: 'OK' },
        {
          text: 'Learn more',
          onPress: () => Linking.openURL('https://hihired.com.au/pro').catch(() => {}),
        },
      ],
    );
  };

  return (
    <AppScreen scroll centered maxWidth="lg">
      <ScreenHeader
        title="Plans"
        subtitle="Choose the right plan for your job search"
        onBack={() => router.back()}
      />

      <ScrollView showsVerticalScrollIndicator={false} className="w-full">
        <View className="mb-6">
          <Text className="text-slate-400 text-center text-sm mb-6">
            Hi-Hired is free to use. Pro features coming soon.
          </Text>

          {PLANS.map((plan) => (
            <PricingCard key={plan.id} plan={plan} onSelect={handleSelect} />
          ))}
        </View>

        <View className="bg-slate-900/50 rounded-2xl border border-slate-800 p-5 mb-8">
          <Text className="text-white font-semibold text-base mb-2">Frequently asked</Text>
          <View className="gap-4">
            <View>
              <Text className="text-slate-300 text-sm font-medium">Can I cancel anytime?</Text>
              <Text className="text-slate-500 text-sm mt-1">
                Yes — Pro subscriptions can be cancelled anytime through your app store account. No lock-in contracts.
              </Text>
            </View>
            <View>
              <Text className="text-slate-300 text-sm font-medium">What happens to my matches if I downgrade?</Text>
              <Text className="text-slate-500 text-sm mt-1">
                All existing matches and chats are preserved. You just lose priority placement and Pro-only features.
              </Text>
            </View>
            <View>
              <Text className="text-slate-300 text-sm font-medium">Is there a free trial?</Text>
              <Text className="text-slate-500 text-sm mt-1">
                When Pro launches, we&apos;ll offer a 7-day free trial so you can experience the difference.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </AppScreen>
  );
}
