/**
 * Remotive API scraper — free, no auth needed.
 * Returns remote jobs (many Melbourne-based).
 * Acts as a reliable fallback when SEEK/Gumtree are blocked.
 */

const axios = require('axios');
const { createJob, inferCategory, inferWorkType, jobIdFromUrl, parseSalary } = require('../utils/schema');
const { createLogger } = require('../utils/logger');

const log = createLogger('remotive');

async function scrapeRemotive() {
  const allJobs = [];

  try {
    log.info('Fetching Remotive API...');
    const resp = await axios.get('https://remotive.com/api/remote-jobs?limit=100', {
      headers: { 'User-Agent': 'JobAggregator/1.0' },
      timeout: 15000,
    });

    const jobs = resp.data.jobs || [];
    log.info(`Remotive API returned ${jobs.length} jobs`);

    for (const item of jobs) {
      // Filter for Melbourne-relevant or Australia-based
      const location = (item.candidate_required_location || '').toLowerCase();
      const title = item.title || '';
      const description = (item.description || '').replace(/<[^>]*>/g, ' ').slice(0, 2000);

      const isMelbourne = location.includes('melbourne') ||
        location.includes('australia') ||
        location.includes('victoria') ||
        location.includes('worldwide') ||
        location.includes('anywhere') ||
        location.includes('global');

      if (!isMelbourne) continue;

      allJobs.push(createJob({
        source: 'remotive',
        title,
        company: item.company_name || '',
        description,
        suburb: 'melbourne',
        postcode: '3000',
        category: inferCategory(title, description),
        workType: 'remote',
        salaryText: item.salary || '',
        url: item.url || '',
        id: jobIdFromUrl('remotive', item.url || ''),
        postedDate: item.publication_date || null,
        raw: {
          remotiveId: item.id,
          tags: item.tags || [],
          jobType: item.job_type,
          category: item.category,
        },
      }));
    }
  } catch (err) {
    log.error(`Remotive failed: ${err.message}`);
  }

  log.info(`Remotive total: ${allJobs.length} Melbourne-relevant jobs`);
  return allJobs;
}

module.exports = scrapeRemotive;
