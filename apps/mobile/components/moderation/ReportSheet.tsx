import { useState } from 'react'
import { View, Text, Pressable, TextInput } from '@/components/tw'
import { Modal } from 'react-native'
import { Button } from '@/components/ui/Button'
import type { ReportReason } from '@/lib/moderation'

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'misleading_job', label: 'Misleading job' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' },
]

type ReportSheetProps = {
  visible: boolean
  loading?: boolean
  onSubmit: (reason: ReportReason, details?: string) => Promise<void>
  onCancel: () => void
}

export function ReportSheet({ visible, loading, onSubmit, onCancel }: ReportSheetProps) {
  const [reason, setReason] = useState<ReportReason>('other')
  const [details, setDetails] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setError(null)
    try {
      await onSubmit(reason, details)
      setDetails('')
      setReason('other')
    } catch (submitError: any) {
      setError(submitError?.message ?? 'Unable to submit report')
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable className="flex-1 bg-black/70 justify-end" onPress={onCancel}>
        <Pressable className="bg-slate-900 rounded-t-3xl px-6 pt-6 pb-10 gap-4 max-h-[85%]" onPress={() => {}}>
          <Text className="text-white text-xl font-semibold">Report user</Text>
          <Text className="text-slate-400">Tell us what happened. Our team will review your report.</Text>

          <View className="gap-2">
            {REASONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setReason(option.value)}
                className={`rounded-xl border px-4 py-3 ${
                  reason === option.value ? 'border-indigo-500 bg-indigo-950/40' : 'border-slate-800 bg-slate-950'
                }`}
              >
                <Text className="text-white">{option.label}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Additional details (optional)"
            placeholderTextColor="#64748b"
            multiline
            className="min-h-[88px] rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white"
          />

          {error ? <Text className="text-rose-300">{error}</Text> : null}

          <View className="gap-3">
            <Button title="Submit report" loading={loading} onPress={handleSubmit} fullWidth />
            <Button title="Cancel" variant="outline" onPress={onCancel} fullWidth />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
