import { View, Text } from '@/components/tw';
import { Alert, Platform } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'expo-router';
import { supabase, getSupabaseConfigError } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import { APPLE_AUTH_ENABLED, APPLE_AUTH_DISABLED_COPY } from '@/lib/login-config';
import { getAuthRedirectUrl } from '@/lib/routing';
import { formatSupabaseAuthError } from '@/lib/auth-errors';
import { getErrorMessage } from '@/lib/errors';
import { completeAuthCallback, parseAuthCallbackUrl } from '@/lib/authCallback';
import {
  OTP_RESEND_COOLDOWN_MS,
  formatButtonCountdown,
  formatRateLimitMessage,
  formatResendWaitMessage,
  getOtpCooldownRemainingMs,
  getOtpCooldownUntil,
  resolveRateLimitCooldownMs,
  setOtpCooldown,
} from '@/lib/otp-cooldown';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { usePostHog } from '@/hooks/usePostHog';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [otpHint, setOtpHint] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const otpInFlightRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  const posthog = usePostHog();

  useEffect(() => {
    const storedUntil = getOtpCooldownUntil();
    if (storedUntil > Date.now()) {
      const remaining = storedUntil - Date.now();
      const rateLimited = remaining >= OTP_RESEND_COOLDOWN_MS;
      setCooldownUntil(storedUntil);
      setIsRateLimited(rateLimited);
      setOtpHint(
        rateLimited ? formatRateLimitMessage(remaining) : formatResendWaitMessage(remaining),
      );
    }
  }, []);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => {
      const until = getOtpCooldownUntil();
      const remaining = getOtpCooldownRemainingMs();
      if (remaining <= 0) {
        setCooldownUntil(0);
        setOtpHint(null);
        setIsRateLimited(false);
        return;
      }
      setCooldownUntil(until);
      setOtpHint((prev) => {
        if (isRateLimited) return formatRateLimitMessage(remaining);
        if (prev?.startsWith('Too many attempts')) return formatRateLimitMessage(remaining);
        return formatResendWaitMessage(remaining);
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil, isRateLimited]);

  const cooldownRemainingMs = getOtpCooldownRemainingMs();
  const isOnCooldown = cooldownRemainingMs > 0;

  const applyCooldown = (durationMs: number, rateLimited: boolean) => {
    const until = setOtpCooldown(durationMs);
    setCooldownUntil(until);
    setIsRateLimited(rateLimited);
    const remaining = until - Date.now();
    setOtpHint(
      rateLimited ? formatRateLimitMessage(remaining) : formatResendWaitMessage(remaining),
    );
  };

  const showAuthError = (message: string) => {
    setLoginError(message);
    if (Platform.OS !== 'web') {
      Alert.alert('Error', message);
    }
  };

  const handleMagicLink = async () => {
    if (!email.trim()) {
      showAuthError('Please enter your email address');
      return;
    }
    if (otpInFlightRef.current || loading) return;
    if (isOnCooldown) {
      setOtpHint(
        isRateLimited
          ? formatRateLimitMessage(cooldownRemainingMs)
          : formatResendWaitMessage(cooldownRemainingMs),
      );
      return;
    }
    const configError = getSupabaseConfigError();
    if (configError) {
      showAuthError(configError);
      return;
    }
    const redirectUrl = getAuthRedirectUrl();
    otpInFlightRef.current = true;
    setLoading(true);
    setOtpHint(null);
    setLoginError(null);
    posthog.capture('magic_link_requested');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) {
        if (error.status === 429) {
          const cooldownMs = resolveRateLimitCooldownMs(error);
          applyCooldown(cooldownMs, true);
          console.warn('[login] Magic link rate limited (429):', error.message, { redirectUrl });
          posthog.capture('login_failed', {
            method: 'magic_link',
            reason: 'rate_limited',
            rate_limited: true,
            status: error.status,
          });
        } else {
          const message = formatSupabaseAuthError(error, { redirectUrl });
          console.warn(
            '[login] Magic link failed:',
            error.status,
            error.message,
            error.code,
            { redirectUrl },
          );
          showAuthError(message);
          posthog.capture('login_failed', {
            method: 'magic_link',
            reason: error.code ?? 'unknown',
            rate_limited: false,
            status: error.status ?? 0,
          });
        }
      } else {
        applyCooldown(OTP_RESEND_COOLDOWN_MS, false);
        setMagicLinkSent(true);
        posthog.capture('magic_link_sent');
        if (Platform.OS !== 'web') {
          Alert.alert('Check your email', 'We sent you a magic link. Click it to sign in.');
        }
      }
    } catch (err) {
      const message =
        err instanceof TypeError && /fetch/i.test(err.message)
          ? 'Cannot reach Supabase. Check EXPO_PUBLIC_SUPABASE_URL in apps/mobile/.env.local and restart Expo.'
          : getErrorMessage(err, 'Something went wrong. Please try again.');
      showAuthError(message);
      console.error('[login] Magic link error:', err);
      posthog.capture('$exception', {
        $exception_message: getErrorMessage(err, 'magic link error'),
        $exception_type: err instanceof Error ? err.name : 'UnknownError',
        context: 'magic_link',
      });
      posthog.capture('login_failed', { method: 'magic_link', reason: 'exception' });
    } finally {
      otpInFlightRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    if (loading) return;
    if (provider === 'apple' && !APPLE_AUTH_ENABLED) {
      Alert.alert('Coming soon', APPLE_AUTH_DISABLED_COPY);
      return;
    }
    const configError = getSupabaseConfigError();
    if (configError) {
      showAuthError(configError);
      return;
    }
    const redirectUrl = getAuthRedirectUrl();
    setLoading(true);
    setLoginError(null);
    posthog.capture('oauth_sign_in_started', { provider });
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      });
      if (error) {
        const message = formatSupabaseAuthError(error, { redirectUrl });
        console.warn(`[login] ${provider} OAuth failed:`, error.status, error.message, { redirectUrl });
        showAuthError(message);
        posthog.capture('login_failed', {
          method: provider,
          reason: error.code ?? 'oauth_error',
          status: error.status ?? 0,
        });
        return;
      }
      if (data?.url) {
        // Web: full-page redirect — popups from openAuthSessionAsync are blocked/unreliable.
        // Return lands on /callback; detectSessionInUrl + callback.tsx complete the session.
        if (Platform.OS === 'web') {
          window.location.assign(data.url);
          return;
        }

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'cancel') {
          Alert.alert('Cancelled', 'Sign in was cancelled');
          posthog.capture('login_failed', { method: provider, reason: 'cancelled' });
          return;
        }
        if (result.type === 'success' && result.url) {
          const { error: authError } = await completeAuthCallback(supabase, parseAuthCallbackUrl(result.url));
          if (authError) {
            showAuthError(authError);
            posthog.capture('login_failed', { method: provider, reason: 'callback_error' });
          }
        }
      }
    } catch (err) {
      showAuthError('Something went wrong. Please try again.');
      console.error(`[login] ${provider} OAuth error:`, err);
      posthog.capture('$exception', {
        $exception_message: getErrorMessage(err, `${provider} oauth error`),
        $exception_type: err instanceof Error ? err.name : 'UnknownError',
        context: 'oauth',
        provider,
      });
      posthog.capture('login_failed', { method: provider, reason: 'exception' });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950 p-4 sm:p-6 lg:p-8 min-h-screen-safe">
        <View className="absolute inset-x-0 top-0 h-48 bg-indigo-600/10" pointerEvents="none" />
        <View className="w-full max-w-md sm:max-w-lg lg:max-w-xl">
          <Text className="text-white text-3xl font-bold mb-3 text-center tracking-tight">Check your email</Text>
          <Text className="text-slate-400 text-center mb-8 text-base leading-relaxed">
            We sent a magic link to {email}. Tap it to sign in.
          </Text>
          <Button
            title="Try different email"
            variant="outline"
            fullWidth
            onPress={() => { setMagicLinkSent(false); setEmail(''); setLoginError(null); }}
          />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-slate-950 p-4 sm:p-6 lg:p-8 min-h-screen-safe">
      <View className="absolute inset-x-0 top-0 h-48 bg-indigo-600/10" pointerEvents="none" />
      <View className="w-full max-w-md sm:max-w-lg lg:max-w-xl">
        <Text className="text-white text-4xl font-bold mb-2 text-center tracking-tight">Hi-Hired</Text>
        <Text className="text-slate-400 mb-8 text-center text-base leading-relaxed">
          Find your next job, one swipe at a time
        </Text>

        <TextField
          label="Email"
          className="rounded-xl border-slate-700 mb-6"
          placeholder="your@email.com"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (loginError) setLoginError(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!loading}
        />

        <Button
          title={
            isOnCooldown
              ? formatButtonCountdown(cooldownRemainingMs)
              : 'Continue with Email'
          }
          fullWidth
          loading={loading}
          disabled={loading || isOnCooldown}
          onPress={handleMagicLink}
          className="mb-2"
        />
        {loginError ? (
          <Text
            testID="login-error"
            className="text-sm text-center mb-4 text-red-400"
            accessibilityLiveRegion="assertive"
            accessibilityRole="alert"
          >
            {loginError}
          </Text>
        ) : otpHint ? (
          <Text
            className={`text-sm text-center mb-4 ${isRateLimited ? 'text-amber-400' : 'text-slate-400'}`}
            accessibilityLiveRegion="polite"
          >
            {otpHint}
          </Text>
        ) : (
          <View className="mb-4" />
        )}

        <View className="flex-row items-center mb-4">
          <View className="flex-1 h-px bg-slate-700" />
          <Text className="text-slate-500 px-4 text-sm">or</Text>
          <View className="flex-1 h-px bg-slate-700" />
        </View>

        <Button title="Continue with Google" variant="inverse" fullWidth disabled={loading} onPress={() => handleOAuth('google')} className="mb-3" />

        <Button
          testID="apple-login-button"
          title={APPLE_AUTH_ENABLED ? 'Continue with Apple' : 'Apple Sign-In (coming soon)'}
          variant="outline"
          fullWidth
          disabled={loading || !APPLE_AUTH_ENABLED}
          onPress={() => handleOAuth('apple')}
        />

        <Text className="text-slate-500 text-xs text-center mt-8">
          By continuing, you agree to our{' '}
          <Link href="https://hihired.com/terms" className="text-indigo-400 underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="https://hihired.com/privacy" className="text-indigo-400 underline">Privacy Policy</Link>
        </Text>
      </View>
    </View>
  );
}
