// src/workers/trendHunterWorker.ts
import 'dotenv/config';
import { Worker } from 'bullmq';
import cron from 'node-cron';
import { redisConnection }          from '../config/redis';
import { config }                   from '../config';
import { TrendHunterEngine }        from '../TrendHunterEngine';
import {
  socialScanQueue,
  marketplaceValidationQueue,
  supplierAnalysisQueue,
  dailyTop20Queue,
} from '../queues/trendQueues';
import logger from '../utils/logger';

const engine = new TrendHunterEngine();

// ─── Job Workers ──────────────────────────────────────────────────────────────

const socialWorker = new Worker(
  'trend-social-scan',
  async (job) => {
    logger.info(`[Worker] Processing job: ${job.name} (id: ${job.id})`);
    await engine.runSocialScan();
  },
  { connection: redisConnection, concurrency: 1 },
);

const marketplaceWorker = new Worker(
  'trend-marketplace-validation',
  async (job) => {
    logger.info(`[Worker] Processing job: ${job.name} (id: ${job.id})`);
    await engine.runMarketplaceValidation();
  },
  { connection: redisConnection, concurrency: 1 },
);

const supplierWorker = new Worker(
  'trend-supplier-analysis',
  async (job) => {
    logger.info(`[Worker] Processing job: ${job.name} (id: ${job.id})`);
    await engine.runSupplierAnalysis();
  },
  { connection: redisConnection, concurrency: 1 },
);

const top20Worker = new Worker(
  'trend-daily-top20',
  async (job) => {
    logger.info(`[Worker] Processing job: ${job.name} (id: ${job.id})`);
    const top = await engine.generateTop20();
    logger.info(`[Worker] Top20 done — ${top.length} opportunities`);
    return { count: top.length };
  },
  { connection: redisConnection, concurrency: 1 },
);

// ─── Error Handlers ───────────────────────────────────────────────────────────

[socialWorker, marketplaceWorker, supplierWorker, top20Worker].forEach((w) => {
  w.on('completed', (job) => logger.info(`[Worker] ✅ Job completed: ${job.name} (${job.id})`));
  w.on('failed',    (job, err) => logger.error(`[Worker] ❌ Job failed: ${job?.name} — ${err.message}`));
  w.on('error',     (err)      => logger.error(`[Worker] Worker error: ${err.message}`));
});

// ─── Cron Schedules ───────────────────────────────────────────────────────────

async function scheduleJobs() {
  // Remove any old repeatable jobs first
  for (const q of [socialScanQueue, marketplaceValidationQueue, supplierAnalysisQueue, dailyTop20Queue]) {
    const repeatables = await q.getRepeatableJobs();
    for (const job of repeatables) await q.removeRepeatableByKey(job.key);
  }

  // Social scan — every 2 hours
  await socialScanQueue.add('social-scan', {}, {
    repeat: { every: config.schedule.socialScanIntervalMs },
    jobId: 'social-scan-repeat',
  });

  // Marketplace validation — every 6 hours
  await marketplaceValidationQueue.add('marketplace-validation', {}, {
    repeat: { every: config.schedule.marketplaceValidationIntervalMs },
    jobId: 'marketplace-validation-repeat',
  });

  // Supplier analysis — every 12 hours
  await supplierAnalysisQueue.add('supplier-analysis', {}, {
    repeat: { every: config.schedule.supplierAnalysisIntervalMs },
    jobId: 'supplier-analysis-repeat',
  });

  // Daily top20 via node-cron (6 AM WIB)
  cron.schedule(config.schedule.dailyTop20Cron, async () => {
    logger.info('[Cron] Triggering daily Top20 job...');
    await dailyTop20Queue.add('daily-top20', {}, { jobId: `top20-${Date.now()}` });
  }, { timezone: 'Asia/Jakarta' });

  logger.info('[Worker] ✅ All jobs scheduled');
  logger.info(`  • Social scan:            every ${config.schedule.socialScanIntervalMs / 3600000}h`);
  logger.info(`  • Marketplace validation: every ${config.schedule.marketplaceValidationIntervalMs / 3600000}h`);
  logger.info(`  • Supplier analysis:      every ${config.schedule.supplierAnalysisIntervalMs / 3600000}h`);
  logger.info(`  • Daily Top20:            cron "${config.schedule.dailyTop20Cron}" (WIB)`);
}

// ─── Trigger immediate run on startup ────────────────────────────────────────

async function triggerImmediateRun() {
  logger.info('[Worker] Triggering immediate pipeline run on startup...');
  await socialScanQueue.add('social-scan-initial', {}, { jobId: 'social-scan-initial' });
  // Delay subsequent steps so they run after scan completes
  setTimeout(async () => {
    await marketplaceValidationQueue.add('marketplace-initial', {}, { jobId: 'marketplace-initial' });
  }, 30000);
  setTimeout(async () => {
    await supplierAnalysisQueue.add('supplier-initial', {}, { jobId: 'supplier-initial' });
  }, 60000);
  setTimeout(async () => {
    await dailyTop20Queue.add('top20-initial', {}, { jobId: 'top20-initial' });
  }, 90000);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  logger.info('🚀 TrendHunterWorker starting...');
  await scheduleJobs();
  await triggerImmediateRun();
  logger.info('🚀 TrendHunterWorker ready — workers listening for jobs');
}

main().catch((err) => {
  logger.error('Fatal worker error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('[Worker] SIGTERM received — shutting down gracefully');
  await Promise.all([
    socialWorker.close(),
    marketplaceWorker.close(),
    supplierWorker.close(),
    top20Worker.close(),
  ]);
  process.exit(0);
});
