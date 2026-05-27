import { describe, expect, it } from 'vitest';
import {
  APPLE_AUTH_DISABLED_COPY,
  APPLE_AUTH_ENABLED,
} from '../login-config';

describe('Login screen', () => {
  it('disables Apple auth entry point until credentials are configured', () => {
    expect(APPLE_AUTH_ENABLED).toBe(false);
    expect(APPLE_AUTH_DISABLED_COPY).toMatch(/enabled in production/i);
  });
});
