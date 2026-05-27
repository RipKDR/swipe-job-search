# Developer Experience (DX) & Tooling Mastery

To make this the "best development process," we need to ensure any developer (or AI) can ship with 100% confidence.

## 1. The "Golden Path" Branching
- `main`: Production-ready code (Vercel Production).
- `staged`: Real-world testing environment (Vercel Preview).
- `dev`: Feature-branch integration.

## 2. Automated Quality Gates (The "Invisible Reviewer")
- **GitHub Actions:**
  - `lint-and-typecheck.yml`: Prevents broken code from merging.
  - `supabase-tests.yml`: Ensures RLS policies don't leak data.
- **Vercel Preview Comments:** Enabling the ability for recruiters/beta users to leave feedback directly on the UI during development.

## 3. The "Mock-to-Prod" Toggle
- Include a `NEXT_PUBLIC_USE_MOCK_DATA` flag. 
- Allows designers and front-end devs to iterate on swipe physics without being connected to the database.

## 4. Documentation for Scale
- Every component must have a README or JSDoc comment explaining its **State Logic**.
- **Supabase Edge Functions:** Strategy for handling "Match" notifications via push (Expo/OneSignal).
