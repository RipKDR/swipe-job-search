# Testing Strategy — Swipe Job Search

## 1. Test Pyramid

```
         /\
        /  \  E2E (Playwright)
       /    \  — Critical user flows only
      /──────\
     /        \  Integration (Vitest + Supabase local)
    /          \  — API routes, DB triggers, Edge Functions
   /────────────\
  /              \  Unit (Vitest + RTL)
 /                \  — Components, hooks, utilities
/──────────────────\
```

**Coverage target:** 80% overall, 90%+ for swipe logic and auth flows.

---

## 2. Unit Tests (Vitest + React Testing Library)

### Setup
```bash
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: { global: { lines: 80 } }
    }
  }
})
```

### Swipe Gesture Tests

```typescript
// tests/unit/SwipeDeck.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fireEvent } from '@testing-library/react'
import { SwipeDeck } from '@/components/SwipeDeck'
import { mockJobs } from '@/lib/mocks'

describe('SwipeDeck', () => {
  it('renders the top card in the deck', () => {
    render(<SwipeDeck jobs={mockJobs} onSwipe={vi.fn()} />)
    expect(screen.getByText(mockJobs[0].title)).toBeInTheDocument()
  })

  it('calls onSwipe with direction=right on right swipe', async () => {
    const onSwipe = vi.fn()
    render(<SwipeDeck jobs={mockJobs} onSwipe={onSwipe} />)
    
    const card = screen.getByTestId('job-card-0')
    fireEvent.pointerDown(card, { clientX: 0 })
    fireEvent.pointerMove(card, { clientX: 200 })
    fireEvent.pointerUp(card, { clientX: 200 })
    
    expect(onSwipe).toHaveBeenCalledWith(mockJobs[0].id, 'right')
  })

  it('calls onSwipe with direction=left on left swipe', async () => {
    const onSwipe = vi.fn()
    render(<SwipeDeck jobs={mockJobs} onSwipe={onSwipe} />)
    
    const card = screen.getByTestId('job-card-0')
    fireEvent.pointerDown(card, { clientX: 0 })
    fireEvent.pointerMove(card, { clientX: -200 })
    fireEvent.pointerUp(card, { clientX: -200 })
    
    expect(onSwipe).toHaveBeenCalledWith(mockJobs[0].id, 'left')
  })

  it('does NOT remove card if swipe distance is below threshold', () => {
    const onSwipe = vi.fn()
    render(<SwipeDeck jobs={mockJobs} onSwipe={onSwipe} />)
    
    const card = screen.getByTestId('job-card-0')
    fireEvent.pointerDown(card, { clientX: 0 })
    fireEvent.pointerMove(card, { clientX: 50 })  // below threshold
    fireEvent.pointerUp(card, { clientX: 50 })
    
    expect(onSwipe).not.toHaveBeenCalled()
    expect(screen.getByText(mockJobs[0].title)).toBeInTheDocument()
  })

  it('advances to next card after a completed swipe', async () => {
    const onSwipe = vi.fn()
    render(<SwipeDeck jobs={mockJobs} onSwipe={onSwipe} />)
    
    const card = screen.getByTestId('job-card-0')
    fireEvent.pointerDown(card, { clientX: 0 })
    fireEvent.pointerMove(card, { clientX: 200 })
    fireEvent.pointerUp(card, { clientX: 200 })
    
    // After swipe, deck advances to next card
    expect(await screen.findByText(mockJobs[1].title)).toBeInTheDocument()
  })

  it('shows empty state when all cards are exhausted', async () => {
    const singleJob = [mockJobs[0]]
    render(<SwipeDeck jobs={singleJob} onSwipe={vi.fn()} />)
    
    const card = screen.getByTestId('job-card-0')
    fireEvent.pointerDown(card, { clientX: 0 })
    fireEvent.pointerMove(card, { clientX: 200 })
    fireEvent.pointerUp(card, { clientX: 200 })
    
    expect(await screen.findByText(/no more jobs/i)).toBeInTheDocument()
  })
})
```

### useSwipe Hook Tests

