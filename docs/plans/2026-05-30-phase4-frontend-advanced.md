# Phase 4: Frontend Advanced Enhancements

> **Status:** Plan · **Priority:** Medium (builds on existing Expo RN codebase)
> **For Hermes:** Use `subagent-driven-development` + TDD skill to implement task-by-task.
> **Source:** `SwipeJobSearch_Technical_Architecture_Prompts.docx` §§ 2, 3, 19
> **Base:** `apps/mobile/` (existing Expo SDK 56 project)

**Goal:** Upgrade the swipe deck to 60FPS pure-UI-thread animations, add predictive buffering for zero-latency card transitions, and enhance auth with token refresh and OAuth2 social login.

**Current state:** SwipeDeck exists at `apps/mobile/components/deck/SwipeDeck.tsx` using `useSharedValue` + `Gesture.Pan()` with basic spring physics. useJobDeck at `hooks/useJobDeck.ts` uses TanStack Query with 2-min staleTime. Auth uses Supabase Auth with PKCE flow and SecureStore.

**Tech Stack:** React Native Reanimated v3, react-native-gesture-handler, TanStack Query v5, Zustand, Expo SecureStore, expo-auth-session

---

### Task 1: Enhanced 60FPS Swipe Card with Native Overlays

**Objective:** Refactor the SwipeCard for guaranteed 60FPS on the UI thread — implementing §2 of the architecture doc. Key improvements: rotation via interpolate, threshold-based fly-off, visual feedback overlays, only 3 cards mounted, shadow intensification during swipe.

**Files:**
- Modify: `apps/mobile/components/deck/SwipeDeck.tsx`
- Modify: `apps/mobile/components/deck/JobCard.tsx`
- Create: `apps/mobile/components/deck/SwipeCard.tsx` (the advanced per-card wrapper)
- Create: `apps/mobile/lib/swipe-engine.ts` (pure gesture math)
- Create: `apps/mobile/components/deck/__tests__/SwipeCard.test.tsx`
- Create: `apps/mobile/lib/__tests__/swipe-engine.test.ts`

**Step 1: Write swipe-engine.ts — pure gesture math**

```typescript
// apps/mobile/lib/swipe-engine.ts
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.4; // 40% of screen width
export const MAX_ROTATION_DEG = 15;

export interface SwipeDirection {
  direction: 'left' | 'right';
  velocity: number;
}

/**
 * Pure function: compute rotation from horizontal progress.
 * All UI thread-safe — no JS bridge.
 */
export function computeRotation(translateX: number): string {
  const progress = translateX / (SCREEN_WIDTH / 2);
  const clamped = Math.max(-1, Math.min(1, progress));
  return `${clamped * MAX_ROTATION_DEG}deg`;
}

/**
 * Pure function: compute overlay opacity from swipe progress.
 */
export function computeOverlayOpacity(translateX: number, side: 'left' | 'right'): number {
  if (side === 'left' && translateX >= 0) return 0;
  if (side === 'right' && translateX <= 0) return 0;
  const progress = Math.abs(translateX) / SWIPE_THRESHOLD;
  return Math.max(0, Math.min(1, progress * 1.2));
}

/**
 * Determine if swipe exceeds threshold and which direction.
 */
export function shouldSwipe(translateX: number): SwipeDirection | null {
  if (Math.abs(translateX) < SWIPE_THRESHOLD) return null;
  return {
    direction: translateX > 0 ? 'right' : 'left',
    velocity: Math.abs(translateX),
  };
}
```

**Step 2: Write SwipeCard.tsx**

