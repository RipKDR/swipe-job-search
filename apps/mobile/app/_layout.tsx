import { Slot } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { useSegments } from 'expo-router';

// Phase 1 stub: full AuthProvider + useAuth in U3 per plan
// For now, simple loading + placeholder gate (will be replaced in Phase 2)
export default function RootLayout() {
  const segments = useSegments();
  // const router = useRouter(); // TODO U3: enable for auth redirect
  const loading = false; // TODO U3: from useAuth()
  const session = null; // TODO U3

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!session && !inAuth) {
      // TODO U3: router.replace('/(auth)/login');
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator color="#6366f1" />
      </View>
    );
  }

  return <Slot />;
}