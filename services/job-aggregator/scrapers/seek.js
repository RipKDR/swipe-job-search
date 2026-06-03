/**
 * SEEK Melbourne scraper.
 * Scrapes job listings from seek.com.au for specified categories.
 * Parses JSON-LD structured data from each listing page.
 * Uses rotating proxies and polite delays.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const config = require('../config');
const { createJob, inferCategory, parseSalary, inferWorkType, jobIdFromUrl } = require('../utils/schema');
const proxyManager = require('../utils/proxy');
const { createLogger } = require('../utils/logger');

const log = createLogger('seek');

const CATEGORY_MAP = {
  'IT': '6281',
  'Hospitality': '4525',
  'Retail': '4616',
  'Admin': '6026',
};

async function scrapeSeek() {
  const allJobs = [];

  // SEEK blocks cloud IPs — require proxies
  if (proxyManager.getStats().total === 0) {
    log.warn('SEEK requires proxies to avoid 403 blocks. Skipping — configure PROXY_LIST to enable.');
    return [];
  }

  for (const category of config.seek.categories) {
    const categoryId = CATEGORY_MAP[category];
    if (!categoryId) {
      log.warn(`Unknown category: ${category}`);
      continue;
    }

    log.info(`Scraping SEEK category: ${category} (ID: ${categoryId})`);

    for (let page = 1; page <= config.seek.pagesPerCategory; page++) {
      try {
        const jobs = await scrapeSeekPage(categoryId, category, page);
        allJobs.push(...jobs);
        log.info(`  Page ${page}: ${jobs.length} jobs`);

        if (jobs.length === 0) break; // no more results

        // Polite delay
        const delay = randomDelay(config.seek.delayMs.min, config.seek.delayMs.max);
        await sleep(delay);
      } catch (err) {
        log.error(`  Page ${page} failed: ${err.message}`);
        if (err.response?.status === 403) {
          log.warn('  Got 403 — backing off 30s');
          await sleep(30000);
        }
      }
    }
  }

  log.info(`SEEK total: ${allJobs.length} jobs scraped`);
  return allJobs;
}

async function scrapeSeekPage(categoryId, categoryName, page) {
  const url = `https://www.seek.com.au/jobs?classification=${categoryId}&where=Melbourne+VIC&page=${page}`;

  const proxyConfig = proxyManager.getAxiosConfig();
  const proxyUsed = proxyConfig.httpsAgent ? 'via proxy' : 'direct';

  const resp = await axios.get(url, {
    headers: {
      'User-Agent': config.seek.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-AU,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Referer': 'https://www.seek.com.au/',
    },
    timeout: 20000,
    ...proxyConfig,
  });

  const $ = cheerio.load(resp.data);
  const jobs = [];

  // SEEK renders job cards with data attributes and JSON-LD
  // Try JSON-LD first (most reliable)
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const jsonData = JSON.parse($(el).html());
      if (jsonData['@type'] === 'JobPosting' || jsonData['@graph']) {
        const postings = jsonData['@graph']
          ? jsonData['@graph'].filter(item => item['@type'] === 'JobPosting')
          : [jsonData];

        for (const posting of postings) {
          const job = parseSeekJsonLd(posting, categoryName);
          if (job) jobs.push(job);
        }
      } else if (jsonData['@type'] === 'ItemList' && jsonData.itemListElement) {
        for (const item of jsonData.itemListElement) {
          if (item['@type'] === 'JobPosting') {
            const job = parseSeekJsonLd(item, categoryName);
            if (job) jobs.push(job);
          }
        }
      }
    } catch {}
  });

  // Fallback: parse HTML cards if JSON-LD didn't yield results
  if (jobs.length === 0) {
    $('[data-automation="normalJob"], article[data-card-type="JobCard"]').each((_, el) => {
      const $el = $(el);
      const title = $el.find('[data-automation="jobTitle"]').text().trim();
      const company = $el.find('[data-automation="jobCompany"]').text().trim();
      const suburb = $el.find('[data-automation="jobLocation"]').text().trim();
      const link = $el.find('a[href*="/job/"]').attr('href') || '';
      const salary = $el.find('[data-automation="jobSalary"]').text().trim();
      const description = $el.find('[data-automation="jobShortDescription"]').text().trim();

      if (title) {
        const fullUrl = link.startsWith('http') ? link : `https://www.seek.com.au${link}`;
        jobs.push(createJob({
          source: 'seek',
          title,
          company,
          description,
          suburb: extractSuburb(suburb),
          category: categoryName,
          url: fullUrl,
          id: jobIdFromUrl('seek', fullUrl),
          salaryText: salary,
          ...parseSalary(salary),
          workType: inferWorkType(`${title} ${description}`),
          raw: { category: categoryName, page, scrapeMethod: 'html' },
        }));
      }
    });
  }

  return jobs;
}

function parseSeekJsonLd(posting, categoryName) {
  try {
    const title = posting.title || posting.name || '';
    const company = posting.hiringOrganization?.name || '';
    const description = stripHtml(posting.description || '').slice(0, 2000);
    const url = posting.url || '';
    const location = posting.jobLocation?.address || posting.jobLocation || {};
    const suburb = location.addressLocality || '';
    const region = location.addressRegion || '';
    const postedDate = posting.datePosted || null;
    const employmentType = Array.isArray(posting.employmentType)
      ? posting.employmentType[0]
      : posting.employmentType || '';

    // Only include Melbourne-area jobs
    const locationText = `${suburb} ${region} ${posting.jobLocation?.name || ''}`.toLowerCase();
    if (!locationText.includes('melbourne') && !locationText.includes('vic') && region !== 'VIC') {
      return null;
    }

    const salaryText = posting.baseSalary?.value?.value
      ? `$${posting.baseSalary.value.value}`
      : (typeof posting.baseSalary === 'string' ? posting.baseSalary : '');

    return createJob({
      source: 'seek',
      title,
      company,
      description,
      suburb: extractSuburb(suburb),
      postcode: location.postalCode || '',
      category: categoryName,
      url,
      id: jobIdFromUrl('seek', url),
      postedDate,
      salaryText,
      ...parseSalary(salaryText),
      workType: mapEmploymentType(employmentType),
      raw: { jsonLd: true, employmentType, region },
    });
  } catch (err) {
    log.debug(`JSON-LD parse error: ${err.message}`);
    return null;
  }
}

function extractSuburb(text) {
  // "Melbourne VIC 3000" → "Melbourne"
  // "Richmond, VIC" → "Richmond"
  const cleaned = text.replace(/\b(VIC|Victoria|Australia|Melbourne Region)\b/gi, '').replace(/,\s*\d{4}/, '').replace(/\d{4}/, '').replace(/,+/g, ',').trim();
  return cleaned.split(',')[0].trim() || '';
}

function mapEmploymentType(type) {
  const map = {
    'FULL_TIME': 'full-time',
    'PART_TIME': 'part-time',
    'CONTRACTOR': 'contract',
    'TEMPORARY': 'contract',
    'CASUAL': 'casual',
    'INTERN': 'contract',
  };
  return map[type?.toUpperCase()] || 'unknown';
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = scrapeSeek;