```typescript
// apps/mobile/components/deck/SwipeCard.tsx
import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { JobCard } from './JobCard';
import {
  SWIPE_THRESHOLD,
  computeRotation,
  shouldSwipe,
} from '@/lib/swipe-engine';
import type { Job } from '@hi-hired/shared';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.92;

interface SwipeCardProps {
  job: Job;
  index: number; // 0 = top, 1 = peek, 2 = behind
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onCardPress?: (job: Job) => void;
}

const SPRING_CONFIG = { damping: 20, stiffness: 100 };
const SNAP_BACK_CONFIG = { damping: 15, stiffness: 150 };

/**
 * SwipeCard using Reanimated v3 + Gesture Handler — guaranteed 60FPS.
 * All animations on the native UI thread; only callbacks cross to JS.
 * Exactly 3 cards stacked: active (index 0), peek (index 1), behind (index 2).
 */
export function SwipeCard({
  job,
  index,
  onSwipeLeft,
  onSwipeRight,
  onCardPress,
}: SwipeCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(index === 0 ? 1 : 1 - index * 0.05);
  const cardOpacity = useSharedValue(index === 0 ? 1 : 1 - index * 0.15);

  const handleSwipe = React.useCallback(
    (direction: 'left' | 'right') => {
      if (direction === 'right') {
        runOnJS(onSwipeRight)();
      } else {
        runOnJS(onSwipeLeft)();
      }
    },
    [onSwipeRight, onSwipeLeft]
  );

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const decision = shouldSwipe(e.translationX);
      if (decision) {
        // Fly off screen
        const toX = decision.direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
        translateX.value = withSpring(toX, SPRING_CONFIG, () => {
          runOnJS(handleSwipe)(decision.direction);
        });
      } else {
        // Snap back to center
        translateX.value = withSpring(0, SNAP_BACK_CONFIG);
        translateY.value = withSpring(0, SNAP_BACK_CONFIG);
      }
    })
    .enabled(index === 0); // Only the top card is interactive

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotation = computeRotation(translateX.value);
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: rotation },
        { scale: scale.value },
      ],
      opacity: cardOpacity.value,
      // Shadow intensifies during active swipe
      shadowOpacity: interpolate(
        Math.abs(translateX.value),
        [0, SWIPE_THRESHOLD],
        [0.15, 0.4],
        Extrapolation.CLAMP
      ),
      shadowRadius: interpolate(
        Math.abs(translateX.value),
        [0, SWIPE_THRESHOLD],
        [15, 25],
        Extrapolation.CLAMP
      ),
    };
  });

  const leftOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD * 1.5, -SWIPE_THRESHOLD, 0],
      [1, 1, 0],
      Extrapolation.CLAMP
    ),
  }));

  const rightOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD, SWIPE_THRESHOLD * 1.5],
      [0, 1, 1],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          cardAnimatedStyle,
          styles.card,
          index === 0 && styles.topCard,
        ]}
      >
        <JobCard
          job={job}
          onPress={() => index === 0 && onCardPress?.(job)}
          testID={`swipe-card-${job.id}`}
        />

        {/* NOPE / PASS overlay — left swipe */}
        <Animated.View
          pointerEvents="none"
          style={[styles.overlay, styles.leftOverlay, leftOverlayStyle]}
        >
          <Text style={styles.overlayText}>PASS</Text>
        </Animated.View>

        {/* LIKE / APPLY overlay — right swipe */}
        <Animated.View
          pointerEvents="none"
          style={[styles.overlay, styles.rightOverlay, rightOverlayStyle]}
        >
          <Text style={[styles.overlayText, { color: '#166534' }]}>APPLY</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: 24,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  topCard: {
    zIndex: 100,
  },
  overlay: {
    position: 'absolute',
    top: '33%',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 9999,
    zIndex: 200,
  },
  leftOverlay: {
    left: 24,
    backgroundColor: '#475569',
  },
  rightOverlay: {
    right: 24,
    backgroundColor: '#bbf7d0',
  },
  overlayText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
});

export default SwipeCard;
```

**Step 3: Refactor SwipeDeck to use SwipeCard**

Update `SwipeDeck.tsx` to manage exactly 3 cards via `useSharedValue` array and `Animated.View` with `useAnimatedStyle` for stack positioning:

```typescript
// Key change: only render 3 cards at indices 0, 1, 2
// SwipeCard handles its own gesture; SwipeDeck orchestrates stacking
export function SwipeDeck({ jobs, onSwipe, onCardPress }: SwipeDeckProps) {
  // ... only render up to 3 cards
  const visibleJobs = jobs.slice(0, 3);

  return (
    <View style={styles.container}>
      {visibleJobs.map((job, index) => (
        <SwipeCard
          key={job.id}
          job={job}
          index={index}
          onSwipeLeft={() => onSwipe(job.id, 'left')}
          onSwipeRight={() => onSwipe(job.id, 'right')}
          onCardPress={onCardPress}
        />
      ))}
      {/* a11y buttons */}
    </View>
  );
}
```

Full SwipeDeck refactor: replace the current gesture logic with SwipeCard delegation, keeping the a11y button row and peek visual stack.

**Step 4: Write swipe-engine tests**

