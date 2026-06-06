import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable } from '@/components/tw';
import { ScrollView, Alert, Linking, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useRadiusPreference } from '@/hooks/useRadiusPreference';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/providers/ThemeProvider';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ThemePicker } from '@/components/ui/ThemePicker';

const STORAGE_KEYS = {
  HAPTICS: 'settings_haptics_enabled',
  NOTIFICATIONS: 'settings_notifications_enabled',
} as const;

interface SettingRowProps {
  label: string;
  description?: string;
  rightElement: React.ReactNode;
}

function SettingRow({ label, description, rightElement }: SettingRowProps) {
  return (
    <View className="flex-row items-center justify-between py-4 px-4 border-b border-slate-800/50">
      <View className="flex-1 mr-4">
        <Text className="text-white text-base">{label}</Text>
        {description ? (
          <Text className="text-slate-400 text-sm mt-0.5">{description}</Text>
        ) : null}
      </View>
      {rightElement}
    </View>
  );
}

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingSection({ title, children }: SettingSectionProps) {
  return (
    <View className="mb-6">
      <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-4 mb-2">
        {title}
      </Text>
      <View className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden">
        {children}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { mode, toggleMode } = useTheme();
  const [hapticsEnabled, setHapticsEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { radiusKm, setRadiusKm } = useRadiusPreference();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Load persisted preferences
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.HAPTICS),
      AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS),
    ]).then(([haptics, notifs]) => {
      if (haptics !== null) setHapticsEnabled(haptics === 'true');
      if (notifs !== null) setNotificationsEnabled(notifs === 'true');
    });
  }, []);

  const toggleHaptics = useCallback(async (value: boolean) => {
    setHapticsEnabled(value);
    await AsyncStorage.setItem(STORAGE_KEYS.HAPTICS, String(value));
    if (value) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  }, []);

  const toggleNotifications = useCallback(async (value: boolean) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, String(value));
    if (!value && user) {
      try {
        await supabase.functions.invoke('notification-processor', {
          body: { action: 'disable-push', userId: user.id },
        });
      } catch {
        // Best-effort: user's preference is already persisted locally
      }
    }
  }, [user]);

  const handleSignOut = useCallback(async () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setIsSigningOut(true);
          try {
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          } catch {
            Alert.alert('Error', 'Could not sign out. Please try again.');
            setIsSigningOut(false);
          }
        },
      },
    ]);
  }, [router]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Coming soon', 'Account deletion will be available in a future update.');
          },
        },
      ],
    );
  }, []);

  const handlePrivacyPolicy = useCallback(() => {
    Linking.openURL('https://hihired.com.au/privacy').catch(() => {});
  }, []);

  const handleTerms = useCallback(() => {
    Linking.openURL('https://hihired.com.au/terms').catch(() => {});
  }, []);

  return (
    <AppScreen scroll centered maxWidth="lg">
      <ScreenHeader
        title="Settings"
        subtitle="Customise your experience"
        onBack={() => router.back()}
      />

      <ScrollView showsVerticalScrollIndicator={false} className="w-full">
        {/* Appearance */}
        <SettingSection title="Appearance">
          <View className="px-4 py-4">
            <Text className="text-white text-base mb-3">Theme</Text>
            <ThemePicker />
          </View>
          <SettingRow
            label="Dark mode"
            description={mode === 'dark' ? 'Dark theme active' : 'Light theme active'}
            rightElement={
              <Switch
                value={mode === 'dark'}
                onValueChange={toggleMode}
                trackColor={{ false: '#334155', true: '#166534' }}
                thumbColor={mode === 'dark' ? '#4ade80' : '#64748b'}
              />
            }
          />
        </SettingSection>

        {/* Interaction */}
        <SettingSection title="Interaction">
          <SettingRow
            label="Haptic feedback"
            description="Vibrate on swipe actions"
            rightElement={
              <Switch
                value={hapticsEnabled}
                onValueChange={toggleHaptics}
                trackColor={{ false: '#334155', true: '#166534' }}
                thumbColor={hapticsEnabled ? '#4ade80' : '#64748b'}
              />
            }
          />
          <SettingRow
            label="Search radius"
            description={radiusKm === 0 ? 'Showing jobs anywhere' : `Within ${radiusKm} km of your location`}
            rightElement={
              <View className="flex-row gap-1.5">
                {[0, 5, 10, 25, 50].map((km) => (
                  <Pressable
                    key={km}
                    onPress={() => setRadiusKm(km)}
                    accessibilityLabel={km === 0 ? 'Anywhere' : `${km} km`}
                    accessibilityRole="button"
                    className={`px-3 py-1.5 rounded-full border ${
                      radiusKm === km
                        ? 'bg-emerald-600/20 border-emerald-500'
                        : 'bg-slate-800/70 border-slate-700/60 active:bg-slate-700/80'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        radiusKm === km ? 'text-emerald-300' : 'text-slate-300'
                      }`}
                    >
                      {km === 0 ? 'Any' : `${km}`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            }
          />
        </SettingSection>

        {/* Notifications */}
        <SettingSection title="Notifications">
          <SettingRow
            label="Push notifications"
            description="Get notified about new matches and messages"
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: '#334155', true: '#166534' }}
                thumbColor={notificationsEnabled ? '#4ade80' : '#64748b'}
              />
            }
          />
        </SettingSection>

        {/* Account */}
        <SettingSection title="Account">
          <Pressable
            onPress={handleSignOut}
            disabled={isSigningOut}
            className="active:opacity-70"
          >
            <View className="py-4 px-4 border-b border-slate-800/50">
              <Text className="text-red-400 text-base">
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={handleDeleteAccount} className="active:opacity-70">
            <View className="py-4 px-4">
              <Text className="text-red-500/70 text-base">Delete account</Text>
            </View>
          </Pressable>
        </SettingSection>

        {/* Legal */}
        <SettingSection title="Legal">
          <Pressable onPress={handlePrivacyPolicy} className="active:opacity-70">
            <View className="py-4 px-4 border-b border-slate-800/50 flex-row items-center justify-between">
              <Text className="text-slate-300 text-base">Privacy policy</Text>
              <Text className="text-slate-600 text-lg">›</Text>
            </View>
          </Pressable>
          <Pressable onPress={handleTerms} className="active:opacity-70">
            <View className="py-4 px-4 flex-row items-center justify-between">
              <Text className="text-slate-300 text-base">Terms of service</Text>
              <Text className="text-slate-600 text-lg">›</Text>
            </View>
          </Pressable>
        </SettingSection>

        {/* Version */}
        <Text className="text-slate-600 text-xs text-center pb-8">
          Hi-Hired v1.0.0
        </Text>
      </ScrollView>
    </AppScreen>
  );
}
