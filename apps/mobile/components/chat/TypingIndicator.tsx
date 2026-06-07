import { View, Text } from '@/components/tw'

type TypingIndicatorProps = {
  typingUsers: number
  currentUserId: string
}

const DOT_ANIMATION_DELAYS = [0, 150, 300]

export function TypingIndicator({ typingUsers, currentUserId }: TypingIndicatorProps) {
  if (typingUsers === 0) return null

  return (
    <View
      className="w-full items-center px-4 sm:px-6 lg:px-8 py-2"
      testID="typing-indicator"
      accessible={true}
      accessibilityLabel={
        typingUsers === 1
          ? 'One person is typing'
          : `${typingUsers} people are typing`
      }
    >
      <View className="flex-row items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-full px-4 py-2">
        <View className="flex-row items-center gap-1">
          {DOT_ANIMATION_DELAYS.map((delay, index) => (
            <View
              key={index}
              className="w-1.5 h-1.5 bg-indigo-400 rounded-full"
              style={{
                animation: `typing-bounce 0.6s ease-in-out infinite`,
                animationDelay: `${delay}ms`,
              }}
            />
          ))}
        </View>
        <Text className="text-slate-400 text-xs font-medium ml-1">
          {typingUsers === 1 ? 'typing…' : 'are typing…'}
        </Text>
      </View>
    </View>
  )
}