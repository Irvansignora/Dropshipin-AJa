"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allQueues = exports.dailyTop20Queue = exports.opportunityScoringQueue = exports.supplierAnalysisQueue = exports.marketplaceValidationQueue = exports.socialScanQueue = void 0;
// src/queues/trendQueues.ts
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const defaultOptions = {
    connection: redis_1.redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
    },
};
exports.socialScanQueue = new bullmq_1.Queue('trend:social-scan', defaultOptions);
exports.marketplaceValidationQueue = new bullmq_1.Queue('trend:marketplace-validation', defaultOptions);
exports.supplierAnalysisQueue = new bullmq_1.Queue('trend:supplier-analysis', defaultOptions);
exports.opportunityScoringQueue = new bullmq_1.Queue('trend:opportunity-scoring', defaultOptions);
exports.dailyTop20Queue = new bullmq_1.Queue('trend:daily-top20', defaultOptions);
exports.allQueues = [
    exports.socialScanQueue,
    exports.marketplaceValidationQueue,
    exports.supplierAnalysisQueue,
    exports.opportunityScoringQueue,
    exports.dailyTop20Queue,
];
//# sourceMappingURL=trendQueues.js.map