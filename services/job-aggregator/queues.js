/**
 * Bull queue setup for job scheduling.
 * Each source has its own queue for isolated retry/recovery.
 */

const Queue = require('bull');
const config = require('./config');
const { createLogger } = require('./utils/logger');

const log = createLogger('queue');

// ── Queue definitions ──────────────────────────────────────
const queues = {};

function createQueue(name, handler, options = {}) {
  const queue = new Queue(name, {
    redis: config.redis,
    defaultJobOptions: {
      removeOnComplete: 100,   // keep last 100 completed
      removeOnFail: 50,        // keep last 50 failed
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      ...options.defaultJobOptions,
    },
    settings: {
      stalledInterval: 60000,  // check for stalled jobs every 60s
      lockDuration: 300000,    // 5 min lock (long scrapes)
      ...options.settings,
    },
  });

  // Process handler
  queue.process(1, async (job) => {  // concurrency=1 per source
    const start = Date.now();
    log.info(`Starting ${name} job ${job.id}`);

    try {
      const result = await handler(job);
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      log.info(`${name} completed: ${result?.jobsScraped || 0} jobs in ${duration}s`);
      return result;
    } catch (err) {
      log.error(`${name} failed: ${err.message}`);
      throw err;
    }
  });

  // Event handlers
  queue.on('completed', (job, result) => {
    log.info(`${name} job ${job.id} done: ${result?.jobsScraped || 0} jobs, ${result?.jobsStored || 0} stored`);
  });

  queue.on('failed', (job, err) => {
    log.error(`${name} job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}): ${err.message}`);
  });

  queue.on('stalled', (job) => {
    log.warn(`${name} job ${job.id} stalled`);
  });

  queues[name] = queue;
  return queue;
}

/**
 * Schedule recurring jobs using node-cron patterns.
 */
function scheduleRecurring() {
  const cron = require('node-cron');
  const scheduleConfig = config.schedule;

  const scheduled = [];

  for (const [source, cronExpr] of Object.entries(scheduleConfig)) {
    const queue = queues[source];
    if (!queue) {
      log.warn(`No queue found for source: ${source}`);
      continue;
    }

    if (!cron.validate(cronExpr)) {
      log.error(`Invalid cron expression for ${source}: ${cronExpr}`);
      continue;
    }

    cron.schedule(cronExpr, async () => {
      log.info(`Cron triggered: ${source}`);
      try {
        await queue.add({ triggeredAt: new Date().toISOString() });
      } catch (err) {
        log.error(`Failed to enqueue ${source}: ${err.message}`);
      }
    }, {
      scheduled: true,
      timezone: 'Australia/Melbourne',
    });

    scheduled.push({ source, cron: cronExpr });
    log.info(`Scheduled ${source}: ${cronExpr}`);
  }

  return scheduled;
}

/**
 * Get status of all queues.
 */
async function getQueueStatus() {
  const status = {};

  for (const [name, queue] of Object.entries(queues)) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    status[name] = { waiting, active, completed, failed, delayed };
  }

  return status;
}

/**
 * Close all queues gracefully.
 */
async function closeAll() {
  const closePromises = Object.values(queues).map(q => q.close());
  await Promise.all(closePromises);
  log.info('All queues closed');
}

module.exports = { createQueue, scheduleRecurring, getQueueStatus, closeAll, queues };
