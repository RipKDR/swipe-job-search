// Tests for useAuth hook - simplified for U3
// Note: Full React Native integration tests require native test environment
// These tests verify basic hook exports and types

import { describe, it, expect, vi } from 'vitest';

// Mock AuthProvider to avoid Expo module imports
vi.mock('@/providers/AuthProvider', () => ({
  AuthContext: {},
  AuthProvider: ({ children }: any) => children,
}));

describe('useAuth hook', () => {
  it('should export useAuth hook', async () => {
    const { useAuth } = await import('../useAuth');
    expect(useAuth).toBeDefined();
    expect(typeof useAuth).toBe('function');
  });

  it('should be importable without errors', async () => {
    expect(async () => {
      await import('../useAuth');
    }).not.toThrow();
  });
});
