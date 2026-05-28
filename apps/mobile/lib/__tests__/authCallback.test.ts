import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import {
  parseAuthCallbackParams,
  parseAuthCallbackUrl,
  completeAuthCallback,
} from '../authCallback';

const mockSession = { user: { id: 'user-1' } } as Session;

describe('parseAuthCallbackParams', () => {
  it('extracts PKCE code from query params', () => {
    expect(parseAuthCallbackParams({ code: 'pkce-code-123' }).code).toBe('pkce-code-123');
  });

  it('extracts token pair for implicit callback', () => {
    const params = parseAuthCallbackParams({
      access_token: 'at',
      refresh_token: 'rt',
    });
    expect(params.access_token).toBe('at');
    expect(params.refresh_token).toBe('rt');
  });

  it('surfaces provider error params', () => {
    const params = parseAuthCallbackParams({
      error: 'access_denied',
      error_description: 'User cancelled',
    });
    expect(params.error).toBe('access_denied');
    expect(params.error_description).toBe('User cancelled');
  });
});

describe('parseAuthCallbackUrl', () => {
  it('parses code from deep link URL', () => {
    const params = parseAuthCallbackUrl('hi-hired://auth/callback?code=abc123');
    expect(params.code).toBe('abc123');
  });
});

describe('completeAuthCallback', () => {
  const exchangeCodeForSession = vi.fn();
  const setSession = vi.fn();
  const getSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ data: { session: null } });
  });

  it('exchanges PKCE code for session', async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const result = await completeAuthCallback(
      {
        auth: { exchangeCodeForSession, setSession, getSession },
      },
      { code: 'pkce-code' }
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith('pkce-code');
    expect(result.session).toBe(mockSession);
    expect(result.error).toBeNull();
  });

  it('sets session from access and refresh tokens', async () => {
    setSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const result = await completeAuthCallback(
      {
        auth: { exchangeCodeForSession, setSession, getSession },
      },
      { access_token: 'at', refresh_token: 'rt' }
    );

    expect(setSession).toHaveBeenCalledWith({ access_token: 'at', refresh_token: 'rt' });
    expect(result.session).toBe(mockSession);
  });

  it('returns error when exchange fails', async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid code' },
    });

    const result = await completeAuthCallback(
      {
        auth: { exchangeCodeForSession, setSession, getSession },
      },
      { code: 'bad' }
    );

    expect(result.error).toBe('Invalid code');
    expect(result.session).toBeNull();
  });

  it('returns provider error without calling auth APIs', async () => {
    const result = await completeAuthCallback(
      {
        auth: { exchangeCodeForSession, setSession, getSession },
      },
      { error: 'access_denied', error_description: 'User cancelled' }
    );

    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(result.error).toBe('User cancelled');
  });

  it('falls back to existing session when no params', async () => {
    getSession.mockResolvedValue({ data: { session: mockSession } });

    const result = await completeAuthCallback(
      {
        auth: { exchangeCodeForSession, setSession, getSession },
      },
      {}
    );

    expect(result.session).toBe(mockSession);
  });
});
