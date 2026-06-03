import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
const mockGetItemAsync = vi.fn();
const mockSetItemAsync = vi.fn();
const mockDeleteItemAsync = vi.fn();
const mockRefreshSession = vi.fn();

vi.mock('expo-secure-store', () => ({
  getItemAsync: (...args: unknown[]) => mockGetItemAsync(...args),
  setItemAsync: (...args: unknown[]) => mockSetItemAsync(...args),
  deleteItemAsync: (...args: unknown[]) => mockDeleteItemAsync(...args),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
    },
  },
}));

describe('token-refresh (OAuth token management)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('storeTokens', () => {
    it('stores access and refresh tokens in SecureStore', async () => {
      mockSetItemAsync.mockResolvedValue(undefined);
      const { storeTokens } = await import('../auth/token-refresh');

      await storeTokens('access-123', 'refresh-456');

      expect(mockSetItemAsync).toHaveBeenCalledTimes(2);
      expect(mockSetItemAsync).toHaveBeenCalledWith(
        'hi_hired_access_token',
        'access-123',
      );
      expect(mockSetItemAsync).toHaveBeenCalledWith(
        'hi_hired_refresh_token',
        'refresh-456',
      );
    });
  });

  describe('clearTokens', () => {
    it('deletes both tokens from SecureStore', async () => {
      mockDeleteItemAsync.mockResolvedValue(undefined);
      const { clearTokens } = await import('../auth/token-refresh');

      await clearTokens();

      expect(mockDeleteItemAsync).toHaveBeenCalledTimes(2);
      expect(mockDeleteItemAsync).toHaveBeenCalledWith('hi_hired_access_token');
      expect(mockDeleteItemAsync).toHaveBeenCalledWith('hi_hired_refresh_token');
    });
  });

  describe('getAccessToken', () => {
    it('returns token from SecureStore', async () => {
      mockGetItemAsync.mockResolvedValue('access-abc');
      const { getAccessToken } = await import('../auth/token-refresh');

      const token = await getAccessToken();

      expect(token).toBe('access-abc');
      expect(mockGetItemAsync).toHaveBeenCalledWith('hi_hired_access_token');
    });

    it('returns null on error', async () => {
      mockGetItemAsync.mockRejectedValue(new Error('Storage error'));
      const { getAccessToken } = await import('../auth/token-refresh');

      const token = await getAccessToken();

      expect(token).toBeNull();
    });
  });

  describe('getRefreshToken', () => {
    it('returns refresh token from SecureStore', async () => {
      mockGetItemAsync.mockResolvedValue('refresh-xyz');
      const { getRefreshToken } = await import('../auth/token-refresh');

      const token = await getRefreshToken();

      expect(token).toBe('refresh-xyz');
      expect(mockGetItemAsync).toHaveBeenCalledWith('hi_hired_refresh_token');
    });
  });

  describe('refreshAccessToken', () => {
    it('calls supabase.auth.refreshSession and stores new tokens', async () => {
      mockRefreshSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access',
            refresh_token: 'new-refresh',
          },
        },
        error: null,
      });
      mockSetItemAsync.mockResolvedValue(undefined);

      const { refreshAccessToken } = await import('../auth/token-refresh');

      const result = await refreshAccessToken('old-refresh');

      expect(result).toBe('new-access');
      expect(mockRefreshSession).toHaveBeenCalledWith({
        refresh_token: 'old-refresh',
      });
      expect(mockSetItemAsync).toHaveBeenCalledWith(
        'hi_hired_access_token',
        'new-access',
      );
      expect(mockSetItemAsync).toHaveBeenCalledWith(
        'hi_hired_refresh_token',
        'new-refresh',
      );
    });

    it('returns null when refresh fails', async () => {
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid refresh token' },
      });

      const { refreshAccessToken } = await import('../auth/token-refresh');

      const result = await refreshAccessToken('bad-refresh');

      expect(result).toBeNull();
    });
  });
});
