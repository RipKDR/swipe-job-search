/**
 * Jora Local Melbourne scraper.
 * Focuses on inner Melbourne postcodes 3000-3200.
 * Uses simple HTTP + cheerio.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const config = require('../config');
const { createJob, inferCategory, inferWorkType, jobIdFromUrl, parseSalary } = require('../utils/schema');
const proxyManager = require('../utils/proxy');
const { createLogger } = require('../utils/logger');

const log = createLogger('jora');

// Query batches — group postcodes to reduce requests
const QUERY_BATCHES = [
  { label: 'CBD', postcodes: ['3000', '3001', '3002', '3003', '3004'] },
  { label: 'Inner North', postcodes: ['3050', '3051', '3052', '3053', '3054', '3055', '3056', '3057'] },
  { label: 'Inner East', postcodes: ['3065', '3066', '3067', '3068', '3070', '3071', '3072', '3073'] },
  { label: 'Inner South', postcodes: ['3121', '3122', '3123', '3124', '3125', '3126', '3127', '3128'] },
  { label: 'St Kilda/Bayside', postcodes: ['3141', '3142', '3143', '3144', '3145', '3146', '3161', '3162', '3163'] },
  { label: 'South East', postcodes: ['3168', '3169', '3170', '3171', '3172', '3173', '3174', '3175'] },
  { label: 'West', postcodes: ['3011', '3012', '3013', '3015', '3016', '3018', '3019', '3020', '3021'] },
  { label: 'North West', postcodes: ['3030', '3031', '3032', '3039', '3040', '3041', '3042', '3043', '3044'] },
  { label: 'Far North', postcodes: ['3074', '3075', '3076', '3078', '3079', '3081', '3082', '3083', '3084'] },
  { label: 'Extended East', postcodes: ['3085', '3086', '3087', '3088', '3089', '3090', '3091', '3093', '3094', '3095'] },
];

async function scrapeJora() {
  const allJobs = [];

  // Jora blocks cloud IPs — require proxies
  if (proxyManager.getStats().total === 0) {
    log.warn('Jora requires proxies to avoid 403 blocks. Skipping — configure PROXY_LIST to enable.');
    return [];
  }

  for (const batch of QUERY_BATCHES) {
    const locationQuery = batch.postcodes[0]; // Use first postcode as primary
    log.info(`Scraping Jora: ${batch.label} (postcode ${locationQuery})`);

    for (let page = 1; page <= config.jora.pagesPerQuery; page++) {
      try {
        const jobs = await scrapeJoraPage(locationQuery, page);
        allJobs.push(...jobs);
        log.info(`  ${batch.label} page ${page}: ${jobs.length} jobs`);

        if (jobs.length === 0) break;

        const delay = randomDelay(config.jora.delayMs.min, config.jora.delayMs.max);
        await sleep(delay);
      } catch (err) {
        log.error(`  ${batch.label} page ${page} failed: ${err.message}`);
      }
    }
  }

  log.info(`Jora total: ${allJobs.length} jobs scraped`);
  return allJobs;
}

async function scrapeJoraPage(postcode, page) {
  const params = new URLSearchParams({
    q: '',                  // all jobs
    l: `Melbourne+${postcode}`,
    p: page.toString(),
    sp: 'closest',          // sort by distance
  });

  const url = `${config.jora.baseUrl}/j?${params}`;
  const proxyConfig = proxyManager.getAxiosConfig();

  const resp = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-AU,en;q=0.9',
    },
    timeout: 20000,
    ...proxyConfig,
  });

  const $ = cheerio.load(resp.data);
  const jobs = [];

  // Jora job cards — try JSON-LD first
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      const postings = data['@graph']
        ? data['@graph'].filter(item => item['@type'] === 'JobPosting')
        : data['@type'] === 'JobPosting' ? [data] : [];

      for (const posting of postings) {
        const job = parseJoraJsonLd(posting);
        if (job) jobs.push(job);
      }
    } catch {}
  });

  // HTML fallback
  if (jobs.length === 0) {
    // Jora uses various selectors
    const selectors = [
      '.job-card',
      '[data-testid="job-card"]',
      '.organic-job',
      '.job',
      'article',
      '.result',
    ];

    let $cards = $([]);
    for (const sel of selectors) {
      $cards = $(sel);
      if ($cards.length > 0) break;
    }

    $cards.each((_, el) => {
      const $el = $(el);

      const title = (
        $el.find('.job-title, h2 a, h3 a, [data-testid="job-title"]').first().text().trim() ||
        $el.find('a').first().text().trim()
      );

      const link = (
        $el.find('.job-title a, h2 a, h3 a, [data-testid="job-title"] a').first().attr('href') ||
        $el.find('a').first().attr('href') || ''
      );

      const company = (
        $el.find('.company, .company-name, [data-testid="company"]').first().text().trim() ||
        ''
      );

      const location = (
        $el.find('.location, .job-location, [data-testid="location"]').first().text().trim() ||
        ''
      );

      const snippet = (
        $el.find('.snippet, .job-snippet, [data-testid="snippet"], p').first().text().trim() ||
        ''
      );

      const salary = (
        $el.find('.salary, [data-testid="salary"]').first().text().trim() ||
        ''
      );

      const dateText = (
        $el.find('.date, .posted-date, time, [data-testid="date"]').first().text().trim() ||
        ''
      );

      if (title) {
        const fullUrl = link.startsWith('http') ? link : `${config.jora.baseUrl}${link}`;
        jobs.push(createJob({
          source: 'jora',
          title,
          company,
          description: snippet.slice(0, 500),
          suburb: parseJoraSuburb(location, postcode),
          postcode,
          category: inferCategory(title, snippet),
          workType: inferWorkType(title),
          salaryText: salary,
          ...parseSalary(salary),
          url: fullUrl,
          id: jobIdFromUrl('jora', fullUrl),
          postedDate: parseRelativeDate(dateText),
          raw: { postcode, location, scrapeMethod: 'html' },
        }));
      }
    });
  }

  return jobs;
}

function parseJoraJsonLd(posting) {
  try {
    const title = posting.title || posting.name || '';
    const url = posting.url || '';
    const company = posting.hiringOrganization?.name || '';
    const description = (posting.description || '').replace(/<[^>]*>/g, ' ').slice(0, 500);
    const location = posting.jobLocation?.address || {};
    const suburb = location.addressLocality || '';
    const postcode = location.postalCode || '';

    return createJob({
      source: 'jora',
      title,
      company,
      description,
      suburb: parseJoraSuburb(suburb),
      postcode,
      url,
      id: jobIdFromUrl('jora', url),
      postedDate: posting.datePosted || null,
      category: inferCategory(title, description),
      workType: inferWorkType(posting.employmentType || title),
      raw: { jsonLd: true },
    });
  } catch {
    return null;
  }
}

function parseJoraSuburb(text, fallbackPostcode) {
  const cleaned = text
    .replace(/\b(VIC|Victoria|Melbourne Region|Greater Melbourne)\b/gi, '')
    .replace(/\d{4}/, '')
    .replace(/,+/g, ',')
    .trim()
    .split(',')[0]
    .trim();
  return cleaned || 'melbourne';
}

function parseRelativeDate(text) {
  if (!text) return null;
  const now = new Date();

  const hourMatch = text.match(/(\d+)\s*h(?:our)?/i);
  if (hourMatch) {
    now.setHours(now.getHours() - parseInt(hourMatch[1]));
    return now.toISOString();
  }

  const dayMatch = text.match(/(\d+)\s*d(?:ay)?/i);
  if (dayMatch) {
    now.setDate(now.getDate() - parseInt(dayMatch[1]));
    return now.toISOString();
  }

  const minMatch = text.match(/(\d+)\s*m(?:in)?/i);
  if (minMatch) {
    now.setMinutes(now.getMinutes() - parseInt(minMatch[1]));
    return now.toISOString();
  }

  if (text.match(/\d{4}-\d{2}-\d{2}/)) return text;

  return null;
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = scrapeJora;