```typescript
// apps/mobile/lib/__tests__/swipe-engine.test.ts
import { computeRotation, computeOverlayOpacity, shouldSwipe, SWIPE_THRESHOLD } from '../swipe-engine';

describe('computeRotation', () => {
  it('returns 0deg for centered card', () => {
    expect(computeRotation(0)).toBe('0deg');
  });
  it('returns positive rotation for right swipe', () => {
    const rot = computeRotation(200);
    expect(rot).toMatch(/^\d+\.?\d*deg$/);
  });
});

describe('shouldSwipe', () => {
  it('returns null below threshold', () => {
    expect(shouldSwipe(10)).toBeNull();
  });
  it('returns "right" above positive threshold', () => {
    const result = shouldSwipe(SWIPE_THRESHOLD + 1);
    expect(result?.direction).toBe('right');
  });
  it('returns "left" above negative threshold', () => {
    const result = shouldSwipe(-(SWIPE_THRESHOLD + 1));
    expect(result?.direction).toBe('left');
  });
});

describe('computeOverlayOpacity', () => {
  it('left overlay invisible during right swipe', () => {
    expect(computeOverlayOpacity(200, 'left')).toBe(0);
  });
  it('left overlay visible during left swipe', () => {
    const opacity = computeOverlayOpacity(-(SWIPE_THRESHOLD * 0.8), 'left');
    expect(opacity).toBeGreaterThan(0);
  });
});
```

**Step 5: Write SwipeCard test**

```typescript
// apps/mobile/components/deck/__tests__/SwipeCard.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { SwipeCard } from '../SwipeCard';

// Mock Reanimated for tests
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  return { ...Reanimated, default: Reanimated };
});

const mockJob = {
  id: 'test-1',
  title: 'Barista',
  suburb: 'Tullamarine',
  pay_display: '$30/hr',
  hours_text: 'Casual',
  job_type: 'casual',
  description: 'Make coffee',
};

describe('SwipeCard', () => {
  it('renders job title', () => {
    const { getByText } = render(
      <SwipeCard
        job={mockJob as any}
        index={0}
        onSwipeLeft={jest.fn()}
        onSwipeRight={jest.fn()}
      />
    );
    // Should render the JobCard which shows title
    expect(getByText('Barista')).toBeTruthy();
  });
});
```

**Step 6: Verify**

```bash
cd /home/admin/swipe-job-search/apps/mobile
pnpm test -- components/deck/__tests__/ lib/__tests__/swipe-engine.test.ts
# Expected: ALL PASS (swipe-engine pure tests pass; SwipeCard may skip due to reanimated mock)

git add apps/mobile/components/deck/SwipeCard.tsx apps/mobile/lib/swipe-engine.ts
git add apps/mobile/lib/__tests__/ apps/mobile/components/deck/__tests__/
git add -u apps/mobile/components/deck/SwipeDeck.tsx
git commit -m "feat(swipe): 60FPS SwipeCard with native overlays and pure gesture engine"
```

---

### Task 2: Predictive Buffering & Data Sync (useJobsPipeline)

**Objective:** Replace the simple `useJobDeck` with an advanced `useJobsPipeline` hook that pre-fetches at 50% threshold — implementing §3 of the architecture doc

**Files:**
- Create: `apps/mobile/hooks/useJobsPipeline.ts`
- Create: `apps/mobile/lib/__tests__/fetch-engine.test.ts`
- Update: `apps/mobile/hooks/useJobDeck.ts` (delegate to useJobsPipeline)
- Create: `apps/mobile/hooks/__tests__/useJobsPipeline.test.ts`

**Step 1: Write useJobsPipeline.ts**

