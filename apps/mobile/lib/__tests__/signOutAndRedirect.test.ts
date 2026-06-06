import { describe, expect, it, vi, beforeEach } from 'vitest';
import { signOutAndRedirect } from '../auth/signOutAndRedirect';

// Mock SecureStore (used by token-refresh for clearTokens)
const mockDeleteItemAsync = vi.fn();

vi.mock('expo-secure-store', () => ({
  deleteItemAsync: (...args: unknown[]) => mockDeleteItemAsync(...args),
}));

describe('signOutAndRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteItemAsync.mockResolvedValue(undefined);
  });

  it('signs out, clears tokens, and redirects to auth login', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    const replace = vi.fn();

    await signOutAndRedirect({ signOut, replace });

    expect(signOut).toHaveBeenCalledTimes(1);
    // Should clear both access and refresh tokens from SecureStore
    expect(mockDeleteItemAsync).toHaveBeenCalledTimes(2);
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('hi_hired_access_token');
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('hi_hired_refresh_token');
    expect(replace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('still redirects to login even when sign out fails (best-effort)', async () => {
    const signOut = vi.fn().mockRejectedValue(new Error('network'));
    const replace = vi.fn();

    // Should not throw — catches the error and redirects anyway
    await expect(
      signOutAndRedirect({ signOut, replace }),
    ).resolves.toBeUndefined();
    // Should still clear tokens even when signOut fails
    expect(mockDeleteItemAsync).toHaveBeenCalledTimes(2);
    expect(replace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('still redirects even when SecureStore clearTokens fails', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    const replace = vi.fn();
    mockDeleteItemAsync.mockRejectedValue(new Error('storage error'));

    await expect(
      signOutAndRedirect({ signOut, replace }),
    ).resolves.toBeUndefined();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/(auth)/login');
  });
});
