import { View, Text, Pressable } from '@/components/tw'
import { Image } from '@/components/tw/image'
import type { PickedAttachment } from './types'

type AttachmentPreviewProps = {
  attachments: PickedAttachment[]
  onRemove: (index: number) => void
}

export function AttachmentPreview({ attachments, onRemove }: AttachmentPreviewProps) {
  if (attachments.length === 0) return null

  return (
    <View className="flex-row flex-wrap gap-2 mb-2 px-1">
      {attachments.map((att, index) => {
        const isImage = att.mimeType.startsWith('image/')
        const isVideo = att.mimeType.startsWith('video/')
        return (
          <View
            key={index}
            className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-700 bg-slate-900"
          >
            {isImage ? (
              <Image
                source={{ uri: att.uri }}
                className="w-full h-full"
                contentFit="cover"
              />
            ) : (
              <View className="w-full h-full items-center justify-center bg-slate-800">
                <Text className="text-slate-400 text-[10px] text-center px-1">
                  {isVideo ? 'VIDEO' : 'DOC'}
                </Text>
                <Text className="text-slate-500 text-[8px] mt-1" numberOfLines={1}>
                  {att.fileName.split('.').pop()?.toUpperCase()}
                </Text>
              </View>
            )}
            <Pressable
              onPress={() => onRemove(index)}
              className="absolute top-1 right-1 bg-slate-950/80 rounded-full w-5 h-5 items-center justify-center"
              hitSlop={8}
            >
              <Text className="text-slate-400 text-xs">×</Text>
            </Pressable>
            <View className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
              <Text className="text-white text-[9px]" numberOfLines={1}>
                {att.fileName.length > 12 ? att.fileName.slice(0, 9) + '...' : att.fileName}
              </Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}
