/**
 * Google Programmable Search Engine cron scraper.
 * Queries "Melbourne job hiring [keyword]" with 10 role keywords.
 * Parses search results to extract job listings.
 * Requires GOOGLE_API_KEY and GOOGLE_CSE_ID env vars.
 */

const axios = require('axios');
const config = require('../config');
const { createJob, inferCategory, inferWorkType, jobIdFromUrl, normalizeUrl } = require('../utils/schema');
const { createLogger } = require('../utils/logger');

const log = createLogger('google-pse');

async function scrapeGooglePse() {
  const { apiKey, cx, roleKeywords, maxResultsPerQuery } = config.googlePse;

  if (!apiKey || !cx) {
    log.warn('GOOGLE_API_KEY or GOOGLE_CSE_ID not set — skipping Google PSE');
    return [];
  }

  const allJobs = [];
  const seenUrls = new Set();

  for (const keyword of roleKeywords) {
    try {
      const query = `Melbourne job hiring ${keyword}`;
      log.info(`Querying: "${query}"`);

      const jobs = await searchGooglePse(query, maxResultsPerQuery);

      // Dedup within batch
      for (const job of jobs) {
        if (!seenUrls.has(job.normalizedUrl)) {
          seenUrls.add(job.normalizedUrl);
          allJobs.push(job);
        }
      }

      log.info(`  "${keyword}": ${jobs.length} results`);

      // Google CSE rate limit: 100 queries/day (free), 10K/day (paid)
      // Be conservative: 1 req/sec
      await sleep(1100);
    } catch (err) {
      log.error(`  "${keyword}" failed: ${err.message}`);
      if (err.response?.status === 429) {
        log.warn('Google API quota exceeded — stopping');
        break;
      }
    }
  }

  log.info(`Google PSE total: ${allJobs.length} jobs`);
  return allJobs;
}

async function searchGooglePse(query, maxResults) {
  const { apiKey, cx } = config.googlePse;

  const resp = await axios.get('https://www.googleapis.com/customsearch/v1', {
    params: {
      key: apiKey,
      cx,
      q: query,
      num: Math.min(maxResults, 10), // Google max 10 per request
      lr: 'lang_en',
      cr: 'countryAU',              // restrict to Australia
      gl: 'au',                     // geolocation: Australia
      safe: 'off',
    },
    timeout: 10000,
  });

  const items = resp.data.items || [];
  const jobs = [];

  for (const item of items) {
    try {
      const job = parseGoogleResult(item, query);
      if (job) jobs.push(job);
    } catch (err) {
      log.debug(`Parse error for ${item.link}: ${err.message}`);
    }
  }

  return jobs;
}

function parseGoogleResult(item, query) {
  const title = item.title || '';
  const link = item.link || '';
  const snippet = item.snippet || '';
  const displayLink = item.displayLink || '';

  // Extract structured data from pagemap if available
  const pagemap = item.pagemap || {};
  const metatags = pagemap.metatags?.[0] || {};
  const jobPosting = pagemap.jobposting?.[0] || {};

  // Determine source site
  const source = classifySource(displayLink, link);

  // Extract company from snippet or metatags
  const company = metatags['og:site_name'] ||
    jobPosting.hiringOrganization ||
    extractCompanyFromSnippet(snippet) ||
    displayLink.replace('www.', '').split('.')[0];

  // Extract location
  const location = metatags['geo.placename'] ||
    jobPosting.jobLocation ||
    extractLocationFromSnippet(snippet) ||
    'Melbourne';

  // Extract salary from snippet
  const salaryMatch = snippet.match(/\$[\d,]+(?:\s*[-–to]+\s*\$[\d,]+)?/);
  const salaryText = salaryMatch?.[0] || '';

  // Extract posted date
  const postedDate = metatags['article:published_time'] ||
    jobPosting.datePosted ||
    extractDateFromSnippet(snippet);

  // Skip non-job URLs (directories, articles, etc.)
  if (isNonJobUrl(link)) return null;

  const normalizedUrl = normalizeUrl(link);

  return createJob({
    source: 'google',
    title: cleanTitle(title),
    company,
    description: snippet.slice(0, 500),
    suburb: parseGoogleSuburb(location),
    category: inferCategory(title, snippet),
    workType: inferWorkType(title + ' ' + snippet),
    salaryText,
    url: link,
    id: jobIdFromUrl('google', normalizedUrl),
    postedDate,
    raw: {
      query,
      displayLink,
      source,
      metatags: Object.keys(metatags).length > 0 ? metatags : undefined,
    },
  });
}

function classifySource(displayLink, link) {
  const domain = displayLink.toLowerCase();
  if (domain.includes('seek.com.au')) return 'seek';
  if (domain.includes('indeed.com')) return 'indeed';
  if (domain.includes('jora.com')) return 'jora';
  if (domain.includes('gumtree.com')) return 'gumtree';
  if (domain.includes('linkedin.com')) return 'linkedin';
  if (domain.includes('careers.vic.gov.au')) return 'vicgov';
  if (domain.includes('adzuna.com')) return 'adzuna';
  if (domain.includes('careerone.com.au')) return 'careerone';
  if (domain.includes('jobactive.gov.au')) return 'jobactive';
  return 'other';
}

function isNonJobUrl(url) {
  const skipDomains = [
    'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com',
    'wikipedia.org', 'reddit.com', 'quora.com',
  ];
  const lower = url.toLowerCase();
  return skipDomains.some(d => lower.includes(d));
}

function extractCompanyFromSnippet(snippet) {
  // "Company Name is hiring..." or "... at Company Name"
  const hiringMatch = snippet.match(/^([^.]+?)\s+is\s+hiring/i);
  if (hiringMatch) return hiringMatch[1].trim();

  const atMatch = snippet.match(/(?:at|with)\s+([A-Z][^.]+?)(?:\s+is|\.|,)/);
  if (atMatch) return atMatch[1].trim();

  return null;
}

function extractLocationFromSnippet(snippet) {
  const match = snippet.match(/\bin\s+((?:Melbourne|Richmond|Carlton|Fitzroy|South Yarra|St Kilda|Docklands)[^,.;]*)/i);
  return match?.[1]?.trim() || null;
}

function extractDateFromSnippet(snippet) {
  // "posted 3 days ago" → relative date
  const match = snippet.match(/posted\s+(\d+)\s+(day|hour|minute)s?\s+ago/i);
  if (match) {
    const now = new Date();
    const num = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === 'day') now.setDate(now.getDate() - num);
    else if (unit === 'hour') now.setHours(now.getHours() - num);
    else if (unit === 'minute') now.setMinutes(now.getMinutes() - num);
    return now.toISOString();
  }
  return null;
}

function cleanTitle(title) {
  // Remove " - SEEK", " | Indeed.com", etc.
  return title
    .replace(/\s*[-–|]\s*(SEEK|Indeed|Jora|Gumtree|LinkedIn|Adzuna).*$/i, '')
    .replace(/\s*\(job\).*$/i, '')
    .trim();
}

function parseGoogleSuburb(text) {
  return (text || 'melbourne')
    .replace(/\b(VIC|Victoria|Australia|Melbourne Region|Greater Melbourne)\b/gi, '')
    .replace(/\d{4}/, '')
    .replace(/,+/g, ',')
    .trim()
    .split(',')[0]
    .trim()
    .toLowerCase() || 'melbourne';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = scrapeGooglePse;
