// Type shim for expo-document-picker
// TODO: Install via `pnpm add --filter @hi-hired/mobile expo-document-picker` once pnpm store permissions are resolved
declare module 'expo-document-picker' {
  export type DocumentPickerResult = {
    canceled: boolean
    assets?: Array<{
      uri: string
      name?: string
      size?: number
      mimeType?: string
    }>
  }

  export function getDocumentAsync(options?: {
    type?: string | string[]
    copyToCacheDirectory?: boolean
    multiple?: boolean
  }): Promise<DocumentPickerResult>
}
