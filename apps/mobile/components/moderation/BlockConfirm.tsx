import { View, Text, Pressable } from '@/components/tw'
import { Modal } from 'react-native'
import { Button } from '@/components/ui/Button'

type BlockConfirmProps = {
  visible: boolean
  counterpartName: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function BlockConfirm({
  visible,
  counterpartName,
  loading,
  onConfirm,
  onCancel,
}: BlockConfirmProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable className="flex-1 bg-black/70 justify-end" onPress={onCancel}>
        <Pressable className="bg-slate-900 rounded-t-3xl px-6 pt-6 pb-10 gap-4" onPress={() => {}}>
          <Text className="text-white text-xl font-semibold">Block {counterpartName}?</Text>
          <Text className="text-slate-300 leading-relaxed">
            They will not be able to message you and will be removed from your inbox. You can unblock later from
            settings.
          </Text>
          <View className="gap-3">
            <Button title="Block" loading={loading} onPress={onConfirm} fullWidth />
            <Button title="Cancel" variant="outline" onPress={onCancel} fullWidth />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
