import { View, Text } from '@/components/tw';
import { Alert } from 'react-native';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import { getAuthRedirectUrl } from '@/lib/routing';
import { completeAuthCallback, parseAuthCallbackUrl } from '@/lib/authCallback';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

WebBrowser.maybeCompleteAuthSession();

const redirectUrl = getAuthRedirectUrl();

/** Apple Sign-In requires App Store credentials — enable when operator supplies them. */
const APPLE_SIGN_IN_ENABLED = false;

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
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        setMagicLinkSent(true);
        Alert.alert('Check your email', 'We sent you a magic link. Click it to sign in.');
      }
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      console.error('[login] Magic link error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    if (provider === 'apple' && !APPLE_SIGN_IN_ENABLED) {
      Alert.alert('Coming soon', 'Apple Sign-In will be enabled before App Store submission.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      });
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'cancel') {
          Alert.alert('Cancelled', 'Sign in was cancelled');
          return;
        }
        if (result.type === 'success' && result.url) {
          const { error: authError } = await completeAuthCallback(supabase, parseAuthCallbackUrl(result.url));
          if (authError) {
            Alert.alert('Error', authError);
          }
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
          We sent a magic link to {email}.{'\n'}Click it to sign in.
        </Text>
        <Button
          title="Try different email"
          variant="outline"
          onPress={() => { setMagicLinkSent(false); setEmail(''); }}
        />
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

        <TextField
          label="Email"
          className="rounded-xl border-slate-700 mb-6"
          placeholder="your@email.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!loading}
        />

        <Button title="Continue with Email" fullWidth loading={loading} disabled={loading} onPress={handleMagicLink} className="mb-4" />

        <View className="flex-row items-center mb-4">
          <View className="flex-1 h-px bg-slate-700" />
          <Text className="text-slate-500 px-4 text-sm">or</Text>
          <View className="flex-1 h-px bg-slate-700" />
        </View>

        <Button title="Continue with Google" variant="inverse" fullWidth disabled={loading} onPress={() => handleOAuth('google')} className="mb-3" />

        <Button
          testID="apple-login-button"
          title={APPLE_SIGN_IN_ENABLED ? 'Continue with Apple' : 'Apple Sign-In (coming soon)'}
          variant="outline"
          fullWidth
          disabled={loading || !APPLE_SIGN_IN_ENABLED}
          onPress={() => handleOAuth('apple')}
        />

        <Text className="text-slate-500 text-xs text-center mt-8">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
}
