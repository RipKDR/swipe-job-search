import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

export default function AuthLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (session) {
    return <Redirect href={'/' as any} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0f172a' },
      }}
    />
  );
}
