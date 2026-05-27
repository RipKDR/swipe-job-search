type ImagePickerLike = {
  launchImageLibraryAsync: (
    options: Record<string, unknown>
  ) => Promise<{ canceled: boolean; assets?: { uri: string }[] | null }>;
  MediaTypeOptions?: { Images: unknown };
};

type SupabaseStorageLike = {
  upload: (
    path: string,
    body: Blob,
    options?: { upsert?: boolean; contentType?: string }
  ) => Promise<{ error: Error | null }>;
  getPublicUrl: (path: string) => { data: { publicUrl: string } };
};

type UploadInput = {
  userId: string;
  uri: string;
  supabaseStorage: SupabaseStorageLike;
  fetchImpl: typeof fetch;
  now?: () => number;
};

type PickAndUploadInput = {
  userId: string;
  imagePicker: ImagePickerLike;
  supabaseStorage: SupabaseStorageLike;
  fetchImpl: typeof fetch;
};

function getFileNameFromUri(uri: string): string {
  const candidate = uri.split('/').pop() || 'avatar.jpg';
  return candidate.includes('.') ? candidate : `${candidate}.jpg`;
}

export async function uploadAvatarFromUri({
  userId,
  uri,
  supabaseStorage,
  fetchImpl,
  now = Date.now,
}: UploadInput): Promise<string> {
  const fileName = getFileNameFromUri(uri);
  const storagePath = `${userId}/${now()}-${fileName}`;
  const fetchResponse = await fetchImpl(uri);
  const blob = await fetchResponse.blob();

  const { error } = await supabaseStorage.upload(storagePath, blob, {
    upsert: true,
    contentType: blob.type || 'image/jpeg',
  });

  if (error) {
    throw error;
  }

  const { data } = supabaseStorage.getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function pickAndUploadAvatar({
  userId,
  imagePicker,
  supabaseStorage,
  fetchImpl,
}: PickAndUploadInput): Promise<string | null> {
  const result = await imagePicker.launchImageLibraryAsync({
    mediaTypes: imagePicker.MediaTypeOptions?.Images,
    allowsEditing: true,
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }

  return uploadAvatarFromUri({
    userId,
    uri: result.assets[0].uri,
    supabaseStorage,
    fetchImpl,
  });
}
