import { describe, expect, it, vi } from 'vitest';
import { pickAndUploadAvatar, uploadAvatarFromUri } from '../avatar-upload';

describe('avatar upload helpers', () => {
  it('returns null when picker is cancelled', async () => {
    const imagePicker = {
      launchImageLibraryAsync: vi.fn().mockResolvedValue({ canceled: true, assets: [] }),
    };

    const result = await pickAndUploadAvatar({
      userId: 'user-1',
      imagePicker,
      supabaseStorage: {
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
      },
      fetchImpl: vi.fn(),
    });

    expect(result).toBeNull();
  });

  it('uploads selected image and returns public URL', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://cdn.example.com/avatars/user-1/avatar.jpg' },
    });
    const fetchImpl = vi.fn().mockResolvedValue({
      blob: vi.fn().mockResolvedValue(new Blob(['image-bytes'], { type: 'image/jpeg' })),
    });

    const url = await uploadAvatarFromUri({
      userId: 'user-1',
      uri: 'file:///tmp/avatar.jpg',
      supabaseStorage: { upload, getPublicUrl },
      fetchImpl,
      now: () => 1710000000000,
    });

    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0][0]).toBe('user-1/1710000000000-avatar.jpg');
    expect(url).toBe('https://cdn.example.com/avatars/user-1/avatar.jpg');
  });
});
