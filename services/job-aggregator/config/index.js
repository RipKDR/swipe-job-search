/**
 * Configuration — all tuneables in one place.
 * Override via environment variables.
 */

module.exports = {
  // ── Supabase ──────────────────────────────────────────────
  supabase: {
    url: process.env.SUPABASE_URL || 'https://twwmqqgjtdbcvrkinifa.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || 'sb_publishable_amzArN-PtOSPCQQVNtOVaw_geB8qjzL',
    table: process.env.SUPABASE_TABLE || 'jobs',
  },

  // ── Redis (Bull queue) ────────────────────────────────────
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // ── Rotating proxy list ───────────────────────────────────
  // Format: http://user:pass@host:port  (one per env var)
  // PROXY_1, PROXY_2, ... or PROXY_LIST as comma-separated
  proxies: (() => {
    if (process.env.PROXY_LIST) {
      return process.env.PROXY_LIST.split(',').map(s => s.trim()).filter(Boolean);
    }
    const list = [];
    for (let i = 1; i <= 20; i++) {
      const p = process.env[`PROXY_${i}`];
      if (p) list.push(p);
    }
    return list;
  })(),

  // ── SEEK ──────────────────────────────────────────────────
  seek: {
    categories: ['IT', 'Hospitality', 'Retail', 'Admin'],
    pagesPerCategory: 10,
    baseUrl: 'https://www.seek.com.au',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    delayMs: { min: 2000, max: 5000 },
  },

  // ── Gumtree ───────────────────────────────────────────────
  gumtree: {
    baseUrl: 'https://www.gumtree.com.au',
    pages: 5,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    delayMs: { min: 3000, max: 7000 },
  },

  // ── Vic Gov Careers RSS ───────────────────────────────────
  vicgov: {
    rssUrl: 'https://www.careers.vic.gov.au/rss.xml',
    fallbackUrl: 'https://www.careers.vic.gov.au/jobs',
  },

  // ── Jora ──────────────────────────────────────────────────
  jora: {
    baseUrl: 'https://au.jora.com',
    postcodes: Array.from({ length: 201 }, (_, i) => 3000 + i), // 3000-3200
    pagesPerQuery: 5,
    delayMs: { min: 1500, max: 3500 },
  },

  // ── Adzuna ────────────────────────────────────────────────
  adzuna: {
    appId: process.env.ADZUNA_APP_ID || '',
    appKey: process.env.ADZUNA_APP_KEY || '',
    baseUrl: 'https://api.adzuna.com/v1/api/jobs/au/search',
    maxPages: 5,
    resultsPerPage: 50,
    location: 'Melbourne',
  },

  // ── Google Programmable Search Engine ─────────────────────
  googlePse: {
    apiKey: process.env.GOOGLE_API_KEY || '',
    cx: process.env.GOOGLE_CSE_ID || '',
    roleKeywords: [
      'software developer',
      'data analyst',
      'nurse',
      'chef',
      'retail assistant',
      'admin officer',
      'warehouse worker',
      'customer service',
      'accountant',
      'project manager',
    ],
    maxResultsPerQuery: 10,
  },

  // ── Geocoding (Melbourne suburbs) ─────────────────────────
  geocode: {
    nominatimUrl: 'https://nominatim.openstreetmap.org/search',
    userAgent: 'JobAggregator/1.0',
  },

  // ── Scheduling (Australia/Melbourne) ──────────────────────
  schedule: {
    seek: '0 */6 * * *',
    gumtree: '0 3 * * *',
    vicgov: '0 * * * *',
    jora: '30 */6 * * *',
    adzuna: '0 6 * * *',
    googlePse: '0 8,14,20 * * *',
  },
};
