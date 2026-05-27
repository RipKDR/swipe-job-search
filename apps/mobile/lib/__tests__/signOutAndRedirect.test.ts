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

  it('does not redirect when sign out fails', async () => {
    const signOut = vi.fn().mockRejectedValue(new Error('network'));
    const replace = vi.fn();

    await expect(signOutAndRedirect({ signOut, replace })).rejects.toThrow('network');
    expect(replace).not.toHaveBeenCalled();
  });
});
