/**
 * Gumtree Melbourne scraper.
 * Scrapes /s-jobs/melbourne pages 1-5.
 * Extracts title, description, suburb, posted date.
 * Uses rotating proxies and polite delays.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const config = require('../config');
const { createJob, inferCategory, inferWorkType, jobIdFromUrl } = require('../utils/schema');
const proxyManager = require('../utils/proxy');
const { createLogger } = require('../utils/logger');

const log = createLogger('gumtree');

async function scrapeGumtree() {
  const allJobs = [];

  // Gumtree blocks cloud IPs — require proxies
  if (proxyManager.getStats().total === 0) {
    log.warn('Gumtree requires proxies to avoid 403 blocks. Skipping — configure PROXY_LIST to enable.');
    return [];
  }

  for (let page = 1; page <= config.gumtree.pages; page++) {
    try {
      const jobs = await scrapeGumtreePage(page);
      allJobs.push(...jobs);
      log.info(`Page ${page}: ${jobs.length} jobs`);

      if (jobs.length === 0) break;

      const delay = randomDelay(config.gumtree.delayMs.min, config.gumtree.delayMs.max);
      await sleep(delay);
    } catch (err) {
      log.error(`Page ${page} failed: ${err.message}`);
      if (err.response?.status === 403 || err.response?.status === 429) {
        log.warn('Rate limited — backing off 60s');
        await sleep(60000);
      }
    }
  }

  log.info(`Gumtree total: ${allJobs.length} jobs scraped`);
  return allJobs;
}

async function scrapeGumtreePage(page) {
  const url = page === 1
    ? `${config.gumtree.baseUrl}/s-jobs/melbourne/1700315`
    : `${config.gumtree.baseUrl}/s-jobs/melbourne/page-${page}/1700315`;

  const proxyConfig = proxyManager.getAxiosConfig();

  const resp = await axios.get(url, {
    headers: {
      'User-Agent': config.gumtree.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-AU,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    },
    timeout: 25000,
    ...proxyConfig,
  });

  const $ = cheerio.load(resp.data);
  const jobs = [];

  // Gumtree job listing cards
  // Try multiple selectors — Gumtree changes their markup periodically
  const selectors = [
    '[data-q="ad-title"]',
    '.user-ad-row-new-design',
    '.css-1apbsm2',  // Gumtree's newer class naming
    'article.ad-listing',
    '.user-ad-row',
    '[data-testid="listing-ad"]',
  ];

  let $cards = $([]);
  for (const sel of selectors) {
    $cards = $(sel);
    if ($cards.length > 0) break;
  }

  // Also try finding structured data
  let jsonLdJobs = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      const listings = Array.isArray(data) ? data : [data];
      for (const item of listings) {
        if (item['@type'] === 'JobPosting' || item['@type'] === 'EmployerAggregatedRating') {
          jsonLdJobs.push(item);
        }
        // Some Gumtree pages wrap listings in an ItemList
        if (item['@type'] === 'ItemList' && item.itemListElement) {
          for (const el of item.itemListElement) {
            if (el['@type'] === 'JobPosting') jsonLdJobs.push(el);
          }
        }
      }
    } catch {}
  });

  // Process JSON-LD if available
  if (jsonLdJobs.length > 0) {
    for (const posting of jsonLdJobs) {
      const job = parseGumtreeJsonLd(posting);
      if (job) jobs.push(job);
    }
  }

  // Process HTML cards
  $cards.each((_, el) => {
    const $el = $(el);

    // Title — try multiple patterns
    const title = (
      $el.find('[data-q="ad-title"]').text().trim() ||
      $el.find('a.user-ad-row-new-design__title-link span').text().trim() ||
      $el.find('.css-1apbsm2 h3').text().trim() ||
      $el.find('h3 a').text().trim() ||
      $el.find('.user-ad-row__title').text().trim()
    );

    // Link
    const linkEl = $el.find('a[href*="/s-ad/"]').first();
    const href = linkEl.attr('href') || $el.find('a').first().attr('href') || '';
    const fullUrl = href.startsWith('http') ? href : `${config.gumtree.baseUrl}${href}`;

    // Suburb / Location
    const location = (
      $el.find('[data-q="ad-location"]').text().trim() ||
      $el.find('.user-ad-row-new-design__location').text().trim() ||
      $el.find('.css-1apbsm2 [class*="location"]').text().trim() ||
      $el.find('.user-ad-row__location').text().trim()
    );

    // Description snippet
    const description = (
      $el.find('[data-q="ad-description"]').text().trim() ||
      $el.find('.user-ad-row-new-design__description').text().trim() ||
      $el.find('.css-1apbsm2 p').text().trim() ||
      ''
    );

    // Posted date
    const dateText = (
      $el.find('[data-q="ad-posted-date"]').text().trim() ||
      $el.find('.user-ad-row-new-design__age').text().trim() ||
      $el.find('time').attr('datetime') ||
      $el.find('[class*="date"]').text().trim() ||
      ''
    );

    // Price / Salary (Gumtree sometimes shows this)
    const price = (
      $el.find('[data-q="ad-price"]').text().trim() ||
      $el.find('.user-ad-row-new-design__price').text().trim() ||
      ''
    );

    if (title && fullUrl.includes('/s-ad/')) {
      jobs.push(createJob({
        source: 'gumtree',
        title,
        description: description.slice(0, 500),
        suburb: parseGumtreeSuburb(location),
        category: inferCategory(title, description),
        workType: inferWorkType(title),
        url: fullUrl,
        id: jobIdFromUrl('gumtree', fullUrl),
        postedDate: parseRelativeDate(dateText),
        salaryText: price,
        raw: { location, dateText, price, scrapeMethod: 'html' },
      }));
    }
  });

  return jobs;
}

function parseGumtreeJsonLd(posting) {
  try {
    const title = posting.title || posting.name || '';
    const url = posting.url || '';
    const company = posting.hiringOrganization?.name || '';
    const description = (posting.description || '').replace(/<[^>]*>/g, ' ').slice(0, 500);
    const location = posting.jobLocation?.address || {};
    const suburb = location.addressLocality || '';

    return createJob({
      source: 'gumtree',
      title,
      company,
      description,
      suburb: parseGumtreeSuburb(suburb),
      postcode: location.postalCode || '',
      url,
      id: jobIdFromUrl('gumtree', url),
      postedDate: posting.datePosted || null,
      category: inferCategory(title, description),
      workType: inferWorkType(posting.employmentType || title),
      raw: { jsonLd: true },
    });
  } catch {
    return null;
  }
}

function parseGumtreeSuburb(text) {
  // "Melbourne City" → "Melbourne"
  // "Richmond VIC 3121" → "Richmond"
  return text
    .replace(/\b(City|CBD|VIC|Victoria|Greater Melbourne)\b/gi, '')
    .replace(/\d{4}/, '')
    .replace(/,+/g, ',')
    .trim()
    .split(',')[0]
    .trim();
}

function parseRelativeDate(text) {
  if (!text) return null;
  const now = new Date();

  const hourMatch = text.match(/(\d+)\s*hour/i);
  if (hourMatch) {
    now.setHours(now.getHours() - parseInt(hourMatch[1]));
    return now.toISOString();
  }

  const dayMatch = text.match(/(\d+)\s*day/i);
  if (dayMatch) {
    now.setDate(now.getDate() - parseInt(dayMatch[1]));
    return now.toISOString();
  }

  const minMatch = text.match(/(\d+)\s*min/i);
  if (minMatch) {
    now.setMinutes(now.getMinutes() - parseInt(minMatch[1]));
    return now.toISOString();
  }

  // ISO date
  if (text.match(/\d{4}-\d{2}-\d{2}/)) return text;

  return null;
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = scrapeGumtree;
