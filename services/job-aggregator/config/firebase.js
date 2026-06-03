/**
 * Supabase client initialization.
 * Replaces Firebase — uses existing Supabase project.
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('./index');
const { createLogger } = require('../utils/logger');

const log = createLogger('supabase');

let client = null;

function getClient() {
  if (client) return client;

  const { url, anonKey } = config.supabase;

  if (!url || !anonKey) {
    throw new Error('SUPABASE_URL or SUPABASE_ANON_KEY not set');
  }

  client = createClient(url, anonKey, {
    auth: { persistSession: false },
  });

  log.info(`Supabase client initialized: ${url}`);
  return client;
}

/**
 * Batch-write jobs to Supabase.
 * Uses upsert (ON CONFLICT id DO UPDATE) for idempotent writes.
 */
async function writeJobs(jobs) {
  const db = getClient();
  const table = config.supabase.table;
  const batchSize = 500; // Supabase limit per request
  let written = 0;

  for (let i = 0; i < jobs.length; i += batchSize) {
    const chunk = jobs.slice(i, i + batchSize).map(job => ({
      id: job.id,
      source: job.source,
      title: job.title,
      company: job.company,
      description: job.description,
      suburb: job.suburb,
      postcode: job.postcode,
      latitude: job.latitude,
      longitude: job.longitude,
      category: job.category,
      work_type: job.workType,
      salary_text: job.salaryText,
      salary_min: job.salaryMin,
      salary_max: job.salaryMax,
      url: job.url,
      normalized_url: job.normalizedUrl,
      posted_date: job.postedDate,
      scraped_at: job.scrapedAt,
      raw: job.raw,
    }));

    const { data, error } = await db
      .from(table)
      .upsert(chunk, { onConflict: 'id' })
      .select('id');

    if (error) {
      log.error(`Batch write error: ${error.message}`);
      // Try individual inserts as fallback
      for (const row of chunk) {
        const { error: singleErr } = await db
          .from(table)
          .upsert(row, { onConflict: 'id' });
        if (!singleErr) written++;
        else log.debug(`Single insert failed for ${row.id}: ${singleErr.message}`);
      }
    } else {
      written += data?.length || chunk.length;
    }
  }

  return written;
}

/**
 * Get all normalized URLs for deduplication check.
 * Returns a Set of normalized URLs.
 */
async function getExistingUrls() {
  const db = getClient();
  const table = config.supabase.table;

  const { data, error } = await db
    .from(table)
    .select('normalized_url');

  if (error) {
    log.warn(`getExistingUrls failed: ${error.message}`);
    return new Set();
  }

  return new Set((data || []).map(row => row.normalized_url).filter(Boolean));
}

/**
 * Get count of jobs in the table.
 */
async function getJobCount() {
  const db = getClient();
  const table = config.supabase.table;

  const { count, error } = await db
    .from(table)
    .select('*', { count: 'exact', head: true });

  if (error) {
    log.warn(`getJobCount failed: ${error.message}`);
    return -1;
  }

  return count;
}

module.exports = { getClient, writeJobs, getExistingUrls, getJobCount };
