/**
 * Adzuna API Melbourne feed.
 * Pulls all listings via paginated API.
 * Deduplicates by URL within the batch.
 * Requires ADZUNA_APP_ID and ADZUNA_APP_KEY env vars.
 */

const axios = require('axios');
const config = require('../config');
const { createJob, inferCategory, inferWorkType, jobIdFromUrl, parseSalary, normalizeUrl } = require('../utils/schema');
const { createLogger } = require('../utils/logger');

const log = createLogger('adzuna');

async function scrapeAdzuna() {
  const { appId, appKey } = config.adzuna;

  if (!appId || !appKey) {
    log.warn('ADZUNA_APP_ID or ADZUNA_APP_KEY not set — skipping Adzuna');
    return [];
  }

  const allJobs = [];
  const seenUrls = new Set();

  for (let page = 1; page <= config.adzuna.maxPages; page++) {
    try {
      const { jobs, totalCount } = await fetchAdzunaPage(page);

      // Dedup within batch
      for (const job of jobs) {
        if (!seenUrls.has(job.normalizedUrl)) {
          seenUrls.add(job.normalizedUrl);
          allJobs.push(job);
        }
      }

      log.info(`Page ${page}: ${jobs.length} jobs (${allJobs.length} total unique)`);

      // Stop if we've seen all results or got an empty page
      if (jobs.length === 0 || allJobs.length >= totalCount) break;

      // Adzuna allows ~2 req/sec
      await sleep(500);
    } catch (err) {
      log.error(`Page ${page} failed: ${err.message}`);
      if (err.response?.status === 429) {
        log.warn('Rate limited — backing off 30s');
        await sleep(30000);
      } else if (err.response?.status === 401) {
        log.error('Invalid Adzuna credentials');
        break;
      }
    }
  }

  log.info(`Adzuna total: ${allJobs.length} jobs`);
  return allJobs;
}

async function fetchAdzunaPage(page) {
  const { appId, appKey, baseUrl, resultsPerPage, location } = config.adzuna;

  const resp = await axios.get(`${baseUrl}/${page}`, {
    params: {
      app_id: appId,
      app_key: appKey,
      results_per_page: resultsPerPage,
      where: location,
      sort_by: 'date',
      max_days_old: 30,
    },
    headers: {
      'User-Agent': 'JobAggregator/1.0',
    },
    timeout: 15000,
  });

  const results = resp.data.results || [];
  const totalCount = resp.data.count || 0;

  const jobs = results.map(item => {
    const title = item.title || '';
    const company = item.company?.display_name || '';
    const description = (item.description || '').slice(0, 2000);
    const locationData = item.location || {};
    const area = locationData.area || [];

    // Adzuna area hierarchy: [Country, State, City, Suburb, ...]
    const suburb = area.length >= 4 ? area[3] : (area.length >= 3 ? area[2] : '');
    const postcode = extractPostcode(locationData);

    const salaryMin = item.salary_min || null;
    const salaryMax = item.salary_max || null;
    const salaryText = salaryMin
      ? `$${Math.round(salaryMin).toLocaleString()}${salaryMax ? ` - $${Math.round(salaryMax).toLocaleString()}` : ''}`
      : '';

    const url = item.redirect_url || '';
    const category = item.category?.label || '';

    return createJob({
      source: 'adzuna',
      title,
      company,
      description,
      suburb: suburb.toLowerCase(),
      postcode,
      category: mapAdzunaCategory(category) || inferCategory(title, description),
      workType: mapContractType(item.contract_type, item.contract_time),
      salaryText,
      salaryMin,
      salaryMax,
      url,
      id: jobIdFromUrl('adzuna', url),
      postedDate: item.created ? new Date(item.created).toISOString() : null,
      raw: {
        adzunaId: item.id,
        category: category,
        contractType: item.contract_type,
        contractTime: item.contract_time,
        area,
      },
    });
  });

  return { jobs, totalCount };
}

function extractPostcode(location) {
  // Try to find postcode in location string or display name
  const text = JSON.stringify(location);
  const match = text.match(/\b(3\d{3})\b/);
  return match ? match[1] : '';
}

function mapAdzunaCategory(label) {
  const lower = (label || '').toLowerCase();
  if (lower.includes('it') || lower.includes('technology') || lower.includes('computing')) return 'IT';
  if (lower.includes('hospitality') || lower.includes('catering')) return 'Hospitality';
  if (lower.includes('retail') || lower.includes('sales')) return 'Retail';
  if (lower.includes('admin') || lower.includes('secretarial') || lower.includes('pa')) return 'Admin';
  return null;
}

function mapContractType(type, time) {
  const t = (type || '').toLowerCase();
  const tm = (time || '').toLowerCase();
  if (t.includes('full') || tm.includes('full')) return 'full-time';
  if (t.includes('part') || tm.includes('part')) return 'part-time';
  if (t.includes('contract') || t.includes('temporary')) return 'contract';
  if (t.includes('casual')) return 'casual';
  return 'unknown';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = scrapeAdzuna;