```typescript
// tests/unit/useSwipe.test.ts
import { renderHook, act } from '@testing-library/react'
import { useSwipe } from '@/hooks/useSwipe'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) }) }
}))

describe('useSwipe', () => {
  it('posts swipe to backend and updates local state', async () => {
    const { result } = renderHook(() => useSwipe())
    
    await act(async () => {
      await result.current.swipe('job-123', 'right')
    })
    
    expect(result.current.swipedIds).toContain('job-123')
  })

  it('handles backend error gracefully (optimistic UI preserved)', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce({
      insert: vi.fn().mockResolvedValue({ error: new Error('Network error') })
    } as any)
    
    const { result } = renderHook(() => useSwipe())
    
    await act(async () => {
      await result.current.swipe('job-456', 'left')
    })
    
    // Swipe still registered locally even if backend fails
    expect(result.current.swipedIds).toContain('job-456')
  })
})
```

### Action Buttons Tests

```typescript
// tests/unit/ActionButtons.test.tsx
describe('ActionButtons', () => {
  it('calls onPass when ❌ clicked', async () => {
    const onPass = vi.fn()
    render(<ActionButtons onPass={onPass} onApply={vi.fn()} onSuper={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /pass/i }))
    expect(onPass).toHaveBeenCalledOnce()
  })

  it('calls onSuper when ⭐ clicked', async () => {
    const onSuper = vi.fn()
    render(<ActionButtons onPass={vi.fn()} onApply={vi.fn()} onSuper={onSuper} />)
    await userEvent.click(screen.getByRole('button', { name: /super/i }))
    expect(onSuper).toHaveBeenCalledOnce()
  })
  
  it('disables Super Apply when daily limit reached', () => {
    render(<ActionButtons onPass={vi.fn()} onApply={vi.fn()} onSuper={vi.fn()} supersRemaining={0} />)
    expect(screen.getByRole('button', { name: /super/i })).toBeDisabled()
    expect(screen.getByText('0 left today')).toBeInTheDocument()
  })
})
```

---

## 3. Integration Tests (Vitest + Supabase Local)

Run against a local Supabase instance (`supabase start`).

### Swipe API Route

