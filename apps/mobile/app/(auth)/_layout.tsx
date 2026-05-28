import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ROUTES, routerHref } from '@/lib/routing';

export default function AuthLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (session) {
    return <Redirect href={routerHref(ROUTES.root)} />;
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
