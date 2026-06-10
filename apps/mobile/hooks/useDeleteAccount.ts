/**
 * useDeleteAccount — permanent account deletion flow.
 *
 * Two-step confirm, then invokes the `delete-account` Edge Function (which
 * verifies the caller's JWT, purges all data, and deletes the auth user),
 * clears the local session, and returns to the login screen.
 *
 * Required for App Store Guideline 5.1.1(v).
 */
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export function useDeleteAccount() {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const performDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account');
      const responseError =
        error ?? ((data as { error?: string } | null)?.error || null);
      if (responseError) {
        throw new Error(
          typeof responseError === 'string' ? responseError : responseError.message,
        );
      }

      // The auth user no longer exists; clear the locally stored session.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      router.replace('/(auth)/login');
    } catch {
      Alert.alert(
        'Could not delete account',
        'Something went wrong. Please try again, or contact support@hihired.com.au and we will delete your account for you.',
      );
      setIsDeleting(false);
    }
  }, [router]);

  const confirmDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account, profile, matches, messages and all other data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: (): void => {
            Alert.alert(
              'Are you sure?',
              'Your account and all data will be gone forever.',
              [
                { text: 'Keep my account', style: 'cancel' },
                {
                  text: 'Delete forever',
                  style: 'destructive',
                  onPress: (): void => void performDelete(),
                },
              ],
            );
          },
        },
      ],
    );
  }, [performDelete]);

  return { confirmDeleteAccount, isDeleting };
}