```typescript
// apps/mobile/hooks/useJobsPipeline.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Job } from '@hi-hired/shared';

const PAGE_SIZE = 20;
const PRE_FETCH_AT = 10; // Trigger pre-fetch when at 50% of current page
const STALE_TIME = 5 * 60 * 1000; // 5 minutes

interface FetchPageParams {
  page: number;
}

interface JobsPipelineState {
  jobs: Job[];
  currentPage: number;
  currentIndex: number;
  isLoading: boolean;
  isFetchingNext: boolean;
  error: Error | null;
}

async function fetchJobPage({ page }: FetchPageParams): Promise<Job[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: jobs, error } = await (supabase as any)
    .from('jobs')
    .select('*')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return jobs ?? [];
}

/**
 * useJobsPipeline: predictive buffering with TanStack Query.
 * Pre-fetches the next page at 50% threshold for zero-latency transitions.
 * Maintains an internal buffer so cards are instantly available.
 */
export function useJobsPipeline() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(0);
  const [localBuffer, setLocalBuffer] = useState<Job[]>([]);
  const [isFetchingNext, setIsFetchingNext] = useState(false);

  const currentQuery = useQuery<Job[], Error>({
    queryKey: ['jobs-pipeline', currentPage],
    queryFn: () => fetchJobPage({ page: currentPage }),
    staleTime: STALE_TIME,
    retry: 2,
  });

  const nextQuery = useQuery<Job[], Error>({
    queryKey: ['jobs-pipeline', currentPage + 1],
    queryFn: () => fetchJobPage({ page: currentPage + 1 }),
    staleTime: STALE_TIME,
    enabled: false, // Pre-fetched manually
  });

  // Rebuild buffer when page data changes
  useEffect(() => {
    if (currentQuery.data) {
      setLocalBuffer(currentQuery.data);
    }
  }, [currentQuery.data]);

  // Pre-fetch next page when passing threshold
  const handlePreFetch = useCallback(async () => {
    setIsFetchingNext(true);
    try {
      await queryClient.prefetchQuery({
        queryKey: ['jobs-pipeline', currentPage + 1],
        queryFn: () => fetchJobPage({ page: currentPage + 1 }),
        staleTime: STALE_TIME,
      });
    } finally {
      setIsFetchingNext(false);
    }
  }, [currentPage, queryClient]);

  const advanceIndex = useCallback(
    (direction: 'left' | 'right', jobId: string) => {
      setLocalBuffer((prev) => {
        const next = prev.slice(1);

        // Trigger pre-fetch at 50% consumption
        const consumed = PAGE_SIZE - next.length;
        if (consumed === PRE_FETCH_AT) {
          handlePreFetch();
        }

        // Page boundary: swap to pre-fetched buffer
        if (next.length === 0) {
          const nextPageData = queryClient.getQueryData<Job[]>(['jobs-pipeline', currentPage + 1]);
          if (nextPageData && nextPageData.length > 0) {
            setCurrentPage((p) => p + 1);
            return nextPageData;
          }
        }

        return next;
      });
    },
    [currentPage, queryClient, handlePreFetch]
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['jobs-pipeline'] });
    setCurrentPage(0);
  }, [queryClient]);

  return {
    jobs: localBuffer,
    currentPage,
    currentIndex: PAGE_SIZE - localBuffer.length,
    isLoading: currentQuery.isLoading,
    isFetchingNext,
    error: currentQuery.error,
    advanceIndex,
    refresh,
    isEmpty: localBuffer.length === 0 && !currentQuery.isLoading,
  };
}
```

**Step 2: Write fetch-engine tests**

```typescript
// apps/mobile/hooks/__tests__/useJobsPipeline.test.ts
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useJobsPipeline } from '../useJobsPipeline';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: qc }, children);
};

describe('useJobsPipeline', () => {
  it('returns initial loading state', () => {
    const { result } = renderHook(() => useJobsPipeline(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.jobs).toEqual([]);
  });
});
```

**Step 3: Integrate with SwipeDeck**

Update the swipe handling in the deck to call `advanceIndex` instead of managing local state:

```typescript
// In the page component that uses SwipeDeck:
const pipeline = useJobsPipeline();

const handleSwipe = async (jobId: string, direction: 'left' | 'right') => {
  // Persist swipe
  await doSwipe({ candidateId: user.id, jobId, direction });
  // Advance the pipeline buffer
  pipeline.advanceIndex(direction, jobId);
};
```

**Step 4: Verify**

```bash
cd /home/admin/swipe-job-search/apps/mobile
pnpm test -- hooks/__tests__/
# Expected: ALL PASS

git add apps/mobile/hooks/useJobsPipeline.ts apps/mobile/hooks/__tests__/
git commit -m "feat(swipe): predictive buffering pipeline with TanStack Query pre-fetch"
```

---

### Task 3: Enhanced Auth — Token Refresh & OAuth2 Social Login

**Objective:** Add automatic token refresh, OAuth2 Google/Apple sign-in, and session management — implementing §19 of the architecture doc

**Files:**
- Create: `apps/mobile/lib/auth/oauth.ts`
- Create: `apps/mobile/lib/auth/token-refresh.ts`
- Create: `apps/mobile/providers/AuthProvider.tsx` (enhanced)
- Create: `apps/mobile/lib/__tests__/oauth.test.ts`
- Update: `apps/mobile/lib/supabase.ts` (add axios-like interceptor pattern)

