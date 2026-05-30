import { Stack } from 'expo-router'

export default function ProviderLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0f172a' } }} />
  )
}
