/**
 * Job Aggregator — Main Entry Point
 *
 * Melbourne job aggregation microservice.
 * Sources: SEEK, Gumtree, Vic Gov Careers, Jora, Adzuna, Google PSE.
 * Storage: Supabase (PostgreSQL).
 * Scheduling: Bull queues + node-cron.
 * Processing: dedup by URL, geocoding enrichment.
 *
 * Usage:
 *   node index.js              — start scheduler (runs all scrapers on cron)
 *   node index.js --run-all    — run all scrapers once, then exit
 *   node index.js --run <name> — run a single scraper, then exit
 */

const { createQueue, scheduleRecurring, getQueueStatus, closeAll } = require('./queues');
const supabase = require('./config/firebase'); // filename kept for compat, uses Supabase
const { deduplicateJobs } = require('./utils/dedup');
const { enrichJobs } = require('./utils/geocode');
const { createLogger } = require('./utils/logger');
const proxyManager = require('./utils/proxy');

const log = createLogger('main');

// ── Scrapers ───────────────────────────────────────────────
const scrapers = {
  seek: require('./scrapers/seek'),
  gumtree: require('./scrapers/gumtree'),
  vicgov: require('./scrapers/vicgov'),
  jora: require('./scrapers/jora'),
  adzuna: require('./scrapers/adzuna'),
  google: require('./scrapers/google-pse'),
  remotive: require('./scrapers/remotive'),
};

/**
 * Process a scraper's output: deduplicate, enrich, and store.
 */
async function processScraperOutput(jobs, source) {
  if (!jobs || jobs.length === 0) {
    log.info(`${source}: no jobs to process`);
    return { jobsScraped: 0, jobsStored: 0 };
  }

  log.info(`${source}: ${jobs.length} raw jobs`);

  // Deduplicate against each other and Supabase
  const uniqueJobs = await deduplicateJobs(jobs, { checkDatabase: true });
  log.info(`${source}: ${uniqueJobs.length} after dedup`);

  if (uniqueJobs.length === 0) {
    return { jobsScraped: jobs.length, jobsStored: 0 };
  }

  // Enrich with geocoding
  const enrichedJobs = await enrichJobs(uniqueJobs);
  log.info(`${source}: ${enrichedJobs.length} enriched`);

  // Store in Supabase
  const written = await supabase.writeJobs(enrichedJobs);
  log.info(`${source}: ${written} stored in Supabase`);

  return { jobsScraped: jobs.length, jobsStored: written };
}

/**
 * Run a single scraper and process its output.
 */
async function runScraper(source) {
  const scraper = scrapers[source];
  if (!scraper) {
    throw new Error(`Unknown scraper: ${source}. Available: ${Object.keys(scrapers).join(', ')}`);
  }

  log.info(`=== Running ${source} scraper ===`);
  const start = Date.now();

  try {
    const jobs = await scraper();
    const result = await processScraperOutput(jobs, source);
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    log.info(`=== ${source} complete: ${result.jobsScraped} scraped, ${result.jobsStored} stored (${duration}s) ===`);
    return result;
  } catch (err) {
    log.error(`=== ${source} failed: ${err.message} ===`);
    throw err;
  }
}

/**
 * Run all scrapers in parallel (for initial data load).
 */
async function runAllScrapers() {
  log.info('=== Running all scrapers ===');
  const start = Date.now();

  const sources = Object.keys(scrapers);
  const results = {};

  // Run 2 at a time to avoid overwhelming targets
  for (let i = 0; i < sources.length; i += 2) {
    const batch = sources.slice(i, i + 2);
    const batchResults = await Promise.allSettled(
      batch.map(async (source) => {
        const result = await runScraper(source);
        return { source, ...result };
      })
    );

    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        results[r.value.source] = r.value;
      } else {
        const source = batch[batchResults.indexOf(r)];
        results[source] = { error: r.reason?.message };
        log.error(`${source}: ${r.reason?.message}`);
      }
    }
  }

  const duration = ((Date.now() - start) / 1000).toFixed(1);
  const totalScraped = Object.values(results).reduce((sum, r) => sum + (r.jobsScraped || 0), 0);
  const totalStored = Object.values(results).reduce((sum, r) => sum + (r.jobsStored || 0), 0);

  log.info(`=== All scrapers done: ${totalScraped} scraped, ${totalStored} stored (${duration}s) ===`);

  return results;
}

