import { View, Text } from '@/components/tw'
import { Button } from '@/components/ui/Button'
import { getHireBarState, type MatchHireFields } from '@/hooks/useHireConfirm'

type HireBarProps = {
  match: MatchHireFields
  userId: string
  loading?: boolean
  onConfirmHire: () => void
}

export function HireBar({ match, userId, loading, onConfirmHire }: HireBarProps) {
  const state = getHireBarState(match, userId)

  if (state.phase === 'closed') {
    return (
      <View className="bg-slate-900 border-t border-slate-800 px-4 py-3">
        <Text className="text-slate-400 text-center">This conversation is closed.</Text>
      </View>
    )
  }

  if (state.phase === 'hired') {
    return (
      <View className="bg-emerald-950/40 border-t border-emerald-900 px-4 py-3">
        <Text className="text-emerald-300 text-center font-medium">Hired — congratulations!</Text>
      </View>
    )
  }

  if (state.phase === 'awaiting_other') {
    return (
      <View className="bg-amber-950/30 border-t border-amber-900 px-4 py-3 gap-2">
        <Text className="text-amber-200 text-center">Waiting for the other party to confirm hire.</Text>
      </View>
    )
  }

  const buttonTitle = state.phase === 'can_initiate' ? 'Mark as Hired' : 'Confirm Hire'

  return (
    <View className="bg-slate-900 border-t border-slate-800 px-4 py-3 gap-2">
      {state.phase === 'can_confirm' ? (
        <Text className="text-slate-300 text-center text-sm">
          The other party wants to mark this hire as complete.
        </Text>
      ) : null}
      <Button title={buttonTitle} loading={loading} onPress={onConfirmHire} fullWidth />
    </View>
  )
}
