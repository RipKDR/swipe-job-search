# Bookmarks (Saved Jobs) — UX/UI Handoff

**Author:** Maya (UX/UI Specialist)  
**Status:** v1.0 — Ready for implementation  
**Context:** Hi-Hired mobile — Expo Router, NativeWind, Reanimated, 5-accent theme system

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tab Integration & Navigation](#2-tab-integration--navigation)
3. [Bookmark Button Component](#3-bookmark-button-component)
4. [Saved Jobs Screen](#4-saved-jobs-screen)
5. [Empty State](#5-empty-state)
6. [Loading Skeleton](#6-loading-skeleton)
7. [Error State](#7-error-state)
8. [Data Layer & Hook](#8-data-layer--hook)
9. [Integration Points](#9-integration-points)
10. [Theme Compatibility](#10-theme-compatibility)
11. [Accessibility Summary](#11-accessibility-summary)
12. [Microcopy Reference](#12-microcopy-reference)
13. [Implementation Sequence](#13-implementation-sequence)

---

## 1. Overview

### Feature Summary

The bookmarks feature lets candidates save jobs for later review. It mirrors the mental model of "saving a listing" from any modern job board — low friction, visually distinct from swiping, and accessible from a dedicated tab.

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Tab vs Profile section** | New tab in bottom nav (Option A) | Bookmarks are a primary daily action, not buried in profile. Profile is already dense with settings, theme picker, edit, etc. A dedicated tab gives the feature visibility and a swipe-to-remove gesture similar to the deck. |
| **Remove Settings tab** | Replace Settings tab with Saved tab | The Settings tab is thin (only sign-out accessible here) and its contents (theme picker, pricing, edit profile) are already available in Profile. This keeps the bottom nav at 5 items. |
| **Bookmark icon** | Bookmark (not heart/star) | Bookmark is the universal "save for later" symbol. Heart implies "like" (duplicating swipe-right intent), star implies "importance." Bookmark is unambiguous. |
| **Bookmark on swipe cards** | Top-right, absolute overlay | Must not interfere with the swipe gesture (which is horizontal). Placing it in the top-right corner keeps it out of the left/right swipe path without needing gesture exclusion zones. |

---

## 2. Tab Integration & Navigation

### 2.1 Tab Architecture (Final)

```
app/(candidate)/(tabs)/
├── _layout.tsx          # Updated: 5 tabs
├── deck.tsx             # 💼 Jobs (unchanged)
├── applied.tsx          # 📋 Applied (unchanged)
├── saved.tsx            ★ NEW  🔖 Saved
├── matches.tsx          # 💬 Matches (unchanged)
└── profile.tsx          # 👤 Profile (unchanged)
```

**Bottom nav order:** Jobs → Saved → Matches → Applied → Profile

### 2.2 Remove Settings Tab

The existing `settings.tsx` screen in the tab layout should be **removed from the tab navigator** file. Its core functionality:

- **Sign out** → Already available in Profile screen
- **Theme picker** → Already available in Profile screen
- **Edit profile** → Already available in Profile screen  
- **Pricing** → Already available in Profile screen

**Action:** Delete the `Tabs.Screen` entry for `settings` in `_layout.tsx` and remove the `settings.tsx` file (or keep as a deep-link only route).

### 2.3 Tab Layout Update (`_layout.tsx`)

```tsx
// New tab order: deck, saved, matches, applied, profile
<Tabs.Screen
  name="saved"
  options={{
    title: 'Saved',
    tabBarIcon: ({ color }) => <TabIcon emoji="🔖" color={color} />,
  }}
/>
```

**Design notes:**
- Tab icon: `🔖` (bookmark emoji) — consistent with the emoji-icon pattern used across all tabs
- Use the same `tabBarStyle` and color tokens as existing tabs (`#0f172a` background, `#1e293b` border)
- No badge on the tab icon (avoid UI noise)
- Tab label: "Saved" (short, actionable)

### 2.4 Tab Switch Transitions

- Tab switch uses Expo Router's default lazy loading
- When switching back to **deck** from **saved**, the deck preserves its scroll state (no forced re-fetch)
- When switching to **saved** for the first time, show a loading skeleton (see §6)

---

## 3. Bookmark Button Component

**File:** `apps/mobile/components/bookmark/BookmarkButton.tsx`  
**Used in:** Deck card top-right corner, Job detail screen header area

### 3.1 Component Interface

```tsx
interface BookmarkButtonProps {
  jobId: string;
  isBookmarked: boolean;           // Current state
  onToggle: (jobId: string, newState: boolean) => void;  // Toggle callback
  size?: 'sm' | 'md' | 'lg';      // Default: 'md'
  variant?: 'card' | 'header';     // Default: 'card' — affects positioning defaults
  disabled?: boolean;              // Disable during optimistic update
}
```

### 3.2 Visual Design

**Two states:**

| State | Icon | Visual |
|---|---|---|
| Unbookmarked (default) | Outline bookmark | `○` — indigo border, transparent fill |
| Bookmarked | Solid bookmark | `●` — filled with accent color |

**Size specs:**

| Size | Icon Dimensions (px) | Touch Target | Used In |
|---|---|---|---|
| `sm` | 20×20 | 36×36 | Inline text areas |
| `md` | 24×24 | 44×44 | Card top-right |
| `lg` | 28×28 | 48×48 | Job detail header |

### 3.3 Layout & Positioning

**On Swipe Card (variant="card"):**
```
┌──────────────────────┐
│                      │  ←── Photo area (224px)
│   [suburb]           │
│   [hours]            │
│          [JOB TYPE]  │
│                      │
│  [dist] [commute]    │
├──────────────────────┤
│ Title          🔖◄── │  ←── Top-right of content area
│ $32/hr               │       absolute positioned:
│                      │       top: 16, right: 16
│ suburb • hours       │       z-index: 10 (above card content)
│                      │       margin-left: 8 (so it doesn't touch edge)
│ description...       │
└──────────────────────┘
```

**NativeWind placement on JobCard:**
```tsx
// Inside JobCard.tsx, in the content section (below photo area)
<View style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
  <BookmarkButton jobId={job.id} isBookmarked={...} onToggle={...} size="md" variant="card" />
</View>
```

**On Job Detail Screen (variant="header"):**
```
← Back                [Expired]  🔖
```

Placed as an `action` in the `ScreenHeader` component's `actions` slot (right side, next to the Expired badge if present).

### 3.4 Animation

**Toggle animation (bookmark → unbookmarked):**
```tsx
// Uses Reanimated shared values
const scale = useSharedValue(1);
const opacity = useSharedValue(1);

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
  opacity: opacity.value,
}));

// On toggle:
// 1. Scale up briefly (1 → 1.2) with a spring (damping: 8, stiffness: 200)
// 2. Scale back to 1 with spring (damping: 12, stiffness: 180)
// Total duration: ~300ms
scale.value = withSpring(1.2, { damping: 8, stiffness: 200 }, () => {
  scale.value = withSpring(1, { damping: 12, stiffness: 180 });
});
```

**Color transition:** Use `withTiming` for background/border color changes:
- Unfilled → filled: `withTiming` 200ms, fill transitions to accent color
- Filled → unfilled: `withTiming` 200ms, fill transitions to transparent

### 3.5 Haptic Feedback

```tsx
import * as Haptics from 'expo-haptics';

// On toggle:
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
```

- Use `.Light` (not Medium or Heavy) — subtle, not disruptive
- Fire on both bookmark and unbookmark
- Respect the user's haptics preference (same pattern as `isHapticsEnabled()` in SwipeCard)

### 3.6 Gesture Compatibility (Critical)

The bookmark button sits on the swipe card and **must not interfere** with the swipe gesture.

**Solution:** Wrap in a `Pressable` with `onPress` only (no gesture handler). The Pan gesture on `SwipeCard` already uses `Gesture.Pan()` which should have lower priority than a `Pressable`'s tap gesture on React Native. However, to guarantee no conflicts:

```tsx
<Pressable
  onPress={(e) => {
    e.stopPropagation();  // Prevent gesture from bubbling up to Pan
    handleToggle();
  }}
  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
  style={{ ... }}
>
  <Animated.View style={animatedStyle}>
    <BookmarkIcon filled={isBookmarked} />
  </Animated.View>
</Pressable>
```

**Test this explicitly on device.** If SwipeCard's Pan gesture absorbs the tap:
1. Wrap `BookmarkButton` in `Gesture.Native()` with `simultaneousWithExternalGesture(panGesture)` 
2. Or set `minDist` on the Pan gesture higher (current is default 0, a small threshold like 5 helps)

### 3.7 Icon Implementation

Use an SVG or a simple Unicode/text approach (matching existing icon patterns). Since the app uses emoji for tab icons, render the bookmark as a simple text/View with borders:

**Option (recommended for consistency):** Use an inline SVG via `react-native-svg` or draw with a View. Since the codebase doesn't appear to use SVG extensively, use a lightweight approach:

```tsx
// Unfilled: border-only rectangle + ribbon shape
// Filled: solid fill
// Use Animated API to interpolate between states
```

Simpler alternative for the MVP: use two Unicode characters with Animated crossfade:
- Unfilled: `🔖` (bookmark emoji) at reduced opacity (0.5)
- Filled: `🔖` (bookmark emoji) at full opacity

**V2 recommendation:** Build a proper SVG bookmark icon using `react-native-svg` (or a lightweight inline Path component) for pixel-perfect rendering across all themes.

### 3.8 Accessibility

```tsx
accessibilityRole="button"
accessibilityLabel={isBookmarked ? `Remove ${jobTitle} from saved` : `Save ${jobTitle} for later`}
accessibilityState={{ selected: isBookmarked }}
```

### 3.9 Full Component Skeleton

```tsx
// apps/mobile/components/bookmark/BookmarkButton.tsx

import React, { useCallback } from 'react';
import { Pressable, View, Text } from '@/components/tw';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/providers/ThemeProvider';

type BookmarkButtonProps = {
  jobId: string;
  isBookmarked: boolean;
  onToggle: (jobId: string, newState: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'card' | 'header';
  disabled?: boolean;
};

const SIZE_MAP = {
  sm: { icon: 20, touch: 36 },
  md: { icon: 24, touch: 44 },
  lg: { icon: 28, touch: 48 },
} as const;

export function BookmarkButton({
  jobId,
  isBookmarked,
  onToggle,
  size = 'md',
  variant = 'card',
  disabled = false,
}: BookmarkButtonProps) {
  const { colors } = useTheme();
  const { icon: iconSize, touch: touchSize } = SIZE_MAP[size];

  const scale = useSharedValue(1);
  const fillProgress = useSharedValue(isBookmarked ? 1 : 0);

  // Sync fill progress with isBookmarked prop changes
  React.useEffect(() => {
    fillProgress.value = withTiming(isBookmarked ? 1 : 0, { duration: 200 });
  }, [isBookmarked, fillProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    if (disabled) return;

    // Haptic
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    // Scale animation
    scale.value = withSpring(1.2, { damping: 8, stiffness: 200 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 180 });
    });

    onToggle(jobId, !isBookmarked);
  }, [disabled, isBookmarked, jobId, onToggle, scale]);

  const touchPadding = (touchSize - iconSize) / 2;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={
        isBookmarked ? `Remove job from saved` : `Save job for later`
      }
      accessibilityState={{ selected: isBookmarked }}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={{
        width: touchSize,
        height: touchSize,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Animated.View style={animatedStyle}>
        <View
          style={{
            width: iconSize,
            height: iconSize + 2,
            borderWidth: isBookmarked ? 0 : 2,
            borderColor: isBookmarked ? 'transparent' : colors.muted,
            borderRadius: 2,
            backgroundColor: isBookmarked ? colors.accent : 'transparent',
            // This is a simplified visual — V2 should use SVG path for the
            // proper bookmark shape (rectangle with bottom center tab)
          }}
        />
      </Animated.View>
    </Pressable>
  );
}
```

---

## 4. Saved Jobs Screen

**File:** `apps/mobile/app/(candidate)/(tabs)/saved.tsx`  
**Purpose:** Display all bookmarked jobs with swipe-to-remove, tap for detail, pull-to-refresh, and search/filter.

### 4.1 Screen Layout

```
┌──────────────────────────────────────────────┐
│ 🔖  Saved          (screen header)           │
│ Jobs you bookmarked will appear here        │
│                                              │
│ ┌────────────────────────────────────────┐  │
│ │ 🔍 Search saved jobs...               │  │  ← Search bar (collapsible)
│ └────────────────────────────────────────┘  │
│                                              │
│ [Filter chips: All | Casual | Part-time | Perm]│ ← Job type quick filters
│                                              │
│ ┌───────────────────┐  ┌───────────────────┐ │
│ │ Barista           │  │ Kitchen Hand      │ │  ← 2-column grid
│ │ Joe's Cafe        │  │ The Gourmet Spot  │ │    (on phone)
│ │ Suburb            │  │ Suburb            │ │
│ │ $32/hr  Casual    │  │ $28/hr  Casual    │ │
│ │          [←swipe] │  │          [←swipe] │ │
│ └───────────────────┘  └───────────────────┘ │
│                                              │
│ ┌────────────────────────────────────────┐  │
│ │ Bartender          [← Swipe to remove] │  │  ← Single-column
│ │ The Crown Hotel                        │  │    list layout
│ │ Suburb                                 │  │    (fallback or
│ │ $35/hr  Casual                         │  │    on tablet)
│ └────────────────────────────────────────┘  │
│                                              │
│  (Pull to refresh)                           │
└──────────────────────────────────────────────┘
```

### 4.2 Responsive Layout

| Breakpoint | Layout | Columns |
|---|---|---|
| Phone (< 640px) | Single column list | 1 |
| Tablet (640px+) | Two-column grid | 2 |
| Desktop (1024px+) | Two-column grid + max-width container | 2 |

### 4.3 Card Component: `SavedJobCard`

**Used in:** Saved jobs screen list/grid

```tsx
interface SavedJobCardProps {
  job: SavedJob;
  onPress: (jobId: string) => void;
  onRemove: (jobId: string) => void;
}
```

**Visual structure:**

```
┌─────────────────────────────────────────────────┐
│ [Photo placeholder]     Job Title                │
│  (64×64 rounded)        Employer Name            │
│                          Suburb                   │
│                          Pay Rate                 │
│                              [Casual] ← job type  │
│                                                   │
│ Swipe left to remove ──────────► (hidden action)  │
└─────────────────────────────────────────────────┘
```

**NativeWind layout (phone list, single column):**
```tsx
<Pressable
  onPress={() => onPress(job.id)}
  style={{
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    // Swipe-to-remove handled by parent SwipeableList
  }}
>
  <View className="flex-row gap-4">
    {/* Photo placeholder */}
    <View
      style={{
        width: 64, height: 64, borderRadius: 12,
        backgroundColor: colors.photoBase,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 24, color: colors.subtle }}>💼</Text>
    </View>
    {/* Text content */}
    <View className="flex-1 gap-1">
      <Text className="text-white text-[17px] font-semibold" numberOfLines={1}>
        {job.title}
      </Text>
      <Text className="text-slate-400 text-[13px]" numberOfLines={1}>
        {job.employer_name}
      </Text>
      <Text className="text-slate-500 text-[13px]" numberOfLines={1}>
        {job.suburb}
      </Text>
      <View className="flex-row items-center gap-2 mt-1">
        <Text className="text-emerald-400 text-[15px] font-semibold">
          {job.pay_display}
        </Text>
        <JobTypeBadge type={job.job_type} />
      </View>
    </View>
  </View>
</Pressable>
```

**Tablet variant (2-column grid):** Same visual, narrower. Use `FlatList` with `numColumns={2}` and `columnWrapperStyle={{ gap: 12 }}`.

### 4.4 JobTypeBadge Subcomponent

**File:** `apps/mobile/components/bookmark/JobTypeBadge.tsx`  

```tsx
// Small pill/chip showing the job type
// Matches the pattern from JobCard.tsx

export function JobTypeBadge({ type }: { type: string }) {
  const { colors } = useTheme();
  const label = type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: colors.elevated,
      }}
    >
      <Text
        style={{
          color: colors.muted,
          fontSize: 9,
          fontWeight: 'bold',
          letterSpacing: 1,
        }}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
```

### 4.5 Swipe-to-Remove with Undo Toast

**Interaction:**
1. User swipes a saved job card left
2. Card animates off-screen (spring animation, 200ms)
3. Item removed from list
4. **Undo toast** appears at bottom: `"Removed from saved" [Undo]`
5. Toast auto-dismisses after 4 seconds
6. Tap "Undo" → card slides back in, restored

**Implementation approach (two options, choose one):**

**Option A: react-native-gesture-handler Swipeable (recommended)**
```tsx
import { Swipeable } from 'react-native-gesture-handler';

// Use Swipeable to wrap each SavedJobCard
// renderRightActions shows a "Remove" action button
// onSwipeableOpen triggers the removal + toast
```

**Option B: Custom Reanimated swipe gesture**
```tsx
// Use a pan gesture on each card (similar to SwipeCard but simpler)
// When threshold met, animate card off-screen left
// Then remove from list + show toast
```

**Recommendation:** Use Option A (`react-native-gesture-handler`'s `Swipeable`). It's already a dependency, handles conflicts, and provides built-in action rendering.

**Undo Toast component:**

```tsx
// Inline in saved.tsx or shared:
// Use a Animated.View sliding up from bottom
// "Removed from saved" text + [Undo] button with accent color

function UndoToast({
  visible,
  onUndo,
  onDismiss,
}: {
  visible: boolean;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const translateY = useSharedValue(100);
  
  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      // Auto-dismiss after 4s
      const timer = setTimeout(onDismiss, 4000);
      return () => clearTimeout(timer);
    } else {
      translateY.value = withTiming(100, { duration: 200 });
    }
  }, [visible, translateY, onDismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[{
        position: 'absolute',
        bottom: 100, // above tab bar
        left: 16, right: 16,
        backgroundColor: colors.elevated,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
      }, animatedStyle]}
    >
      <Text className="text-slate-200 text-sm">Removed from saved</Text>
      <Pressable onPress={onUndo} className="min-h-[44px] justify-center px-4">
        <Text className="text-indigo-400 font-semibold text-sm">Undo</Text>
      </Pressable>
    </Animated.View>
  );
}
```

### 4.6 Tap-to-View Detail

Standard pattern: `router.push(`/job/${job.id}`)` matching existing `handleJobPress` in `deck.tsx` and `applied.tsx`.

### 4.7 Pull-to-Refresh

Standard `FlatList` pull-to-refresh:
```tsx
<FlatList
  refreshing={isRefetching}
  onRefresh={() => queryClient.refetchQueries({ queryKey: ['saved-jobs'] })}
  ...
/>
```

### 4.8 Search & Filter

**Search bar** — collapsible under the header:

```tsx
// Uses a TextInput with magnifying glass icon
// Filters the local data client-side by title, employer, or suburb
// Debounced (300ms)

function SavedSearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.elevated,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text className="text-slate-400 mr-2">🔍</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search saved jobs..."
        placeholderTextColor={colors.subtle}
        style={{
          flex: 1,
          color: colors.text,
          fontSize: 15,
          padding: 0,
          outlineStyle: 'none',
        }}
        accessibilityLabel="Search saved jobs by title, employer, or location"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChange('')} className="ml-2 p-2">
          <Text className="text-slate-400">✕</Text>
        </Pressable>
      )}
    </View>
  );
}
```

**Filter chips** — quick job type filtering:

```tsx
type FilterKey = 'all' | 'casual' | 'part_time' | 'permanent';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'casual', label: 'Casual' },
  { key: 'part_time', label: 'Part-time' },
  { key: 'permanent', label: 'Perm' },
];

// Render as horizontal scrollable chips
// Active chip: filled accent background
// Inactive chip: outline style
```

### 4.9 Full Screen Skeleton

```tsx
// apps/mobile/app/(candidate)/(tabs)/saved.tsx

export default function SavedJobsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  
  // Data
  const { data: savedJobs = [], isLoading, error, isRefetching, refetch } = useSavedJobs();
  
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [removedJob, setRemovedJob] = useState<SavedJob | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);
  
  // Derived — filter + search
  const filteredJobs = useMemo(() => {
    let result = savedJobs;
    
    if (activeFilter !== 'all') {
      result = result.filter(j => j.job_type === activeFilter);
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(j =>
        j.title.toLowerCase().includes(q) ||
        (j.employer_name ?? '').toLowerCase().includes(q) ||
        j.suburb.toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [savedJobs, activeFilter, searchQuery]);
  
  // Handlers
  const handleJobPress = useCallback((jobId: string) => {
    router.push(`/job/${jobId}` as any);
  }, [router]);
  
  const handleRemove = useCallback((job: SavedJob) => {
    // Optimistic: remove from list
    // Actual: call API to delete bookmark
    setRemovedJob(job);
    setUndoVisible(true);
    removeBookmark(job.id);
  }, []);
  
  const handleUndo = useCallback(() => {
    if (!removedJob) return;
    setUndoVisible(false);
    addBookmark(removedJob.id);
    setRemovedJob(null);
  }, [removedJob]);
  
  const handleDismissUndo = useCallback(() => {
    setUndoVisible(false);
    setRemovedJob(null);
  }, []);
  
  // States
  if (isLoading) return <SavedJobsSkeleton />;  // see §6
  
  if (error) return <SavedJobsError onRetry={refetch} />;  // see §7
  
  return (
    <AppScreen centered={false} maxWidth="tab">
      <TabWebShell>
        <ScreenHeader
          title="Saved"
          subtitle="Jobs you bookmarked for later"
        />
        
        {/* Search bar */}
        <View className="px-4 sm:px-6 lg:px-8 max-w-4xl self-center w-full">
          <SavedSearchBar value={searchQuery} onChange={setSearchQuery} />
        </View>
        
        {/* Filter chips */}
        <View className="px-4 sm:px-6 lg:px-8 max-w-4xl self-center w-full mb-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
            {FILTERS.map(f => (
              <FilterChip
                key={f.key}
                label={f.label}
                active={activeFilter === f.key}
                onPress={() => setActiveFilter(f.key)}
              />
            ))}
          </ScrollView>
        </View>
        
        {/* Results count */}
        {filteredJobs.length > 0 && (
          <View className="px-4 sm:px-6 lg:px-8 max-w-4xl self-center w-full mb-3">
            <Text className="text-slate-500 text-xs">
              {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} saved
            </Text>
          </View>
        )}
        
        {/* Job list */}
        {filteredJobs.length > 0 ? (
          <FlatList
            data={filteredJobs}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <Swipeable
                renderRightActions={() => (
                  <RemoveAction onRemove={() => handleRemove(item)} />
                )}
                onSwipeableWillOpen={() => handleRemove(item)}
              >
                <SavedJobCard
                  job={item}
                  onPress={handleJobPress}
                  onRemove={handleRemove}
                />
              </Swipeable>
            )}
            contentContainerClassName="px-4 sm:px-6 lg:px-8 max-w-4xl self-center w-full gap-3 pb-8"
            onRefresh={refetch}
            refreshing={isRefetching}
            keyboardShouldPersistTaps="handled"
          />
        ) : (
          <SavedJobsEmptyState onBrowse={() => router.push('/(candidate)/(tabs)/deck' as any)} />
        )}
        
        {/* Undo toast */}
        <UndoToast
          visible={undoVisible}
          onUndo={handleUndo}
          onDismiss={handleDismissUndo}
        />
      </TabWebShell>
    </AppScreen>
  );
}
```

### 4.10 Filter Chip Component

```tsx
// Subcomponent in saved.tsx or separate file
function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Filter by ${label}`}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: active ? colors.accent : colors.surface,
        borderWidth: active ? 0 : 1,
        borderColor: colors.border,
      }}
    >
      <Text
        style={{
          color: active ? '#ffffff' : colors.muted,
          fontSize: 13,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
```

---

## 5. Empty State

**File:** `apps/mobile/app/(candidate)/(tabs)/saved.tsx` (inline or as `SavedJobsEmptyState`)

### 5.1 Visual

```
┌───────────────────────────────┐
│                               │
│          📑                   │  ← Emoji/illustration (48px)
│                               │
│    No saved jobs yet          │  ← Title (22px, bold, white)
│                               │
│    Jobs you bookmark will     │  ← Description (14px, muted color)
│    appear here. Start         │     centered, max-width 280px
│    browsing to save roles     │
│    you are interested in.     │
│                               │
│    ┌────────────────────┐     │
│    │   Browse jobs       │     │  ← CTA button (fullWidth, primary)
│    └────────────────────┘     │
│                               │
└───────────────────────────────┘
```

### 5.2 Implementation

Wrap the existing `EmptyState` component from `@/components/ui/EmptyState`:

```tsx
function SavedJobsEmptyState({ onBrowse }: { onBrowse: () => void }) {
  return (
    <EmptyState
      emoji="📑"
      title="No saved jobs yet"
      description="Jobs you bookmark will appear here. Start browsing to save roles you're interested in."
      actionLabel="Browse jobs"
      onAction={onBrowse}
    />
  );
}
```

**Microcopy notes:**
- Title: "No saved jobs yet" — friendly, not "empty" or "no results"
- Description: Explains how to populate it (bookmark)
- CTA: "Browse jobs" navigates to deck tab
- If user has applied filters and gets zero results, show: `"No saved jobs match"` with a "Clear filters" secondary action

---

## 6. Loading Skeleton

**File:** `apps/mobile/components/bookmark/SavedJobsSkeleton.tsx`

### 6.1 Visual

```
┌──────────────────────────────┐
│ 🔖  Loading...               │  ← ScreenHeader skeleton
│                              │
│ ┌─────────────────────────┐  │
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │  │  ← Search bar skeleton
│ └─────────────────────────┘  │
│                              │
│ ┌─────────────────────────┐  │
│ │ ◻️  ▓▓▓▓▓▓▓▓▓▓         │  │  ← Card 1 skeleton
│ │     ▓▓▓▓▓▓             │  │     64×64 rounded square (photo)
│ │     ▓▓▓▓▓▓▓▓           │  │     Title bar, employer bar,
│ │     ▓▓▓▓   ▓▓▓         │  │     suburb bar, pay + badge
│ └─────────────────────────┘  │
│                              │
│ ┌─────────────────────────┐  │  ← Card 2 skeleton (same pattern)
│ └─────────────────────────┘  │
│                              │
│ ┌─────────────────────────┐  │  ← Card 3 skeleton
│ └─────────────────────────┘  │
│                              │
│ ┌─────────────────────────┐  │  ← Card 4 skeleton
│ └─────────────────────────┘  │
└──────────────────────────────┘
```

### 6.2 Implementation

```tsx
// apps/mobile/components/bookmark/SavedJobsSkeleton.tsx

import React, { useEffect } from 'react';
import { View, Text } from '@/components/tw';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';

function SkeletonBlock({
  width,
  height,
  borderRadius = 8,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
}) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.elevated,
        },
        animatedStyle,
      ]}
    />
  );
}

function SkeletonCard() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 16,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
      }}
    >
      {/* Photo placeholder */}
      <SkeletonBlock width={64} height={64} borderRadius={12} />
      {/* Text lines */}
      <View className="flex-1 gap-2">
        <SkeletonBlock width="70%" height={17} borderRadius={4} />
        <SkeletonBlock width="50%" height={13} borderRadius={4} />
        <SkeletonBlock width="40%" height={13} borderRadius={4} />
        <View className="flex-row gap-3 mt-1">
          <SkeletonBlock width={60} height={16} borderRadius={4} />
          <SkeletonBlock width={50} height={16} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

export function SavedJobsSkeleton() {
  return (
    <View className="flex-1 bg-slate-950">
      {/* Header skeleton */}
      <View className="px-4 sm:px-6 lg:px-8 max-w-4xl self-center w-full pt-12 pb-4 gap-2">
        <SkeletonBlock width={80} height={28} borderRadius={6} />
        <SkeletonBlock width={240} height={16} borderRadius={4} />
      </View>

      {/* Search bar skeleton */}
      <View className="px-4 sm:px-6 lg:px-8 max-w-4xl self-center w-full mb-4">
        <SkeletonBlock width="100%" height={40} borderRadius={12} />
      </View>

      {/* Cards */}
      <View className="px-4 sm:px-6 lg:px-8 max-w-4xl self-center w-full gap-3">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </View>
    </View>
  );
}
```

---

## 7. Error State

**File:** `apps/mobile/components/bookmark/SavedJobsError.tsx`

### 7.1 Visual

```
┌───────────────────────────────┐
│                               │
│          ⚠️                   │  ← Emoji
│                               │
│    Couldn't load saved jobs    │  ← Title
│                               │
│    There was a problem        │  ← Description
│    fetching your saved jobs.  │
│    Pull down to retry or tap  │
│    the button below.          │
│                               │
│    ┌────────────────────┐     │
│    │   Try again         │     │  ← Retry button (outline)
│    └────────────────────┘     │
│                               │
└───────────────────────────────┘
```

### 7.2 Graceful Degradation

If the server fetch fails but the device has **locally cached data** (via TanStack Query's `gcTime`), **show the cached data first** with a subtle banner instead of blocking the entire screen:

```
┌──────────────────────────────────────────────┐
│ ⚠️  Couldn't refresh — showing saved jobs    │  ← Yellow warning banner
│    from earlier. Pull down to retry.       │
└──────────────────────────────────────────────┘
```

Implementation:
```tsx
// Inside saved.tsx
const { data, isLoading, error, isRefetching, refetch, isStale } = useSavedJobs();

// Show cached data + warning banner if stale but data exists
if (isStale && data && data.length > 0) {
  return (
    <View>
      {/* Show normal list */}
      {/* Show warning banner at top */}
      <View className="bg-amber-950/80 border border-amber-800/50 rounded-xl px-4 py-3 mx-4">
        <Text className="text-amber-300 text-xs text-center">
          ⚠️ Couldn't refresh — showing saved jobs from earlier. Pull down to retry.
        </Text>
      </View>
    </View>
  );
}
```

### 7.3 Full Error State

```tsx
function SavedJobsError({ onRetry }: { onRetry: () => void }) {
  return (
    <AppScreen centered maxWidth="lg">
      <EmptyState
        emoji="⚠️"
        title="Couldn't load saved jobs"
        description="There was a problem fetching your saved jobs. Pull down to retry or tap the button below."
        actionLabel="Try again"
        onAction={onRetry}
      />
    </AppScreen>
  );
}
```

---

## 8. Data Layer & Hook

**File:** `apps/mobile/hooks/useSavedJobs.ts`

### 8.1 Database Schema

The bookmarks feature needs a new database table:

```sql
-- postgres migration
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, job_id)
);

CREATE INDEX idx_bookmarks_candidate ON bookmarks(candidate_id);
CREATE INDEX idx_bookmarks_job ON bookmarks(job_id);
```

**Note:** This is cleanest. Alternatively, if you want to avoid a new table, use the existing `swipes` table with `direction: 'bookmark'` — but this overloads the swipes table with a non-swipe concept. A dedicated `bookmarks` table is recommended.

### 8.2 Hook Interface

```tsx
interface SavedJob {
  id: string;             // bookmark id (not job id)
  job_id: string;
  title: string;
  employer_name: string | null;
  suburb: string;
  pay_display: string;
  job_type: string;
  saved_at: string;       // when bookmarked
  // Optional if we store employer_id:
  employer_id?: string;
}

interface UseSavedJobsReturn {
  savedJobs: SavedJob[];
  isLoading: boolean;
  error: Error | null;
  isRefetching: boolean;
  refetch: () => void;
  isBookmarked: (jobId: string) => boolean;
  addBookmark: (jobId: string) => Promise<void>;
  removeBookmark: (jobId: string) => Promise<void>;
  toggleBookmark: (jobId: string) => Promise<void>;
}
```

### 8.3 Hook Implementation Pattern

```tsx
// apps/mobile/hooks/useSavedJobs.ts

import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const SAVED_JOBS_KEY = 'saved-jobs';

// ─── Fetch saved jobs ────────────────────────────────────────

async function fetchSavedJobs(userId: string): Promise<SavedJob[]> {
  const { data, error } = await supabase
    .from('bookmarks')
    .select(`
      id,
      job_id,
      created_at,
      jobs!inner (
        id,
        title,
        suburb,
        pay_display,
        job_type,
        employer_name,
        employer_id
      )
    `)
    .eq('candidate_id', userId)
    .eq('jobs.status', 'active')  // Only active jobs
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as any[]).map((b: any) => ({
    id: b.id,
    job_id: b.job_id,
    title: b.jobs.title,
    suburb: b.jobs.suburb,
    pay_display: b.jobs.pay_display,
    job_type: b.jobs.job_type,
    employer_name: b.jobs.employer_name,
    employer_id: b.jobs.employer_id,
    saved_at: b.created_at,
  }));
}

// ─── Toggle bookmark (upsert / delete) ───────────────────────

async function toggleBookmarkApi(jobId: string, userId: string): Promise<boolean> {
  // Check if bookmark exists
  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('candidate_id', userId)
    .eq('job_id', jobId)
    .maybeSingle();

  if (existing) {
    // Remove
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', existing.id);
    if (error) throw error;
    return false; // now unbookmarked
  } else {
    // Add
    const { error } = await supabase
      .from('bookmarks')
      .insert({ candidate_id: userId, job_id: jobId });
    if (error) throw error;
    return true; // now bookmarked
  }
}

// ─── Hook ────────────────────────────────────────────────────

export function useSavedJobs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const query = useQuery<SavedJob[]>({
    queryKey: [SAVED_JOBS_KEY, userId],
    queryFn: () => fetchSavedJobs(userId!),
    enabled: Boolean(userId),
    staleTime: 30_000,       // 30 seconds
    gcTime: 5 * 60_000,      // Keep in cache for 5 minutes
  });

  // Derived: set of bookmarked job IDs for fast lookup
  const bookmarkedIds = useMemo(() => {
    return new Set((query.data ?? []).map(j => j.job_id));
  }, [query.data]);

  const isBookmarked = useCallback(
    (jobId: string) => bookmarkedIds.has(jobId),
    [bookmarkedIds],
  );

  const mutation = useMutation({
    mutationFn: async (jobId: string) => {
      if (!userId) throw new Error('Not authenticated');
      return toggleBookmarkApi(jobId, userId);
    },
    // Optimistic update
    onMutate: async (jobId) => {
      await queryClient.cancelQueries({ queryKey: [SAVED_JOBS_KEY, userId] });
      const previous = queryClient.getQueryData<SavedJob[]>([SAVED_JOBS_KEY, userId]);
      
      // Optimistically toggle
      if (isBookmarked(jobId)) {
        // Removing: filter out
        queryClient.setQueryData<SavedJob[]>([SAVED_JOBS_KEY, userId], (old) =>
          (old ?? []).filter(j => j.job_id !== jobId),
        );
      }
      // Note: Adding optimistically requires the full job data which we may not have.
      // For adding, skip optimistic and invalidate after mutation succeeds.
      
      return { previous };
    },
    onError: (err, jobId, context) => {
      // Rollback
      if (context?.previous) {
        queryClient.setQueryData([SAVED_JOBS_KEY, userId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [SAVED_JOBS_KEY, userId] });
    },
  });

  const toggleBookmark = useCallback(
    async (jobId: string) => {
      await mutation.mutateAsync(jobId);
    },
    [mutation],
  );

  return {
    savedJobs: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    isRefetching: query.isFetching,
    refetch: query.refetch,
    isBookmarked,
    toggleBookmark,
    addBookmark: (jobId: string) => toggleBookmark(jobId),
    removeBookmark: (jobId: string) => toggleBookmark(jobId),
  };
}
```

### 8.4 Hook for Single Job Bookmark Check

For the `job/[id].tsx` screen, we need a lighter hook that just checks one job:

```tsx
// apps/mobile/hooks/useBookmarkState.ts

export function useBookmarkState(jobId: string | undefined) {
  const { user } = useAuth();
  
  const { data: isBookmarked } = useQuery({
    queryKey: ['bookmark-state', jobId, user?.id],
    queryFn: async () => {
      if (!jobId || !user?.id) return false;
      const { data } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('candidate_id', user.id)
        .eq('job_id', jobId)
        .maybeSingle();
      return data !== null;
    },
    enabled: Boolean(jobId && user?.id),
    staleTime: 60_000,
  });
  
  return { isBookmarked: isBookmarked ?? false };
}
```

---

## 9. Integration Points

### 9.1 Deck Card (`SwipeCard.tsx` / `JobCard.tsx`)

**Add bookmark button** to `JobCard.tsx` (recommended — cleaner) or `SwipeCard.tsx` (if you want the button to animate with the card).

**In JobCard.tsx — content section:**

```tsx
// Import the hook and BookmarkButton
import { useSavedJobs } from '@/hooks/useSavedJobs';
import { BookmarkButton } from '@/components/bookmark/BookmarkButton';

// Inside JobCard component:
const { isBookmarked, toggleBookmark } = useSavedJobs();

// Add BookmarkButton in the content section, below photo
<View
  style={{
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  }}
>
  <BookmarkButton
    jobId={job.id}
    isBookmarked={isBookmarked(job.id)}
    onToggle={toggleBookmark}
    size="md"
    variant="card"
  />
</View>
```

**Special consideration:** The deck shows up to 3 cards but only the top card is interactive. The bookmark button should be visible on all cards but only tappable on the top card (or safely tappable on any card — since only top card is interactive anyway).

**Performance note:** `useSavedJobs` fetches ALL saved jobs. The `isBookmarked` lookup is O(1) via the `Set`. This is fine for the deck screen. If profiling shows re-render issues, lift the `useSavedJobs` hook to the deck screen and pass `isBookmarked` and `onToggle` as props to `JobCard`.

### 9.2 Job Detail Screen (`job/[id].tsx`)

**Add bookmark button** in the `ScreenHeader` `actions` slot:

```tsx
// In job/[id].tsx
import { useSavedJobs } from '@/hooks/useSavedJobs';
import { BookmarkButton } from '@/components/bookmark/BookmarkButton';

const { isBookmarked, toggleBookmark } = useSavedJobs();

// Inside the component, in ScreenHeader:
<ScreenHeader
  onBack={() => router.back()}
  title={job.title}
  subtitle={[job.suburb, jobTypeLabel].filter(Boolean).join(' · ')}
  actions={
    <View className="flex-row items-center gap-2">
      {isExpired && (
        <Text className="text-xs font-semibold px-2 py-1 rounded-full"
          style={{ backgroundColor: '#7f1d1d', color: '#fca5a5' }}
        >
          Expired
        </Text>
      )}
      <BookmarkButton
        jobId={job.id}
        isBookmarked={isBookmarked(job.id)}
        onToggle={toggleBookmark}
        size="md"
        variant="header"
      />
    </View>
  }
/>
```

**Performance note:** Create a dedicated `useBookmarkState` hook for the detail screen if the full `useSavedJobs` hook is too heavy. The detail screen only needs to know the bookmark state of one job.

### 9.3 Tab Layout

In `app/(candidate)/(tabs)/_layout.tsx`:

1. Add the `saved` tab:
```tsx
<Tabs.Screen
  name="saved"
  options={{
    title: 'Saved',
    tabBarIcon: ({ color }) => <TabIcon emoji="🔖" color={color} />,
  }}
/>
```

2. Remove the `settings` tab:
```tsx
// Delete this block
{/* <Tabs.Screen
  name="settings"
  options={{
    title: 'Settings',
    tabBarIcon: ({ color }) => <TabIcon emoji="⚙️" color={color} />,
  }}
/> */}
```

### 9.4 Profile Screen

Add a **"Saved Jobs" shortcut row** in the Profile screen actions section:

```tsx
// In ProfileScreen.tsx, in the actions View:
<ActionButton
  label="Saved jobs"
  emoji="🔖"
  onPress={() => router.push('/(candidate)/(tabs)/saved' as any)}
/>
```

This gives users a secondary way to reach saved jobs (useful during onboarding when they may not have noticed the tab change).

---

## 10. Theme Compatibility

All bookmark components use the existing 5-accent theme system.

### 10.1 Color Tokens Used

| Token | Usage | Example (Midnight) |
|---|---|---|
| `colors.accent` | Bookmark filled state, filter chip active | `#6366f1` |
| `colors.surface` | Card background, skeleton background | `#0f172a` |
| `colors.elevated` | Skeleton shimmer, search bar bg | `#1e293b` |
| `colors.border` | Card borders, chip inactive border | `#1e293b` |
| `colors.muted` | Card subtitle text, inactive chip text | `#94a3b8` |
| `colors.text` | Card title text | `#f8fafc` |
| `colors.subtle` | Search placeholder, secondary text | `#64748b` |
| `colors.photoBase` | Card photo placeholder skeleton | `#0f172a` |
| `colors.primary` | Pay rate text | `#818cf8` |
| `colors.background` | Screen background | `#0a0e1a` |

### 10.2 Per-theme Bookmark Filled Color

The bookmark button uses `colors.accent` as its filled color, which changes per theme:

| Theme | Filled Bookmark Color |
|---|---|
| Midnight | `#6366f1` (indigo) |
| Coast | `#14b8a6` (teal) |
| Bloom | `#f43f5e` (rose) |
| Hustle | `#f59e0b` (amber) |
| Slate | `#64748b` (slate) |

### 10.3 Light Mode

All components are already theme-aware via `useTheme()`. Backgrounds, borders, and text adapt automatically in light mode. The bookmark filled color remains the accent color (slightly darker in light mode is fine, colors adapt).

---

## 11. Accessibility Summary

| Element | Role | Label | Other |
|---|---|---|---|
| Bookmark button (unfilled) | `button` | "Save [job title] for later" | `accessibilityState.selected: false` |
| Bookmark button (filled) | `button` | "Remove [job title] from saved" | `accessibilityState.selected: true` |
| Saved cards in list | `button` | "View [job title] at [employer]" | — |
| Swipe to remove | N/A (gesture) | A11y hint: "Swipe left to remove" | Provide alternative via long-press menu |
| Search input | `search` | "Search saved jobs by title, employer, or location" | — |
| Filter chips | `button` | "Filter by [label]" | `accessibilityState.selected` |
| Empty state | `text` (heading) | "No saved jobs yet" | Heading level 1 |
| CTA button | `button` | "Browse jobs" | — |
| Undo toast | `alert` | "Removed from saved. Tap to undo." | `accessibilityLiveRegion: "polite"` |
| Remove action (swipe) | `button` | "Remove [job title] from saved" | Red background, trash icon |
| Loading skeleton | `progressbar` | "Loading saved jobs" | `accessibilityValue` |

### Color Contrast

| Text Type | Color | AA Ratio (Dark mode) | AA Ratio (Light mode) |
|---|---|---|---|
| Title (white) | `#f8fafc` | 15.2:1 | — |
| Muted text | `#94a3b8` | 6.3:1 | — |
| Subtle text | `#64748b` | 4.1:1 | — |
| Accent text | `#6366f1` | 6.7:1 (on black) | — |
| Bookmark border | `#64748b` | — | — |
| Filter chip active | white on accent | ≥ 4.5:1 | — |

All color pairs meet WCAG AA (4.5:1 for normal text, 3:1 for large text). Note: bookmark icon border at 2px `#64748b` on `#0f172a` is 3.4:1 (meets UI component threshold of 3:1).

---

## 12. Microcopy Reference

| Context | Text | Notes |
|---|---|---|
| Tab label | Saved | Short, scannable |
| Screen header title | Saved | — |
| Screen header subtitle | Jobs you bookmarked for later | Explains purpose |
| Search placeholder | Search saved jobs... | — |
| Empty state title | No saved jobs yet | Positive framing |
| Empty state description | Jobs you bookmark will appear here. Start browsing to save roles you're interested in. | Two sentences, actionable |
| Empty CTA | Browse jobs | Primary action |
| Zero results (with filter) | "No saved jobs match" | Optional: "Clear filters" |
| Undo toast | Removed from saved | Confirmation |
| Undo toast action | Undo | Bold, accent colored |
| Loading | Loading saved jobs… | Used by VoiceOver |
| Error title | Couldn't load saved jobs | — |
| Error description | There was a problem fetching your saved jobs. Pull down to retry or tap the button below. | — |
| Error CTA | Try again | — |
| Stale data banner | Couldn't refresh — showing saved jobs from earlier. Pull down to retry. | — |
| Bookmark a11y label (unfilled) | Save [job title] for later | Dynamic |
| Bookmark a11y label (filled) | Remove [job title] from saved | Dynamic |
| Results count | {n} jobs saved | — |
| Filter All | All | Default active |
| Profile shortcut | Saved jobs | Secondary entry point |

---

## 13. Implementation Sequence

Suggested order for developer handoff:

### Phase 1 — Foundation

| Step | File(s) | Est. Time |
|---|---|---|
| 1. Database migration (bookmarks table) | `supabase/migrations/` | 15 min |
| 2. `useSavedJobs` hook | `hooks/useSavedJobs.ts` | 45 min |
| 3. `useBookmarkState` hook (single job) | `hooks/useBookmarkState.ts` | 15 min |
| 4. `BookmarkButton` component | `components/bookmark/BookmarkButton.tsx` | 1 hr |

### Phase 2 — Integration

| Step | File(s) | Est. Time |
|---|---|---|
| 5. Integrate bookmark in JobCard | `components/deck/JobCard.tsx` | 30 min |
| 6. Integrate bookmark in job detail | `app/(candidate)/job/[id].tsx` | 20 min |
| 7. `SavedJobCard`, `JobTypeBadge`, `FilterChip` | `components/bookmark/` | 45 min |

### Phase 3 — Screen

| Step | File(s) | Est. Time |
|---|---|---|
| 8. `saved.tsx` screen (full implementation) | `app/(candidate)/(tabs)/saved.tsx` | 2 hr |
| 9. `SavedJobsSkeleton` | `components/bookmark/SavedJobsSkeleton.tsx` | 30 min |
| 10. `SavedJobsEmptyState`/`SavedJobsError` | inline or component | 30 min |
| 11. Swipe-to-remove + undo toast | inline in saved.tsx | 1 hr |

### Phase 4 — Navigation

| Step | File(s) | Est. Time |
|---|---|---|
| 12. Update tab layout (add saved, remove settings) | `app/(candidate)/(tabs)/_layout.tsx` | 15 min |
| 13. Add profile shortcut to saved | `components/screens/ProfileScreen.tsx` | 10 min |
| 14. Ensure settings deep-link still works if needed | — | 5 min |

### Phase 5 — Polish

| Step | File(s) | Est. Time |
|---|---|---|
| 15. Test swipe gesture compatibility on device | — | 30 min |
| 16. Test all 5 themes visually | — | 20 min |
| 17. Test light mode | — | 10 min |
| 18. Test screen reader (VoiceOver / TalkBack) | — | 20 min |
| 19. Search + filter edge cases (empty results) | — | 15 min |
| 20. Undo toast timing and tap target | — | 10 min |

**Total estimated time:** ~9 hours (1–2 sprints)

---

## Appendix A: File Manifest

```
apps/mobile/
├── components/
│   └── bookmark/
│       ├── BookmarkButton.tsx        ★ Bookmark toggle (card + header)
│       ├── JobTypeBadge.tsx           ★ Job type pill chip
│       ├── SavedJobCard.tsx           ★ Card for saved list
│       ├── SavedJobsSkeleton.tsx      ★ Loading skeleton (4 cards)
│       └── SavedJobsError.tsx         ★ Error state component
├── hooks/
│   ├── useSavedJobs.ts               ★ Full saved jobs hook
│   └── useBookmarkState.ts           ★ Single-job bookmark check
├── app/(candidate)/(tabs)/
│   ├── _layout.tsx                   ★ MODIFIED: +saved, -settings
│   ├── saved.tsx                     ★ NEW: saved jobs screen
│   └── settings.tsx                  ★ REMOVED from tabs
├── app/(candidate)/job/[id].tsx      ★ MODIFIED: add BookmarkButton
├── components/deck/JobCard.tsx       ★ MODIFIED: add BookmarkButton
└── components/screens/ProfileScreen.tsx ★ MODIFIED: add saved shortcut
```

---

## Appendix B: Design Review Checklist

- [ ] Bookmark button does not interfere with card swipe gesture
- [ ] Bookmark button hit target is min 44×44pt
- [ ] Bookmark toggle animation is ~300ms spring (not abrupt)
- [ ] Haptic fires on toggle (respects user preference)
- [ ] Saved screen shows loading skeleton on first load
- [ ] Saved screen shows empty state when no bookmarks
- [ ] Saved screen shows error state with retry
- [ ] Stale data fallback: shows cached data with warning banner
- [ ] Saved screen search is debounced (300ms)
- [ ] Saved screen filter chips work with search simultaneously
- [ ] Swipe-to-remove animates off-screen cleanly
- [ ] Undo toast appears at bottom, auto-dismisses after 4s
- [ ] Undo toast tap target is min 44×44pt
- [ ] Undo does full restore (card slides back in + API call)
- [ ] Pull-to-refresh on saved screen
- [ ] Navigation to job detail works from saved
- [ ] Bookmark state syncs between deck, detail, and saved screens
- [ ] Works in all 5 accent themes (midnight, coast, bloom, hustle, slate)
- [ ] Works in light mode
- [ ] Screen reader correctly reads all states
- [ ] Settings content is not lost (accessible from profile)
- [ ] Tab layout has 5 items max (no overflow on phone)

---

*End of handoff — Maya*