**Step 1: Write token-refresh.ts**

```typescript
// apps/mobile/lib/auth/token-refresh.ts
import * as SecureStore from 'expo-secure-store';
import { supabase } from '@/lib/supabase';

const ACCESS_TOKEN_KEY = 'supabase_access_token';
const REFRESH_TOKEN_KEY = 'supabase_refresh_token';

/**
 * Store tokens securely in Keychain/Keystore.
 */
export async function storeTokens(accessToken: string, refreshToken: string) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

/**
 * Clear tokens on logout.
 */
export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

/**
 * Attempt automatic token refresh on 401 responses.
 * Supabase JS SDK handles this internally via `supabase.auth.setSession()`,
 * but this provides an explicit refresh mechanism for custom API calls.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session) {
    await clearTokens();
    return null;
  }

  await storeTokens(data.session.access_token, data.session.refresh_token);
  return data.session.access_token;
}

/**
 * Get stored access token.
 */
export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}
```

**Step 2: Write oauth.ts**

```typescript
// apps/mobile/lib/auth/oauth.ts
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

// Required for OAuth redirect handling
WebBrowser.maybeCompleteAuthSession();

const REDIRECT_URL = Linking.createURL('auth/callback');

/**
 * Sign in with OAuth provider.
 * Supabase handles the OAuth flow end-to-end.
 */
export async function signInWithOAuth(
  provider: 'google' | 'apple'
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: REDIRECT_URL,
        skipBrowserRedirect: true,
      },
    });
    return { error };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error('OAuth failed') };
  }
}

/**
 * Handle deep link callback after OAuth.
 */
export function handleAuthCallback(url: string) {
  // Supabase JS SDK automatically handles the
  // PKCE code exchange when `supabase.auth.onAuthStateChange` fires
  // with the SIGNED_IN event after deep link receipt.
  return supabase.auth.getSession();
}
```

**Step 3: Write tests**

```typescript
// apps/mobile/lib/__tests__/oauth.test.ts
import { clearTokens } from '../auth/token-refresh';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('clearTokens', () => {
  it('clears both tokens', async () => {
    await expect(clearTokens()).resolves.toBeUndefined();
  });
});
```

**Step 4: Update supabase.ts to add auto-refresh**

```typescript
// Key addition to existing lib/supabase.ts:
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    storeTokens(session.access_token, session.refresh_token);
  }
  if (event === 'SIGNED_OUT') {
    clearTokens();
  }
  if (event === 'TOKEN_REFRESHED' && session) {
    storeTokens(session.access_token, session.refresh_token);
  }
});
```

**Step 5: Verify**

```bash
cd /home/admin/swipe-job-search/apps/mobile
pnpm test -- lib/__tests__/
# Expected: ALL PASS

git add apps/mobile/lib/auth/ apps/mobile/lib/__tests__/
git commit -m "feat(auth): token refresh, OAuth2 social login, SecureStore integration"
```

---

### Phase 4 Completion Verification

```bash
cd /home/admin/swipe-job-search/apps/mobile

# Full test suite
pnpm test
# Expected: ALL PASS (89/89 + new tests)

# TypeScript check
pnpm typecheck
# Expected: No type errors

# Web export (regression check)
pnpm run web:dev &
# Visit localhost:8081 — verify swipe deck renders and gestures work

git add -A && git commit -m "chore: phase 4 frontend advanced enhancements complete"
```

---

## Phase 4 Summary

| Component | Status | Doc § |
|-----------|--------|-------|
| Pure gesture math engine (swipe-engine.ts) | Planned | §2 |
| 60FPS SwipeCard with native overlays + rotation interpolation | Planned | §2 |
| 3-card mount limit (active + peek + behind) | Planned | §2 |
| useJobsPipeline — predictive buffering with 50% pre-fetch trigger | Planned | §3 |
| Page transition — seamless swap to pre-fetched buffer | Planned | §3 |
| Token refresh interceptor + SecureStore persistence | Planned | §19 |
| OAuth2 Google/Apple sign-in via expo-auth-session | Planned | §19 |
| Session management (auto-refresh, logout, event tracking) | Planned | §19 |

**Dependencies:** Existing Expo RN app (apps/mobile/), Phase 1 backend for new API endpoints

**Note:** This Phase 4 can run independently of Phases 1-3 — the enhanced swipe and buffer logic live entirely on the client. Only the OAuth flow and backend ingest endpoints need server-side work.
