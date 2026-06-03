/**
 * Vic Gov Careers RSS parser.
 * Ingests XML RSS feed and maps to job schema.
 * No proxy needed — public government feed.
 */

const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const config = require('../config');
const { createJob, inferCategory, inferWorkType, jobIdFromUrl, parseSalary } = require('../utils/schema');
const { createLogger } = require('../utils/logger');

const log = createLogger('vicgov');

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
});

async function scrapeVicGov() {
  const allJobs = [];

  for (const feedUrl of [config.vicgov.rssUrl, config.vicgov.fallbackUrl]) {
    try {
      const jobs = await parseFeed(feedUrl);
      allJobs.push(...jobs);
      log.info(`Vic Gov feed: ${jobs.length} jobs from ${feedUrl}`);
      break; // success, no need for fallback
    } catch (err) {
      log.warn(`Feed ${feedUrl} failed: ${err.message}`);
      if (feedUrl === config.vicgov.fallbackUrl) {
        // Try scraping the HTML careers page as last resort
        try {
          const htmlJobs = await scrapeHtmlFallback();
          allJobs.push(...htmlJobs);
          log.info(`Vic Gov HTML fallback: ${htmlJobs.length} jobs`);
        } catch (htmlErr) {
          log.error(`HTML fallback also failed: ${htmlErr.message}`);
        }
      }
    }
  }

  log.info(`Vic Gov total: ${allJobs.length} jobs`);
  return allJobs;
}

async function parseFeed(feedUrl) {
  const resp = await axios.get(feedUrl, {
    headers: {
      'User-Agent': 'JobAggregator/1.0',
      'Accept': 'application/rss+xml, application/xml, text/xml',
    },
    timeout: 15000,
  });

  const parsed = xmlParser.parse(resp.data);
  const channel = parsed?.rss?.channel;

  if (!channel) {
    throw new Error('Invalid RSS structure — no channel element found');
  }

  const items = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];
  const jobs = [];

  for (const item of items) {
    try {
      const job = parseRssItem(item);
      if (job) jobs.push(job);
    } catch (err) {
      log.debug(`Item parse error: ${err.message}`);
    }
  }

  return jobs;
}

function parseRssItem(item) {
  const title = item.title || '';
  const link = item.link || '';
  const description = stripHtml(item.description || item['content:encoded'] || '').slice(0, 2000);
  const pubDate = item.pubDate || item['dc:date'] || null;
  const category = item.category || '';

  // Extract location from description or custom fields
  const locationMatch = description.match(/(?:location|based in|position located)[:\s]*([^.\n]+)/i);
  const suburbMatch = description.match(/\b(Melbourne|Richmond|Carlton|Fitzroy|Collingwood|South Yarra|St Kilda|Docklands|Footscray|Brunswick|Preston|Northcote|Hawthorn|Kew|Box Hill|Clayton|Dandenong|Frankston|Werribee|Ballarat|Bendigo|Geelong)\b/i);
  const postcodeMatch = description.match(/\b(3\d{3})\b/);

  // Extract salary
  const salaryMatch = description.match(/\$[\d,]+(?:\s*[-–to]+\s*\$[\d,]+)?(?:\s*(?:per|p\.?)\s*(?:annum|year|hour|hr))?/i);

  // Filter to Melbourne/VIC only
  const locationText = (locationMatch?.[1] || description).toLowerCase();
  const isVicJob = locationText.includes('melbourne') ||
    locationText.includes('victoria') ||
    locationText.includes('vic ') ||
    suburbMatch;

  // Government jobs are often statewide — include all VIC jobs
  if (!isVicJob && !link.includes('melbourne')) {
    // Accept anyway since it's the Vic Gov feed
  }

  const workType = inferWorkType(title + ' ' + description);
  const salaryText = salaryMatch?.[0] || '';

  return createJob({
    source: 'vicgov',
    title,
    company: 'Victorian Government',
    description,
    suburb: suburbMatch?.[1]?.toLowerCase() || 'melbourne',
    postcode: postcodeMatch?.[1] || '3000',
    category: mapVicGovCategory(category) || inferCategory(title, description),
    workType,
    salaryText,
    ...parseSalary(salaryText),
    url: link,
    id: jobIdFromUrl('vicgov', link),
    postedDate: pubDate ? new Date(pubDate).toISOString() : null,
    raw: { category, feed: 'rss' },
  });
}

async function scrapeHtmlFallback() {
  // Fallback: scrape the HTML careers listing page
  const resp = await axios.get('https://www.careers.vic.gov.au/jobs', {
    headers: { 'User-Agent': 'JobAggregator/1.0' },
    timeout: 15000,
  });

  const cheerio = require('cheerio');
  const $ = cheerio.load(resp.data);
  const jobs = [];

  // Vic Gov careers page uses data attributes
  $('[data-testid="job-card"], .job-card, .search-result, article').each((_, el) => {
    const $el = $(el);
    const title = $el.find('h2, h3, .job-title, [data-testid="job-title"]').first().text().trim();
    const link = $el.find('a').first().attr('href') || '';
    const location = $el.find('[class*="location"], [data-testid="location"]').text().trim();
    const snippet = $el.find('p, .description, [data-testid="snippet"]').text().trim();

    if (title) {
      const fullUrl = link.startsWith('http') ? link : `https://www.careers.vic.gov.au${link}`;
      jobs.push(createJob({
        source: 'vicgov',
        title,
        company: 'Victorian Government',
        description: snippet.slice(0, 500),
        suburb: (location || 'melbourne').split(',')[0].trim().toLowerCase(),
        category: inferCategory(title, snippet),
        workType: inferWorkType(title),
        url: fullUrl,
        id: jobIdFromUrl('vicgov', fullUrl),
        raw: { scrapeMethod: 'html-fallback' },
      }));
    }
  });

  return jobs;
}

function mapVicGovCategory(rssCategory) {
  const lower = (rssCategory || '').toLowerCase();
  if (lower.includes('it') || lower.includes('digital') || lower.includes('technology')) return 'IT';
  if (lower.includes('admin') || lower.includes('corporate')) return 'Admin';
  if (lower.includes('health') || lower.includes('nursing')) return 'Healthcare';
  if (lower.includes('education') || lower.includes('teaching')) return 'Education';
  return null; // will be inferred
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

module.exports = scrapeVicGov;
