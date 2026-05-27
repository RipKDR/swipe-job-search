# Business Model — Swipe Job Search

## 1. Revenue Strategy Overview

Three complementary revenue streams designed to grow together:

| Stream | Model | Target | Timeline |
|--------|-------|--------|----------|
| **Sponsored Jobs** | CPM/CPC per placement | Recruiters | Launch |
| **Provider Enterprise** | SaaS subscription | DES providers (Asuria) | Month 3 |
| **Recruiter Pro** | Seat-based subscription | Hiring managers | Month 6 |

The B2B (Provider Enterprise) path is the fastest route to sustainable revenue — one enterprise deal with Asuria is worth ~10,000 free-tier users.

---

## 2. Candidate-Side (Free Tier)

Candidates are always free. This is non-negotiable — charging job seekers kills network effects.

**What candidates get free:**
- Unlimited swipes
- Up to 3 Super Applies per day
- Match messaging
- CV parsing (1 parse per onboarding)
- Profile visibility to all recruiters

**What we never charge candidates for:**
- Seeing jobs
- Applying (swiping right)
- Messaging matched recruiters
- Compliance activity export (for DES participants)

---

## 3. Sponsored Jobs (Launch Revenue)

Recruiters pay a flat fee to "pin" their job to the first 5 cards in the deck for users within a given suburb radius.

| Tier | Price (AUD) | Placement | Duration |
|------|-------------|-----------|----------|
| Local Boost | $49/week | First 5 cards, 5km radius | 7 days |
| City Boost | $129/week | First 5 cards, city-wide | 7 days |
| Featured | $299/month | Persistent "Gold Card" badge + top placement | 30 days |

**Unit economics:**
- Melbourne hospitality market: ~2,500 active job postings at any time
- Target: 5% of postings pay for Local Boost → $6,125/week ARR equivalent
- No Stripe setup required at launch — Supabase Edge Function + Stripe Checkout

---

## 4. Recruiter Pro (Month 6)

Free recruiters can post 2 active jobs. Pro unlocks the hiring toolkit.

| Feature | Free | Pro ($49/mo) | Agency ($199/mo) |
|---------|------|-------------|-----------------|
| Active job postings | 2 | Unlimited | Unlimited |
| Candidate swipe data | Match only | Full swipe analytics | Full + export |
| Bulk messaging | ✗ | ✓ (10/day) | Unlimited |
| Trial shift scheduling | ✗ | ✓ | ✓ |
| Team seats | 1 | 3 | 10 |
| Branded job cards | ✗ | ✓ | ✓ |
| API access | ✗ | ✗ | ✓ |

**Target:** 200 Pro seats by month 12 = $9,800 MRR from this stream alone.

---

## 5. Provider Enterprise (B2B Core — Asuria Model)

This is the highest-margin, lowest-churn revenue stream. Employment service providers pay for a dashboard that handles their compliance pain.

### Pricing Structure

| Plan | Price | Included Seats | Candidates | Support |
|------|-------|---------------|------------|---------|
| Starter | $499/mo | 5 mentor seats | 200 active | Email |
| Growth | $1,499/mo | 20 mentor seats | 1,000 active | Priority |
| Enterprise | $3,999/mo | Unlimited | Unlimited | Dedicated CSM |

### What They Buy
1. **Caseload Dashboard** — Mentor view of all assigned candidates with swipe activity
2. **Bulk-Swipe ("Blast")** — Mentor can apply on behalf of ready-to-work candidates
3. **Compliance Export** — Auto-generated weekly PDF + JSON matching DSS/DES reporting format
4. **Asuria Verified Badge** — Trusted employer endorsement on candidate profiles
5. **Private Job Feed** — Pre-market jobs visible only to provider's candidates
6. **Mutual Obligations Logging** — Every swipe logged as a DSS activity point automatically
7. **Support-Person Access** — Co-manage profiles for candidates needing additional support

### Contract Terms (Charter Partner)
- 12-month minimum term for Enterprise
- 30-day pilot program (free) for Starter tier to demonstrate compliance value
- Data ownership: provider owns their candidate data, can export at any time
- SLA: 99.5% uptime, <4hr response for critical compliance reporting issues

---

## 6. Unit Economics & Projections

### Year 1 Targets (Melbourne Only)

| Month | MRR Target | Key Milestone |
|-------|-----------|---------------|
| 1-2 | $0 | MVP live, 500 candidates, 50 recruiters |
| 3 | $2,000 | Sponsored jobs running, first provider pilot |
| 6 | $8,000 | 1 provider contract (Growth tier), 100 Pro seats |
| 9 | $18,000 | 2 provider contracts, 300 Pro seats |
| 12 | $35,000 | 3 providers + Agency tier launch |

### Key Metrics to Track

| Metric | Target (Month 6) | Target (Month 12) |
|--------|-----------------|------------------|
| CAC (candidate) | $0 (organic/referral) | $0 |
| CAC (recruiter) | $80 | $60 |
| CAC (provider) | $2,000 (sales-led) | $1,500 |
| LTV (recruiter Pro) | $588 (12mo) | $980 (20mo) |
| LTV (provider Growth) | $17,988 (12mo) | $29,988 (20mo) |
| Gross margin | 75% | 82% |

---

## 7. Competitive Pricing Position

| Product | Model | Price |
|---------|-------|-------|
| SEEK (job posting) | Per-post | $300-$400/post |
| LinkedIn Recruiter | Annual seat | $10,800/seat/year |
| JobAdder (ATS) | Monthly SaaS | $250-$500/mo |
| **Swipe Job Search (Sponsored)** | Weekly | $49-$299/week |
| **Swipe Job Search (Pro)** | Monthly | $49-$199/mo |
| **Swipe Job Search (Provider)** | Monthly | $499-$3,999/mo |

We are dramatically cheaper than SEEK/LinkedIn for recruiters and offer compliance automation that no ATS currently provides for DES providers.

---

## 8. Payment Infrastructure

- **Stripe** for all subscription and one-off payments
- **Stripe Checkout** for sponsored job purchases (no custom checkout needed)
- **Stripe Billing** for recurring subscriptions (Pro + Provider tiers)
- **Supabase Edge Function** for webhook handling (subscription events → DB updates)
- **Invoice generation**: Stripe handles automatically; provider contracts need custom PDF invoices

### Stripe Product IDs to Configure
```
prod_recruiter_pro_monthly
prod_recruiter_agency_monthly
prod_provider_starter_monthly
prod_provider_growth_monthly
prod_provider_enterprise_monthly
prod_sponsored_local_weekly
prod_sponsored_city_weekly
prod_sponsored_featured_monthly
```

---

## 9. Anti-Churn Mechanics

**For recruiters:**
- Hiring success stories shown on dashboard ("You hired 3 people this month!")
- 30-day trial for Pro before credit card required
- Downgrade (not delete) path — jobs go to "paused" not deleted

**For providers:**
- Compliance export is so valuable that switching costs are high
- Monthly ROI report showing time saved vs manual DSS reporting
- Dedicated Customer Success Manager for Enterprise tier

**For candidates:**
- Free forever — no churn risk on this side
- Streak mechanic (see PRD.md) creates daily habit loop
