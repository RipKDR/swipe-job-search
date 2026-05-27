// Login screen with magic link, Google, and Apple sign-in
// Per AUTH_FLOWS.md adapted for Expo + STACK.md OAuth via WebBrowser
import { View, Text, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

// Required for OAuth to work properly
WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleMagicLink = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = Constants.expoConfig?.scheme
        ? `${Constants.expoConfig.scheme}://auth/callback`
        : 'hi-hired://auth/callback';

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        setMagicLinkSent(true);
        Alert.alert(
          'Check your email',
          'We sent you a magic link. Click it to sign in.'
        );
      }
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      console.error('[login] Magic link error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setLoading(true);
    try {
      const redirectUrl = Constants.expoConfig?.scheme
        ? `${Constants.expoConfig.scheme}://auth/callback`
        : 'hi-hired://auth/callback';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === 'cancel') {
          Alert.alert('Cancelled', 'Sign in was cancelled');
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      console.error(`[login] ${provider} OAuth error:`, err);
    } finally {
      setLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950 p-6">
        <Text className="text-white text-2xl font-bold mb-4">Check your email</Text>
        <Text className="text-slate-400 text-center mb-8">
          We sent a magic link to {email}.{'\n'}
          Click it to sign in.
        </Text>
        <Pressable
          onPress={() => {
            setMagicLinkSent(false);
            setEmail('');
          }}
          className="border border-slate-700 px-6 py-3 rounded-xl active:bg-slate-900"
        >
          <Text className="text-white font-semibold">Try different email</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-slate-950 p-6">
      <View className="w-full max-w-sm">
        <Text className="text-white text-4xl font-bold mb-2 text-center">Hi-Hired</Text>
        <Text className="text-slate-400 mb-8 text-center">
          Find your next job, one swipe at a time
        </Text>

        <View className="mb-6">
          <Text className="text-white text-sm font-semibold mb-2">Email</Text>
          <TextInput
            className="bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-700"
            placeholder="your@email.com"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!loading}
          />
        </View>

        <Pressable
          onPress={handleMagicLink}
          disabled={loading}
          className="bg-indigo-600 px-6 py-4 rounded-xl active:bg-indigo-500 mb-4 disabled:opacity-50"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-center text-base">
              Continue with Email
            </Text>
          )}
        </Pressable>

        <View className="flex-row items-center mb-4">
          <View className="flex-1 h-px bg-slate-700" />
          <Text className="text-slate-500 px-4 text-sm">or</Text>
          <View className="flex-1 h-px bg-slate-700" />
        </View>

        <Pressable
          onPress={() => handleOAuth('google')}
          disabled={loading}
          className="bg-white px-6 py-4 rounded-xl active:bg-slate-100 mb-3 disabled:opacity-50"
        >
          <Text className="text-slate-900 font-semibold text-center text-base">
            Continue with Google
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleOAuth('apple')}
          disabled={loading}
          className="bg-slate-900 border border-slate-700 px-6 py-4 rounded-xl active:bg-slate-800 disabled:opacity-50"
        >
          <Text className="text-white font-semibold text-center text-base">
            Continue with Apple
          </Text>
        </Pressable>

        <Text className="text-slate-500 text-xs text-center mt-8">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
}
