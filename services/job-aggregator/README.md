# Melbourne Job Aggregator

Multi-source job aggregation microservice for Melbourne, Australia.

## Sources

| Source | Schedule | Method | Notes |
|--------|----------|--------|-------|
| SEEK | Every 6h | Scrape + JSON-LD | 4 categories, 10 pages each, rotating proxy |
| Gumtree | Daily 3AM | Scrape + cheerio | Pages 1-5, rotating proxy |
| Vic Gov Careers | Hourly | RSS XML parse | Auto-retry with HTML fallback |
| Jora | Every 6h | Scrape + cheerio | Inner Melbourne postcodes 3000-3200 |
| Adzuna | Every 4h | REST API | Requires API credentials |
| Google PSE | 3x daily | Search API | 10 role keywords, requires API key |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Scheduler (node-cron)                 │
├─────────┬─────────┬─────────┬─────────┬────────┬───────┤
│  SEEK   │ Gumtree │ Vic Gov │  Jora   │ Adzuna │ Google│
│ Scraper │ Scraper │  RSS    │ Scraper │  API   │  PSE  │
└────┬────┴────┬────┴────┬────┴────┬────┴────┬───┴───┬───┘
     │         │         │         │         │       │
     └─────────┴─────────┴─────────┴─────────┴───────┘
                         │
               ┌─────────▼─────────┐
               │   Dedup (URL)     │
               └─────────┬─────────┘
                         │
               ┌─────────▼─────────┐
               │ Geocode Enrichment│
               └─────────┬─────────┘
                         │
               ┌─────────▼─────────┐
               │   Firebase Store  │
               └───────────────────┘
```

## Quick Start

```bash
# 1. Install deps
cd job-aggregator && npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your Firebase credentials, API keys, proxies

# 3. Ensure Redis is running
redis-server --daemonize yes

# 4. Run all scrapers once
node index.js --run-all

# 5. Or start the scheduler
node index.js
```

## Environment Variables

```bash
# Required: Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# Required: Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Optional: Proxies (SEEK + Gumtree)
PROXY_LIST=http://user:pass@host1:8080,http://user:pass@host2:8080

# Optional: Adzuna
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key

# Optional: Google PSE
GOOGLE_API_KEY=your_api_key
GOOGLE_CSE_ID=your_cse_id
```

## API Endpoints

The status server runs on port 9090:

- `GET /health` — health check
- `GET /status` — queue status, proxy stats, total job count

## Individual Scrapers

```bash
node index.js --run seek
node index.js --run gumtree
node index.js --run vicgov
node index.js --run jora
node index.js --run adzuna
node index.js --run google
```

## Job Schema

Each job in Firebase has this shape:

```json
{
  "id": "uuid",
  "source": "seek|gumtree|vicgov|jora|adzuna|google",
  "title": "Software Developer",
  "company": "Acme Corp",
  "description": "...",
  "suburb": "melbourne",
  "postcode": "3000",
  "latitude": -37.8136,
  "longitude": 144.9631,
  "category": "IT|Hospitality|Retail|Admin|Other",
  "workType": "full-time|part-time|casual|contract|unknown",
  "salaryText": "$80,000 - $100,000",
  "salaryMin": 80000,
  "salaryMax": 100000,
  "url": "https://...",
  "normalizedUrl": "https://...",
  "postedDate": "2026-01-15T00:00:00Z",
  "scrapedAt": "2026-01-15T12:00:00Z",
  "raw": {}
}
```

## Deduplication

Jobs are deduplicated by normalized URL:
- Lowercase
- Tracking params removed (utm_*, fbclid, etc.)
- Fragment stripped
- Trailing slashes removed

For jobs without URLs, a hash of title+suburb+company is used.

## Geocoding

Inner Melbourne postcodes (3000-3200) are geocoded from a local lookup table. Unknown suburbs fall back to Nominatim (OpenStreetMap), rate-limited to 1 req/sec. Jobs without any coordinates default to Melbourne CBD.

## Error Handling

- Exponential backoff on failures (3 attempts)
- Proxy rotation with health tracking (3 failures → 60s cooldown)
- Rate limit detection (403/429) with longer backoff
- Graceful degradation if Firebase/Redis unavailable
- Each scraper runs independently — one failure doesn't block others
