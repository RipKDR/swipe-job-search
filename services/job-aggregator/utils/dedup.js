/**
 * Deduplication logic.
 * Primary key: normalized URL (source-specific or global).
 * Secondary: title + suburb hash for jobs without URLs.
 */

const crypto = require('crypto');
const { createLogger } = require('./logger');
const supabase = require('../config/firebase'); // filename kept for compat, uses Supabase

const log = createLogger('dedup');

/**
 * Deduplicate a batch of jobs against:
 * 1. Each other (in-memory)
 * 2. Existing Supabase URLs
 *
 * @param {import('./schema').NormalizedJob[]} jobs
 * @param {Object} opts
 * @param {boolean} opts.checkDatabase — whether to check existing DB (default true)
 * @returns {Promise<import('./schema').NormalizedJob[]>} unique jobs
 */
async function deduplicateJobs(jobs, opts = { checkDatabase: true }) {
  if (!jobs.length) return [];

  // Step 1: In-memory dedup by normalized URL
  const seen = new Map(); // normalizedUrl -> job
  const noUrl = [];

  for (const job of jobs) {
    if (job.normalizedUrl) {
      const key = `${job.source}:${job.normalizedUrl}`;
      if (!seen.has(key)) {
        seen.set(key, job);
      }
    } else {
      noUrl.push(job);
    }
  }

  // Dedup no-URL jobs by title+suburb hash
  for (const job of noUrl) {
    const hash = contentHash(job.title, job.suburb, job.company);
    const key = `${job.source}:no-url:${hash}`;
    if (!seen.has(key)) {
      seen.set(key, job);
    }
  }

  let unique = [...seen.values()];
  const beforeExternal = unique.length;

  // Step 2: Check against Supabase
  if (opts.checkDatabase) {
    try {
      const existingUrls = await supabase.getExistingUrls();
      unique = unique.filter(job => !existingUrls.has(job.normalizedUrl));
      const removed = beforeExternal - unique.length;
      if (removed > 0) {
        log.info(`Filtered ${removed} jobs already in database`);
      }
    } catch (err) {
      log.warn(`Database dedup check failed, proceeding with in-memory only: ${err.message}`);
    }
  }

  log.info(`Dedup: ${jobs.length} input → ${unique.length} unique`);
  return unique;
}

/**
 * Content hash for jobs without URLs.
 */
function contentHash(title, suburb, company) {
  const normalized = `${(title || '').toLowerCase().trim()}|${(suburb || '').toLowerCase().trim()}|${(company || '').toLowerCase().trim()}`;
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

module.exports = { deduplicateJobs };
