import { useEffect, useState } from 'react'
import { View, Text, Pressable } from '@/components/tw'
import { Linking } from 'react-native'
import { supabase } from '@/lib/supabase'
import type { MessageAttachment } from '@/hooks/useChat'
import { getErrorMessage } from '@/lib/errors'

type Props = {
  attachment: MessageAttachment
}

export function AttachmentDocument({ attachment }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    supabase.storage
      .from('chat-media')
      .createSignedUrl(attachment.storage_path, 3600)
      .then(({ data }) => {
        if (mounted && data?.signedUrl) setUrl(data.signedUrl)
        setLoading(false)
      })
      .catch(() => setLoading(false))
    return () => { mounted = false }
  }, [attachment.storage_path])

  const handleOpen = async () => {
    if (!url) return
    try {
      await Linking.openURL(url)
    } catch (e) {
      console.warn('Failed to open document:', getErrorMessage(e))
    }
  }

  const ext = attachment.mime_type.split('/')[1]?.toUpperCase() || 'FILE'
  const sizeMB = (attachment.file_size / 1024 / 1024).toFixed(1)

  return (
    <Pressable
      onPress={handleOpen}
      className="flex-row items-center gap-3 w-full max-w-[280px] rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 active:opacity-80"
    >
      <View className="w-10 h-10 rounded-lg bg-slate-800 items-center justify-center">
        <Text className="text-slate-400 text-lg">📄</Text>
      </View>
      <View className="flex-1">
        <Text className="text-white text-sm" numberOfLines={1}>
          {attachment.mime_type.includes('pdf') ? 'Document' : ext}
        </Text>
        <Text className="text-slate-400 text-xs">{sizeMB} MB • Tap to open</Text>
      </View>
      <Text className="text-slate-400 text-lg">↓</Text>
    </Pressable>
  )
}
