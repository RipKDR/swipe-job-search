# Remaining Features Implementation Plan

> **For agentic workers:** Use executing-plans skill to implement task-by-task.

**Goal:** Build Edit Profile, Subscription UI, and Resume Export for Hi-Hired candidate app.

**Architecture:** Reuse existing CandidateProfileForm for edit flow. Subscription screen is UI-only (Stripe integration deferred). Resume export generates a shareable text summary from profile data.

**Tech Stack:** Expo Router, React Hook Form, Zod, Supabase, NativeWind

---

## Task 1: Edit Profile Screen

**Files:**
- Create: `apps/mobile/app/(candidate)/edit-profile.tsx`
- Modify: `apps/mobile/components/screens/ProfileScreen.tsx`

The edit profile screen reuses CandidateProfileForm, pre-populated with existing profile data from useAuth(). Saves updates to Supabase profiles table.

## Task 2: Subscription/Pricing Screen

**Files:**
- Create: `apps/mobile/app/(candidate)/(tabs)/pricing.tsx`
- Modify: `apps/mobile/app/(candidate)/(tabs)/_layout.tsx`

Beautiful pricing UI with Free vs Pro tiers. Shows features comparison. "Coming soon" state for payment. Accessible from Profile screen.

## Task 3: Resume Export

**Files:**
- Create: `apps/mobile/lib/resume-export.ts`
- Modify: `apps/mobile/components/screens/ProfileScreen.tsx`

Generate a text-formatted resume from profile data. Share via native share sheet or copy to clipboard.