```typescript
// tests/integration/api-swipe.test.ts
import { createTestUser, cleanupTestUser } from '../helpers/auth'

describe('POST /api/swipe', () => {
  let candidateId: string
  let jobId: string

  beforeEach(async () => {
    candidateId = await createTestUser('candidate')
    jobId = await createTestJob()
  })
  afterEach(() => cleanupTestUser(candidateId))

  it('creates a swipe record', async () => {
    const res = await fetch('/api/swipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${candidateToken}` },
      body: JSON.stringify({ job_id: jobId, direction: 'right' })
    })
    expect(res.status).toBe(200)
    
    const { data } = await supabase.from('swipes').select().eq('swiper_id', candidateId)
    expect(data).toHaveLength(1)
    expect(data[0].direction).toBe('right')
  })

  it('creates a match when both parties have swiped right', async () => {
    // Candidate swipes right on job
    await supabase.from('swipes').insert({ swiper_id: candidateId, target_id: jobId, direction: 'right' })
    
    // Recruiter swipes right on candidate
    const res = await fetch('/api/swipe', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${recruiterToken}` },
      body: JSON.stringify({ candidate_id: candidateId, job_id: jobId, direction: 'right' })
    })
    
    const { data: matches } = await supabase.from('matches').select().eq('job_id', jobId)
    expect(matches).toHaveLength(1)
  })

  it('prevents duplicate swipes via upsert', async () => {
    // Swipe twice on same job
    await fetch('/api/swipe', { method: 'POST', body: JSON.stringify({ job_id: jobId, direction: 'right' }) })
    await fetch('/api/swipe', { method: 'POST', body: JSON.stringify({ job_id: jobId, direction: 'left' }) })
    
    const { data } = await supabase.from('swipes').select().eq('swiper_id', candidateId).eq('target_id', jobId)
    expect(data).toHaveLength(1)  // upsert = only one record
  })

  it('returns 401 for unauthenticated requests', async () => {
    const res = await fetch('/api/swipe', { method: 'POST' })
    expect(res.status).toBe(401)
  })
})
```

### RLS Policy Tests

```typescript
// tests/integration/rls.test.ts
describe('RLS Policies', () => {
  it('candidate cannot see another candidate swipes', async () => {
    const userA = await createTestUser('candidate')
    const userB = await createTestUser('candidate')
    await supabase.from('swipes').insert({ swiper_id: userA.id, target_id: 'job-1', direction: 'right' })
    
    const { data } = await supabaseAs(userB).from('swipes').select()
    expect(data).toHaveLength(0)  // RLS blocks cross-user reads
  })

  it('candidate cannot read chat messages outside their matches', async () => {
    const match = await createTestMatch()
    const outsider = await createTestUser('candidate')
    
    const { data, error } = await supabaseAs(outsider).from('messages').select().eq('match_id', match.id)
    expect(data).toHaveLength(0)
  })
})
```

---

## 4. E2E Tests (Playwright)

Cover only the critical happy path — too many Playwright tests slow CI without adding proportional value.

### Setup
```bash
npm install -D @playwright/test
npx playwright install chromium
```

### Critical Flows to Test

```typescript
// tests/e2e/candidate-onboarding.spec.ts
test('candidate completes onboarding and makes first swipe', async ({ page }) => {
  await page.goto('/auth/login')
  await page.fill('[name=email]', 'test@example.com')
  await page.click('[data-testid=send-magic-link]')
  // ... simulate magic link click
  
  // Role selection
  await page.click('[data-testid=role-candidate]')
  
  // Profile setup
  await page.fill('[name=bio]', 'Experienced barista, 3 years specialty coffee')
  await page.click('[data-testid=continue]')
  
  // Deck view
  await expect(page.locator('[data-testid=job-card-0]')).toBeVisible()
  
  // Swipe right (via button for E2E reliability)
  await page.click('[data-testid=apply-button]')
  
  // Second card appears
  await expect(page.locator('[data-testid=job-card-0]')).toBeVisible()
})

test('match flow: candidate sees match overlay and opens chat', async ({ page }) => {
  // Seed: pre-existing reciprocal swipe ready to match
  await seedTestMatchCondition()
  
  await loginAsTestCandidate(page)
  await page.goto('/swipe')
  
  // Swipe right to trigger match
  await page.click('[data-testid=apply-button]')
  
  // Match overlay appears
  await expect(page.locator('[data-testid=match-overlay]')).toBeVisible()
  await expect(page.locator('[data-testid=match-overlay]')).toContainText("It's a Match!")
  
  // Open chat
  await page.click('[data-testid=start-chatting]')
  await expect(page).toHaveURL(/\/chat\//)
})
```

---

## 5. CI Configuration (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-integration:
    runs-on: ubuntu-latest
    services:
      supabase:
        image: supabase/postgres:15
        env:
          POSTGRES_PASSWORD: postgres
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx supabase db start
      - run: npm run test:coverage
      - name: Enforce 80% coverage
        run: npx vitest run --coverage --coverage.thresholds.global.lines=80

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci && npx playwright install --with-deps chromium
      - run: npm run build
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci && npx tsc --noEmit
```

---

## 6. Mock Data Strategy

```typescript
// lib/mocks.ts
export const mockJobs = [
  {
    id: 'job-001',
    title: 'Head Barista',
    company: 'St Ali Coffee',
    salary: '$24.50/hr',
    location: 'South Melbourne',
    tags: ['Specialty Coffee', 'Latte Art', 'Staff Meals'],
    images: ['/mocks/cafe-1.jpg'],
    description: 'Join our award-winning team at St Ali...',
  },
  // ... 19 more mock jobs covering: retail, tech, creative, hospitality
]

// Toggle: NEXT_PUBLIC_USE_MOCK_DATA=true skips Supabase calls
export const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'
```

All mock data uses realistic Melbourne businesses, suburbs, and AU salary figures — not "Acme Corp at $50,000".
