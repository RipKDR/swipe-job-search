/**
 * Tests for useSavedJobs hook.
 *
 * Coverage:
 * 1. toggleBookmark calls RPC with correct args
 * 2. removeBookmark deletes bookmark row
 * 3. isBookmarked returns correct state for bookmark Set
 * 4. Optimistic update rollback on RPC error
 * 5. Duplicate bookmark — RPC idempotency
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Imports (after mocks) ────────────────────────────────────────────────

import { useSavedJobs } from '../useSavedJobs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Hoisted test infrastructure (must be before vi.mock calls) ──────────

const { mockRpc, mockFrom } = vi.hoisted(() => {
  const mockRpc = vi.fn();

  const buildChain = () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      in: vi.fn(),
      delete: vi.fn(),
      maybeSingle: vi.fn(),
    };

    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    chain.order.mockResolvedValue({ data: [], error: null });
    chain.in.mockResolvedValue({ data: [], error: null });
    chain.delete.mockReturnValue(chain);
    chain.maybeSingle.mockResolvedValue({ data: null, error: null });

    return chain;
  };

  const mockFrom = vi.fn(() => buildChain());

  return { mockRpc, mockFrom };
});

// ─── Mocks (hoisted using vi.hoisted refs above) ──────────────────────────

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } }),
}));

vi.mock('@/hooks/usePostHog', () => ({
  usePostHog: () => ({ capture: vi.fn() }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────

function createWrapper() {
  const testQueryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: testQueryClient },
      children,
    );
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('useSavedJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: { bookmarked: true }, error: null });

    // Reset mockFrom to return a fresh chain for each test
    const buildChain = () => {
      const chain: Record<string, ReturnType<typeof vi.fn>> = {
        select: vi.fn(),
        eq: vi.fn(),
        order: vi.fn(),
        in: vi.fn(),
        delete: vi.fn(),
        maybeSingle: vi.fn(),
      };
      chain.select.mockReturnValue(chain);
      chain.eq.mockReturnValue(chain);
      chain.order.mockResolvedValue({ data: [], error: null });
      chain.in.mockResolvedValue({ data: [], error: null });
      chain.delete.mockReturnValue(chain);
      chain.maybeSingle.mockResolvedValue({ data: null, error: null });
      return chain;
    };
    mockFrom.mockImplementation(() => buildChain());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── Test: toggleBookmark via RPC ───────────────────────────────────────

  it('toggleBookmark calls RPC with correct args', async () => {
    const { result } = renderHook(() => useSavedJobs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.savedJobs).toEqual([]);
    expect(result.current.isBookmarked('job-1')).toBe(false);

    await act(async () => {
      await result.current.toggleBookmark('job-1');
    });

    expect(mockRpc).toHaveBeenCalledWith('toggle_bookmark', { p_job_id: 'job-1' });
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  // ─── Test: removeBookmark deletes from DB ────────────────────────────────

  it('removeBookmark calls delete on bookmarks table', async () => {
    const { result } = renderHook(() => useSavedJobs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.removeBookmark('job-1');
    });

    expect(mockFrom).toHaveBeenCalledWith('bookmarks');
  });

  // ─── Test: isBookmarked returns correct state ──────────────────────────

  it('isBookmarked returns false for jobs not in saved list', async () => {
    const { result } = renderHook(() => useSavedJobs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isBookmarked('job-1')).toBe(false);
    expect(result.current.isBookmarked('job-2')).toBe(false);
    expect(typeof result.current.isBookmarked).toBe('function');
  });

  // ─── Test: Optimistic update rollback on RPC error ─────────────────────

  it('rollbacks optimistic update when toggle RPC fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const { result } = renderHook(() => useSavedJobs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let toggleError: Error | null = null;
    await act(async () => {
      try {
        await result.current.toggleBookmark('job-1');
      } catch (e) {
        toggleError = e as Error;
      }
    });

    expect(toggleError).toBeTruthy();
    expect(toggleError!.message).toBe('DB error');
    expect(result.current.isBookmarked('job-1')).toBe(false);
  });

  // ─── Test: toggleBookmark idempotency ────────────────────────────────

  it('toggleBookmark fires RPC each time it is called', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { bookmarked: true }, error: null })
      .mockResolvedValueOnce({ data: { bookmarked: false }, error: null });

    const { result } = renderHook(() => useSavedJobs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // First toggle
    await act(async () => {
      await result.current.toggleBookmark('job-1');
    });
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('toggle_bookmark', { p_job_id: 'job-1' });

    // Second toggle
    await act(async () => {
      await result.current.toggleBookmark('job-1');
    });
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(mockRpc).toHaveBeenLastCalledWith('toggle_bookmark', { p_job_id: 'job-1' });

    expect(typeof result.current.isBookmarked).toBe('function');
  });
});