// ── Main ───────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  // Ensure logs directory exists
  const fs = require('fs');
  if (!fs.existsSync('logs')) fs.mkdirSync('logs');

  log.info('Job Aggregator starting — Melbourne, Australia');
  log.info(`Proxy pool: ${proxyManager.getStats().total} proxies`);

  // Initialize Supabase client
  try {
    supabase.getClient();
    log.info('Supabase client initialized');
  } catch (err) {
    log.error(`Supabase init failed: ${err.message}`);
    log.warn('Continuing without Supabase — jobs will not be persisted');
  }

  // ── Mode: run-all ──────────────────────────────────────
  if (args.includes('--run-all')) {
    const results = await runAllScrapers();
    console.log('\n=== Results ===');
    for (const [source, result] of Object.entries(results)) {
      if (result.error) {
        console.log(`  ${source}: FAILED — ${result.error}`);
      } else {
        console.log(`  ${source}: ${result.jobsScraped} scraped → ${result.jobsStored} stored`);
      }
    }

    // Show total count in Supabase
    try {
      const count = await supabase.getJobCount();
      console.log(`\nTotal jobs in Supabase: ${count}`);
    } catch {}

    process.exit(0);
  }

  // ── Mode: run single ──────────────────────────────────
  const runIdx = args.indexOf('--run');
  if (runIdx !== -1 && args[runIdx + 1]) {
    const source = args[runIdx + 1];
    const result = await runScraper(source);
    console.log(`\n${source}: ${result.jobsScraped} scraped → ${result.jobsStored} stored`);
    process.exit(0);
  }

  // ── Mode: scheduler (default) ─────────────────────────
  log.info('Starting scheduler mode (Australia/Melbourne)');

  // Create Bull queues for each source
  for (const [source, scraper] of Object.entries(scrapers)) {
    createQueue(source, async (job) => {
      const scraperResult = await scraper();
      return processScraperOutput(scraperResult, source);
    });
  }

  // Schedule recurring jobs
  const scheduled = scheduleRecurring();
  log.info(`Scheduled ${scheduled.length} recurring scrapers`);

  // Add a one-time initial run for each source
  log.info('Enqueuing initial runs...');
  const { queues } = require('./queues');
  for (const [name, queue] of Object.entries(queues)) {
    await queue.add({ triggeredAt: new Date().toISOString(), type: 'initial' });
  }

  // Status endpoint
  startStatusServer();

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    log.info('SIGTERM received — shutting down');
    await closeAll();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    log.info('SIGINT received — shutting down');
    await closeAll();
    process.exit(0);
  });

  log.info('Scheduler running. Press Ctrl+C to stop.');
}

/**
 * Simple HTTP status server.
 */
function startStatusServer() {
  const http = require('http');
  const port = parseInt(process.env.STATUS_PORT, 10) || 9090;

  const server = http.createServer(async (req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', region: 'australia-melbourne', timestamp: new Date().toISOString() }));
      return;
    }

    if (req.url === '/status') {
      const queueStatus = await getQueueStatus();
      const proxyStats = proxyManager.getStats();

      let jobCount = 'unknown';
      try {
        jobCount = await supabase.getJobCount();
      } catch {}

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        region: 'australia-melbourne',
        timestamp: new Date().toISOString(),
        queues: queueStatus,
        proxies: proxyStats,
        totalJobsInSupabase: jobCount,
      }, null, 2));
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  server.listen(port, () => {
    log.info(`Status server on http://localhost:${port}`);
    log.info(`  GET /health — health check`);
    log.info(`  GET /status — queue status, proxy stats, job count`);
  });
}

main().catch(err => {
  log.error(`Fatal: ${err.message}`);
  console.error(err);
  process.exit(1);
});
