/**
 * Canonical job schema + normalization helpers.
 * Every scraper outputs objects conforming to this shape.
 */

const { v4: uuidv4, v5: uuidv5 } = require('uuid');
const crypto = require('crypto');

const JOB_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // UUID v5 namespace

/**
 * @typedef {Object} NormalizedJob
 * @property {string} id               — UUID
 * @property {string} source           — 'seek' | 'gumtree' | 'vicgov' | 'jora' | 'adzuna' | 'google'
 * @property {string} title
 * @property {string} company
 * @property {string} description      — plain text, max ~2000 chars
 * @property {string} suburb           — Melbourne suburb name
 * @property {string} postcode         — 4-digit postcode
 * @property {number} latitude
 * @property {number} longitude
 * @property {string} category         — 'IT' | 'Hospitality' | 'Retail' | 'Admin' | 'Other'
 * @property {string} workType         — 'full-time' | 'part-time' | 'casual' | 'contract' | 'unknown'
 * @property {string} salaryText       — raw salary string if available
 * @property {number} salaryMin
 * @property {number} salaryMax
 * @property {string} url              — original listing URL
 * @property {string} normalizedUrl    — lowercased, de-tracked URL for dedup
 * @property {string} postedDate       — ISO date string
 * @property {string} scrapedAt        — ISO timestamp
 * @property {Object} raw              — source-specific extra fields
 */

/**
 * Create a normalized job object with defaults.
 */
function createJob(data) {
  const url = data.url || '';
  const normalizedUrl = normalizeUrl(url);

  return {
    id: data.id || uuidv4(),
    source: data.source || 'unknown',
    title: (data.title || '').trim(),
    company: (data.company || '').trim(),
    description: (data.description || '').trim().slice(0, 2000),
    suburb: (data.suburb || '').trim(),
    postcode: (data.postcode || '').trim(),
    latitude: data.latitude || null,
    longitude: data.longitude || null,
    category: data.category || 'Other',
    workType: data.workType || 'unknown',
    salaryText: data.salaryText || '',
    salaryMin: data.salaryMin || null,
    salaryMax: data.salaryMax || null,
    url,
    normalizedUrl,
    postedDate: data.postedDate || null,
    scrapedAt: data.scrapedAt || new Date().toISOString(),
    raw: data.raw || {},
  };
}

/**
 * Normalize a URL for deduplication:
 * - lowercase
 * - remove tracking params (utm_*, fbclid, gclid, ref, etc.)
 * - strip trailing slashes
 * - remove fragment
 */
function normalizeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url.toLowerCase().trim());
    u.hash = '';

    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
      'fbclid', 'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid',
      'msclkid', 'twclid', 'li_fat_id',
      'ref', 'referrer', 'source', 'sr', 'from',
    ];
    trackingParams.forEach(p => u.searchParams.delete(p));
    u.searchParams.sort();

    let path = u.pathname.replace(/\/+$/, '') || '/';
    return `${u.origin}${path}${u.search}`;
  } catch {
    return url.toLowerCase().trim();
  }
}

/**
 * Generate a deterministic UUID v5 from source + normalized URL.
 * Produces proper UUID format for database compatibility.
 */
function jobIdFromUrl(source, normalizedUrl) {
  return uuidv5(`${source}:${normalizedUrl}`, JOB_NAMESPACE);
}

/**
 * Category mapping from common job titles/keywords.
 */
function inferCategory(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  const categories = {
    IT: ['developer', 'engineer', 'software', 'data', 'analyst', 'devops', 'cloud', 'cyber', 'network', 'system admin', 'tech lead', 'qa', 'tester', 'frontend', 'backend', 'fullstack', 'full stack', 'ux designer', 'product manager', 'scrum', 'agile'],
    Hospitality: ['chef', 'cook', 'barista', 'waiter', 'waitress', 'kitchen', 'restaurant', 'hotel', 'catering', 'food', 'beverage', 'bartender', 'hospitality', 'housekeeping', 'front desk'],
    Retail: ['retail', 'sales assistant', 'shop', 'store', 'cashier', 'merchandise', 'visual merchandiser', 'customer service', 'floor staff', 'checkout'],
    Admin: ['admin', 'administrator', 'receptionist', 'office', 'clerical', 'data entry', 'secretary', 'pa ', 'executive assistant', 'accounts payable', 'accounts receivable', 'bookkeeper'],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => text.includes(kw))) return category;
  }
  return 'Other';
}

/**
 * Parse salary text to extract min/max figures.
 * Handles: "$60,000 - $80,000", "$30/hr", "$70k-90k", "60000 to 80000"
 */
function parseSalary(text) {
  if (!text) return { salaryMin: null, salaryMax: null };

  const clean = text.replace(/,/g, '').toLowerCase();

  // Pattern: "$X - $Y" or "$X to $Y" or "$X-$Y"
  const rangeMatch = clean.match(/\$?\s*(\d+\.?\d*)\s*(?:k|000)?\s*[-–to]+\s*\$?\s*(\d+\.?\d*)\s*(?:k|000)?/i);
  if (rangeMatch) {
    let min = parseFloat(rangeMatch[1]);
    let max = parseFloat(rangeMatch[2]);
    if (clean.includes('k') && min < 1000) { min *= 1000; max *= 1000; }
    if (min < 1000) { min *= 1000; max *= 1000; }
    return { salaryMin: min, salaryMax: max };
  }

  // Pattern: "$X/hr" or "$X per hour"
  const hourlyMatch = clean.match(/\$?\s*(\d+\.?\d*)\s*(?:\/\s*hr|per\s*hour)/i);
  if (hourlyMatch) {
    const rate = parseFloat(hourlyMatch[1]);
    return { salaryMin: rate, salaryMax: rate }; // keep as hourly
  }

  // Single value
  const singleMatch = clean.match(/\$?\s*(\d+\.?\d*)\s*(?:k|000)?/);
  if (singleMatch) {
    let val = parseFloat(singleMatch[1]);
    if (val < 1000) val *= 1000;
    return { salaryMin: val, salaryMax: val };
  }

  return { salaryMin: null, salaryMax: null };
}

/**
 * Infer work type from text.
 */
function inferWorkType(text) {
  const lower = (text || '').toLowerCase();
  if (lower.includes('full time') || lower.includes('full-time')) return 'full-time';
  if (lower.includes('part time') || lower.includes('part-time')) return 'part-time';
  if (lower.includes('casual')) return 'casual';
  if (lower.includes('contract')) return 'contract';
  if (lower.includes('temporary') || lower.includes('temp')) return 'contract';
  return 'unknown';
}

module.exports = { createJob, normalizeUrl, jobIdFromUrl, inferCategory, parseSalary, inferWorkType };
