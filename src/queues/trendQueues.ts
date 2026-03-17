// src/queues/trendQueues.ts
import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

const defaultOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
};

export const socialScanQueue = new Queue('trend-social-scan', defaultOptions);
export const marketplaceValidationQueue = new Queue('trend-marketplace-validation', defaultOptions);
export const supplierAnalysisQueue = new Queue('trend-supplier-analysis', defaultOptions);
export const opportunityScoringQueue = new Queue('trend-opportunity-scoring', defaultOptions);
export const dailyTop20Queue = new Queue('trend-daily-top20', defaultOptions);

export const allQueues = [
  socialScanQueue,
  marketplaceValidationQueue,
  supplierAnalysisQueue,
  opportunityScoringQueue,
  dailyTop20Queue,
];
