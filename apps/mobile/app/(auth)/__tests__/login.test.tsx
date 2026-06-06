import { describe, expect, it } from 'vitest';
import {
  APPLE_AUTH_DISABLED_COPY,
  APPLE_AUTH_ENABLED,
} from '@/lib/login-config';

describe('Login screen', () => {
  it('enables Apple auth entry point on iOS', () => {
    expect(APPLE_AUTH_ENABLED).toBe(true);
  });

  it('has a disabled copy string for fallback messaging', () => {
    expect(APPLE_AUTH_DISABLED_COPY).toMatch(/enabled in production/i);
  });
});
