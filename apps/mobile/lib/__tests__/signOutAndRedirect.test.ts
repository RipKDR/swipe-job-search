import { describe, expect, it, vi } from 'vitest';
import { signOutAndRedirect } from '../auth/signOutAndRedirect';

describe('signOutAndRedirect', () => {
  it('signs out and redirects to auth login', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    const replace = vi.fn();

    await signOutAndRedirect({ signOut, replace });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('still redirects to login even when sign out fails (best-effort)', async () => {
    const signOut = vi.fn().mockRejectedValue(new Error('network'));
    const replace = vi.fn();

    // Should not throw — catches the error and redirects anyway
    await expect(signOutAndRedirect({ signOut, replace })).resolves.toBeUndefined();
    expect(replace).toHaveBeenCalledWith('/(auth)/login');
  });
});
