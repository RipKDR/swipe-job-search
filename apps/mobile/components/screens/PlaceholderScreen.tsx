import { View, Text } from 'react-native'

interface PlaceholderScreenProps {
  title: string
  subtitle: string
}

export function PlaceholderScreen({ title, subtitle }: PlaceholderScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-slate-950">
      <Text className="text-white text-xl">{title}</Text>
      <Text className="text-slate-400 mt-2">{subtitle}</Text>
    </View>
  )
}
