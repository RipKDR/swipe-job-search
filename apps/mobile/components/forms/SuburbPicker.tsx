import { View, Text, ScrollView, Pressable } from '@/components/tw'
import { BEACHHEAD_SUBURBS } from '@hi-hired/shared'

interface SuburbPickerProps {
  value: string | undefined
  onChange: (suburb: (typeof BEACHHEAD_SUBURBS)[number]) => void
  error?: string
}

export function SuburbPicker({ value, onChange, error }: SuburbPickerProps) {
  return (
    <View>
      <Text className="text-white text-sm font-medium mb-2">Suburb *</Text>
      <View className="bg-slate-900 rounded-lg border border-slate-800 max-h-40">
        <ScrollView>
          {BEACHHEAD_SUBURBS.map((suburb) => (
            <Pressable
              key={suburb}
              onPress={() => onChange(suburb)}
              className={`px-4 py-3 border-b border-slate-800 ${
                value === suburb ? 'bg-indigo-600/20' : ''
              }`}
            >
              <Text className={value === suburb ? 'text-indigo-400' : 'text-white'}>
                {suburb}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {error ? <Text className="text-red-400 text-xs mt-1">{error}</Text> : null}
    </View>
  )
}
