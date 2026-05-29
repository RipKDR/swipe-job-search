import { View, Text } from '@/components/tw'
import { Button } from './Button'

type ProfileLoadErrorProps = {
  onRetry: () => void
  loading?: boolean
}

export function ProfileLoadError({ onRetry, loading = false }: ProfileLoadErrorProps) {
  return (
    <View className="flex-1 bg-slate-950 items-center justify-center px-6">
      <Text className="text-white text-xl font-bold mb-2 text-center">
        Could not load your profile
      </Text>
      <Text className="text-slate-400 text-sm text-center mb-8">
        Check your connection and try again.
      </Text>
      <Button title="Retry" onPress={onRetry} loading={loading} />
    </View>
  )
}
