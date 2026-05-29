import { View, Text } from '@/components/tw'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

export function ProfilePlaceholderScreen() {
  const { signOut } = useAuth()

  return (
    <View className="flex-1 items-center justify-center bg-slate-950 px-6">
      <Text className="text-white text-xl mb-4">Profile Settings</Text>
      <Text className="text-slate-400 mb-8">Coming soon</Text>
      <Button title="Sign Out" variant="secondary" onPress={() => void signOut()} />
    </View>
  )
}
