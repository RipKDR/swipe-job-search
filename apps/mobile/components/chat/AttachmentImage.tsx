import { useEffect, useState } from 'react'
import { View, Text } from '@/components/tw'
import { Image } from '@/components/tw/image'
import { supabase } from '@/lib/supabase'
import type { MessageAttachment } from '@/hooks/useChat'

type Props = {
  attachment: MessageAttachment
}

export function AttachmentImage({ attachment }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let mounted = true
    supabase.storage
      .from('chat-media')
      .createSignedUrl(attachment.storage_path, 3600)
      .then(({ data, error }) => {
        if (!mounted) return
        if (error) {
          setError(true)
        } else if (data?.signedUrl) {
          setUrl(data.signedUrl)
        }
      })
    return () => {
      mounted = false
    }
  }, [attachment.storage_path])

  if (error) {
    return (
      <View className="w-full h-48 bg-slate-800 rounded-xl items-center justify-center">
        <Text className="text-slate-400 text-sm">Image unavailable</Text>
      </View>
    )
  }

  return (
    <View className="w-full max-w-[240px] rounded-xl overflow-hidden border border-slate-700">
      {url ? (
        <Image
          source={{ uri: url }}
          className="w-full aspect-[4/3] bg-slate-900"
          contentFit="cover"
        />
      ) : (
        <View className="w-full h-48 bg-slate-800 items-center justify-center">
          <Text className="text-slate-500 text-xs">Loading image…</Text>
        </View>
      )}
      <View className="px-3 py-1.5 bg-slate-900/90">
        <Text className="text-slate-400 text-xs">
          {(attachment.file_size / 1024 / 1024).toFixed(1)} MB
        </Text>
      </View>
    </View>
  )
}
