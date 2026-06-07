import { useState, useRef, useEffect, useCallback } from 'react'
import { View, TextInput, Text, Pressable } from '@/components/tw'
import { Button } from '@/components/ui/Button'
import { contentMaxWidthChat, screenPadding } from '@/lib/responsive-layout'
import { MediaPicker } from './MediaPicker'
import { AttachmentPreview } from './AttachmentPreview'
import type { PickedAttachment } from './types'

type MessageInputProps = {
  disabled?: boolean
  loading?: boolean
  onSend: (body: string) => Promise<void>
  onSendMedia?: (body: string, attachments: PickedAttachment[]) => Promise<void>
  onTyping?: (isTyping: boolean) => void
}

export function MessageInput({ disabled, loading, onSend, onSendMedia, onTyping }: MessageInputProps) {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<PickedAttachment[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const hasSentTypingRef = useRef(false)

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      onTyping?.(isTyping)
    },
    [onTyping]
  )

  const handleTextChange = (newText: string) => {
    setText(newText)

    if (!hasSentTypingRef.current && newText.length > 0) {
      hasSentTypingRef.current = true
      sendTyping(true)
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    if (newText.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(false)
        hasSentTypingRef.current = false
      }, 1200)
    } else {
      sendTyping(false)
      hasSentTypingRef.current = false
    }
  }

  const handlePick = (result: PickedAttachment) => {
    setAttachments((prev) => [...prev, { ...result, localId: Date.now().toString() }])
    // keep picker open for multi-select
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleTogglePicker = () => {
    setShowPicker((v) => !v)
  }

  const handleSend = async () => {
    const body = text.trim()
    const hasMedia = attachments.length > 0
    if ((!body && !hasMedia) || disabled || loading) return

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    sendTyping(false)
    hasSentTypingRef.current = false

    setError(null)
    try {
      if (hasMedia && onSendMedia) {
        await onSendMedia(body, attachments)
        setAttachments([])
        setShowPicker(false)
      } else if (body) {
        await onSend(body)
      }
      setText('')
    } catch (sendError: any) {
      setError(sendError?.message ?? 'Unable to send message')
    }
  }

  const canSend = !disabled && !loading && (text.trim() || attachments.length > 0)

  return (
    <View className={`w-full items-center ${screenPadding} border-t border-slate-800/80 bg-slate-950/95 py-3`}>
      <View className={`w-full ${contentMaxWidthChat} gap-2`}>
        {error ? <Text className="text-rose-300 text-sm">{error}</Text> : null}

        <AttachmentPreview attachments={attachments} onRemove={handleRemoveAttachment} />

        <View className="flex-row items-end gap-2">
          <Pressable
            onPress={handleTogglePicker}
            disabled={disabled || loading}
            className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 items-center justify-center active:opacity-70"
            hitSlop={8}
          >
            <Text className="text-slate-400 text-xl">📎</Text>
          </Pressable>

          <TextInput
            value={text}
            onChangeText={handleTextChange}
            editable={!disabled && !loading}
            placeholder={disabled ? 'Messaging closed' : 'Type a message…'}
            placeholderTextColor="#64748b"
            multiline
            className="flex-1 min-h-[44px] max-h-32 rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-white text-[15px] sm:text-base"
          />

          <Button
            title="Send"
            disabled={!canSend}
            loading={loading}
            onPress={handleSend}
          />
        </View>
      </View>

      {showPicker && (
        <MediaPicker
          onPick={handlePick}
          disabled={disabled || loading}
        />
      )}
    </View>
  )
}
