import { View, Text, Pressable } from '@/components/tw'
import { Modal } from 'react-native'
import { Button } from '@/components/ui/Button'

type UnmatchSheetProps = {
  visible: boolean
  requiresConfirmation: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function UnmatchSheet({
  visible,
  requiresConfirmation,
  loading,
  onConfirm,
  onCancel,
}: UnmatchSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable className="flex-1 bg-black/70 justify-end" onPress={onCancel}>
        <Pressable className="bg-slate-900 rounded-t-3xl px-6 pt-6 pb-10 gap-4" onPress={() => {}}>
          <Text className="text-white text-xl font-semibold">Unmatch?</Text>
          <Text className="text-slate-300 leading-relaxed">
            {requiresConfirmation
              ? 'This conversation has messages. Unmatching will close the chat and hide this match from your inbox.'
              : 'This will close the chat and remove this match from your inbox.'}
          </Text>
          <View className="gap-3">
            <Button title="Unmatch" loading={loading} onPress={onConfirm} fullWidth />
            <Button title="Cancel" variant="outline" onPress={onCancel} fullWidth />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
