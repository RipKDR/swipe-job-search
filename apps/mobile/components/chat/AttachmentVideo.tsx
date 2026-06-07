import { useEffect, useState } from 'react'
import { View, Text, Pressable } from '@/components/tw'
import { Linking } from 'react-native'
import { supabase } from '@/lib/supabase'
import type { MessageAttachment } from '@/hooks/useChat'
import { getErrorMessage } from '@/lib/errors'

type Props = {
  attachment: MessageAttachment
}

export function AttachmentVideo({ attachment }: Props) {
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

  const handlePlay = async () => {
    if (!url) return
    try {
      await Linking.openURL(url)
    } catch (e) {
      console.warn('Failed to open video:', getErrorMessage(e))
    }
  }

  return (
    <Pressable
      onPress={handlePlay}
      className="w-full max-w-[240px] rounded-xl overflow-hidden border border-slate-700 bg-slate-900 active:opacity-80"
    >
      <View className="h-32 items-center justify-center bg-slate-800">
        <View className="w-12 h-12 rounded-full bg-indigo-600/90 items-center justify-center">
          <Text className="text-white text-xl">▶</Text>
        </View>
        <Text className="text-slate-400 text-xs mt-2">Tap to play video</Text>
      </View>
      <View className="px-3 py-2 flex-row justify-between items-center bg-slate-950/80">
        <Text className="text-white text-sm flex-1" numberOfLines={1}>
          {attachment.mime_type.split('/')[1]?.toUpperCase() || 'VIDEO'}
        </Text>
        <Text className="text-slate-400 text-xs ml-2">
          {(attachment.file_size / 1024 / 1024).toFixed(1)} MB
        </Text>
      </View>
    </Pressable>
  )
}
