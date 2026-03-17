"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/workers/trendHunterWorker.ts
require("dotenv/config");
const bullmq_1 = require("bullmq");
const node_cron_1 = __importDefault(require("node-cron"));
const redis_1 = require("../config/redis");
const config_1 = require("../config");
const TrendHunterEngine_1 = require("../TrendHunterEngine");
const trendQueues_1 = require("../queues/trendQueues");
const logger_1 = __importDefault(require("../utils/logger"));
const engine = new TrendHunterEngine_1.TrendHunterEngine();
// ─── Job Workers ──────────────────────────────────────────────────────────────
const socialWorker = new bullmq_1.Worker('trend:social-scan', async (job) => {
    logger_1.default.info(`[Worker] Processing job: ${job.name} (id: ${job.id})`);
    await engine.runSocialScan();
}, { connection: redis_1.redisConnection, concurrency: 1 });
const marketplaceWorker = new bullmq_1.Worker('trend:marketplace-validation', async (job) => {
    logger_1.default.info(`[Worker] Processing job: ${job.name} (id: ${job.id})`);
    await engine.runMarketplaceValidation();
}, { connection: redis_1.redisConnection, concurrency: 1 });
const supplierWorker = new bullmq_1.Worker('trend:supplier-analysis', async (job) => {
    logger_1.default.info(`[Worker] Processing job: ${job.name} (id: ${job.id})`);
    await engine.runSupplierAnalysis();
}, { connection: redis_1.redisConnection, concurrency: 1 });
const top20Worker = new bullmq_1.Worker('trend:daily-top20', async (job) => {
    logger_1.default.info(`[Worker] Processing job: ${job.name} (id: ${job.id})`);
    const top = await engine.generateTop20();
    logger_1.default.info(`[Worker] Top20 done — ${top.length} opportunities`);
    return { count: top.length };
}, { connection: redis_1.redisConnection, concurrency: 1 });
// ─── Error Handlers ───────────────────────────────────────────────────────────
[socialWorker, marketplaceWorker, supplierWorker, top20Worker].forEach((w) => {
    w.on('completed', (job) => logger_1.default.info(`[Worker] ✅ Job completed: ${job.name} (${job.id})`));
    w.on('failed', (job, err) => logger_1.default.error(`[Worker] ❌ Job failed: ${job?.name} — ${err.message}`));
    w.on('error', (err) => logger_1.default.error(`[Worker] Worker error: ${err.message}`));
});
// ─── Cron Schedules ───────────────────────────────────────────────────────────
async function scheduleJobs() {
    // Remove any old repeatable jobs first
    for (const q of [trendQueues_1.socialScanQueue, trendQueues_1.marketplaceValidationQueue, trendQueues_1.supplierAnalysisQueue, trendQueues_1.dailyTop20Queue]) {
        const repeatables = await q.getRepeatableJobs();
        for (const job of repeatables)
            await q.removeRepeatableByKey(job.key);
    }
    // Social scan — every 2 hours
    await trendQueues_1.socialScanQueue.add('social-scan', {}, {
        repeat: { every: config_1.config.schedule.socialScanIntervalMs },
        jobId: 'social-scan-repeat',
    });
    // Marketplace validation — every 6 hours
    await trendQueues_1.marketplaceValidationQueue.add('marketplace-validation', {}, {
        repeat: { every: config_1.config.schedule.marketplaceValidationIntervalMs },
        jobId: 'marketplace-validation-repeat',
    });
    // Supplier analysis — every 12 hours
    await trendQueues_1.supplierAnalysisQueue.add('supplier-analysis', {}, {
        repeat: { every: config_1.config.schedule.supplierAnalysisIntervalMs },
        jobId: 'supplier-analysis-repeat',
    });
    // Daily top20 via node-cron (6 AM WIB)
    node_cron_1.default.schedule(config_1.config.schedule.dailyTop20Cron, async () => {
        logger_1.default.info('[Cron] Triggering daily Top20 job...');
        await trendQueues_1.dailyTop20Queue.add('daily-top20', {}, { jobId: `top20-${Date.now()}` });
    }, { timezone: 'Asia/Jakarta' });
    logger_1.default.info('[Worker] ✅ All jobs scheduled');
    logger_1.default.info(`  • Social scan:            every ${config_1.config.schedule.socialScanIntervalMs / 3600000}h`);
    logger_1.default.info(`  • Marketplace validation: every ${config_1.config.schedule.marketplaceValidationIntervalMs / 3600000}h`);
    logger_1.default.info(`  • Supplier analysis:      every ${config_1.config.schedule.supplierAnalysisIntervalMs / 3600000}h`);
    logger_1.default.info(`  • Daily Top20:            cron "${config_1.config.schedule.dailyTop20Cron}" (WIB)`);
}
// ─── Trigger immediate run on startup ────────────────────────────────────────
async function triggerImmediateRun() {
    logger_1.default.info('[Worker] Triggering immediate pipeline run on startup...');
    await trendQueues_1.socialScanQueue.add('social-scan-initial', {}, { jobId: 'social-scan-initial' });
    // Delay subsequent steps so they run after scan completes
    setTimeout(async () => {
        await trendQueues_1.marketplaceValidationQueue.add('marketplace-initial', {}, { jobId: 'marketplace-initial' });
    }, 30000);
    setTimeout(async () => {
        await trendQueues_1.supplierAnalysisQueue.add('supplier-initial', {}, { jobId: 'supplier-initial' });
    }, 60000);
    setTimeout(async () => {
        await trendQueues_1.dailyTop20Queue.add('top20-initial', {}, { jobId: 'top20-initial' });
    }, 90000);
}
// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    logger_1.default.info('🚀 TrendHunterWorker starting...');
    await scheduleJobs();
    await triggerImmediateRun();
    logger_1.default.info('🚀 TrendHunterWorker ready — workers listening for jobs');
}
main().catch((err) => {
    logger_1.default.error('Fatal worker error:', err);
    process.exit(1);
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger_1.default.info('[Worker] SIGTERM received — shutting down gracefully');
    await Promise.all([
        socialWorker.close(),
        marketplaceWorker.close(),
        supplierWorker.close(),
        top20Worker.close(),
    ]);
    process.exit(0);
});
//# sourceMappingURL=trendHunterWorker.js.map