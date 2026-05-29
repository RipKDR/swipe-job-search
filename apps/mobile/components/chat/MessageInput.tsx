import { useState } from 'react'
import { View, TextInput, Text } from '@/components/tw'
import { Button } from '@/components/ui/Button'

type MessageInputProps = {
  disabled?: boolean
  loading?: boolean
  onSend: (body: string) => Promise<void>
}

export function MessageInput({ disabled, loading, onSend }: MessageInputProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    const body = text.trim()
    if (!body || disabled || loading) return

    setError(null)
    try {
      await onSend(body)
      setText('')
    } catch (sendError: any) {
      setError(sendError?.message ?? 'Unable to send message')
    }
  }

  return (
    <View className="border-t border-slate-800 bg-slate-950 px-4 py-3 gap-2">
      {error ? <Text className="text-rose-300 text-sm">{error}</Text> : null}
      <View className="flex-row items-end gap-2">
        <TextInput
          value={text}
          onChangeText={setText}
          editable={!disabled && !loading}
          placeholder={disabled ? 'Messaging closed' : 'Type a message…'}
          placeholderTextColor="#64748b"
          multiline
          className="flex-1 min-h-[44px] max-h-32 rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-white text-[15px]"
        />
        <Button
          title="Send"
          disabled={disabled || loading || !text.trim()}
          loading={loading}
          onPress={handleSend}
        />
      </View>
    </View>
  )
}
