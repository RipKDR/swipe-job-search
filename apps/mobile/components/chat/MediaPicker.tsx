import { useCallback } from 'react'
import { View, Text, Pressable } from '@/components/tw'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { Alert, Platform } from 'react-native'
import { contentMaxWidthChat, screenPadding } from '@/lib/responsive-layout'
import { Button } from '@/components/ui/Button'
import { getErrorMessage } from '@/lib/errors'

type MediaPickerProps = {
  onPick: (result: {
    uri: string
    mimeType: string
    fileName: string
    width?: number
    height?: number
    duration?: number
  }) => void
  disabled?: boolean
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-m4v']
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/ogg']
const ALLOWED_DOCUMENT_TYPES = ['application/pdf']

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

export function MediaPicker({ onPick, disabled }: MediaPickerProps) {
  const pickImage = useCallback(async () => {
    let result: ImagePicker.ImagePickerResult
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: false,
      })
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to open image picker'))
      return
    }

    if (result.canceled || !result.assets?.[0]) return

    const asset = result.assets[0]
    if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
      Alert.alert('File too large', 'Please select a file smaller than 25MB')
      return
    }

    if (asset.mimeType && !ALLOWED_IMAGE_TYPES.includes(asset.mimeType)) {
      Alert.alert('Unsupported format', 'Please select a JPEG, PNG, WebP, or HEIC image')
      return
    }

    onPick({
      uri: asset.uri,
      mimeType: asset.mimeType || 'image/jpeg',
      fileName: asset.fileName || `image.${asset.mimeType?.split('/')[1] || 'jpg'}`,
      width: asset.width,
      height: asset.height,
    })
  }, [onPick])

  const pickVideo = useCallback(async () => {
    let result: ImagePicker.ImagePickerResult
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
        allowsMultipleSelection: false,
      })
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to open video picker'))
      return
    }

    if (result.canceled || !result.assets?.[0]) return

    const asset = result.assets[0]
    if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
      Alert.alert('File too large', 'Please select a file smaller than 25MB')
      return
    }

    if (asset.mimeType && !ALLOWED_VIDEO_TYPES.includes(asset.mimeType)) {
      Alert.alert('Unsupported format', 'Please select an MP4 or MOV video')
      return
    }

    onPick({
      uri: asset.uri,
      mimeType: asset.mimeType || 'video/mp4',
      fileName: asset.fileName || `video.${asset.mimeType?.split('/')[1] || 'mp4'}`,
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
    })
  }, [onPick])

  const pickDocument = useCallback(async () => {
    let result: DocumentPicker.DocumentPickerResult
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_DOCUMENT_TYPES,
        copyToCacheDirectory: true,
      })
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to open document picker'))
      return
    }

    if (result.canceled || !result.assets?.[0]) return

    const asset = result.assets[0]
    if (asset.size && asset.size > MAX_FILE_SIZE) {
      Alert.alert('File too large', 'Please select a file smaller than 25MB')
      return
    }

    onPick({
      uri: asset.uri,
      mimeType: asset.mimeType || 'application/pdf',
      fileName: asset.name || 'document.pdf',
    })
  }, [onPick])

  if (disabled) return null

  return (
    <View className={`w-full items-center ${screenPadding} border-t border-slate-800/50 bg-slate-950/50 py-2`}>
      <View className={`w-full ${contentMaxWidthChat} flex-row flex-wrap gap-2 justify-center`}>
        <Button
          title="Photo"
          variant="outline"
          icon="image"
          onPress={pickImage}
          className="sm:w-auto"
        />
        <Button
          title="Video"
          variant="outline"
          icon="video"
          onPress={pickVideo}
          className="sm:w-auto"
        />
        <Button
          title="Document"
          variant="outline"
          icon="file-text"
          onPress={pickDocument}
          className="sm:w-auto"
        />
      </View>
    </View>
  )
}