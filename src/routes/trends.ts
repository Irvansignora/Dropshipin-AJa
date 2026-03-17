// src/routes/trends.ts
import { Router, Request, Response } from 'express';
import { TrendRepository }     from '../db/repositories/TrendRepository';
import { TrendHunterEngine }   from '../TrendHunterEngine';
import {
  socialScanQueue,
  marketplaceValidationQueue,
  supplierAnalysisQueue,
  dailyTop20Queue,
} from '../queues/trendQueues';
import logger from '../utils/logger';

const router = Router();
const repo   = new TrendRepository();
const engine = new TrendHunterEngine();

// GET /api/trends/top20
router.get('/top20', async (_req: Request, res: Response) => {
  try {
    const opportunities = await repo.getTop20Opportunities();
    res.json({ success: true, data: opportunities, timestamp: new Date().toISOString() });
  } catch (err: any) {
    logger.error('/top20 error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/trends/signals
router.get('/signals', async (req: Request, res: Response) => {
  try {
    const hours   = parseInt(String(req.query.hours || '24'), 10);
    const signals = await repo.getRecentSignals(hours);
    res.json({ success: true, data: signals, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/trends/validations
router.get('/validations', async (req: Request, res: Response) => {
  try {
    const hours       = parseInt(String(req.query.hours || '24'), 10);
    const validations = await repo.getRecentValidations(hours);
    res.json({ success: true, data: validations, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/trends/suppliers
router.get('/suppliers', async (req: Request, res: Response) => {
  try {
    const hours    = parseInt(String(req.query.hours || '24'), 10);
    const analyses = await repo.getRecentSupplierAnalysis(hours);
    res.json({ success: true, data: analyses, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/trends/stats — dashboard summary
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await repo.getDashboardStats();
    res.json({ success: true, data: stats, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/trends/keyword/:keyword
router.get('/keyword/:keyword', async (req: Request<{ keyword: string }>, res: Response) => {
  try {
    const keyword = String(req.params.keyword);
    const [signals, validations, suppliers, forecast] = await Promise.all([
      repo.getTopSignalsByKeyword(keyword),
      repo.getValidationsByKeyword(keyword),
      repo.getRecentSupplierAnalysis(72).then((a) => a.filter((s) => s.keyword === keyword)),
      repo.getLatestForecast(keyword),
    ]);
    res.json({
      success: true,
      data: { keyword, signals, validations, suppliers, forecast },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/trends/trigger/scan — manually trigger social scan
router.post('/trigger/scan', async (_req: Request, res: Response) => {
  try {
    const job = await socialScanQueue.add('manual-scan', {}, { jobId: `manual-scan-${Date.now()}` });
    res.json({ success: true, data: { jobId: job.id }, message: 'Social scan queued' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/trends/trigger/validate — manually trigger marketplace validation
router.post('/trigger/validate', async (_req: Request, res: Response) => {
  try {
    const job = await marketplaceValidationQueue.add('manual-validate', {}, { jobId: `manual-validate-${Date.now()}` });
    res.json({ success: true, data: { jobId: job.id }, message: 'Marketplace validation queued' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/trends/trigger/suppliers — manually trigger supplier analysis
router.post('/trigger/suppliers', async (_req: Request, res: Response) => {
  try {
    const job = await supplierAnalysisQueue.add('manual-suppliers', {}, { jobId: `manual-suppliers-${Date.now()}` });
    res.json({ success: true, data: { jobId: job.id }, message: 'Supplier analysis queued' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/trends/trigger/top20 — manually trigger top20 generation
router.post('/trigger/top20', async (_req: Request, res: Response) => {
  try {
    const job = await dailyTop20Queue.add('manual-top20', {}, { jobId: `manual-top20-${Date.now()}` });
    res.json({ success: true, data: { jobId: job.id }, message: 'Top20 scoring queued' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/trends/trigger/pipeline — run full pipeline immediately (sync, for testing)
router.post('/trigger/pipeline', async (_req: Request, res: Response) => {
  try {
    logger.info('[API] Full pipeline triggered via API');
    const top = await engine.runFullPipeline();
    res.json({ success: true, data: top, message: `Pipeline complete — ${top.length} opportunities` });
  } catch (err: any) {
    logger.error('[API] Pipeline error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/trends/launch — launch product into listing pipeline
router.post('/launch', async (req: Request, res: Response) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ success: false, error: 'keyword is required' });

    logger.info(`[API] Launching product: ${keyword}`);
    // TODO: integrate with your ListingQueue / ArbitrageMatrixEngine here
    // await ListingQueue.push({ keyword, source: 'TrendRadar', triggered_by: 'manual' });
    res.json({
      success: true,
      message: `Product "${keyword}" pushed to listing pipeline`,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/trends/queue/status — check BullMQ queue sizes
router.get('/queue/status', async (_req: Request, res: Response) => {
  try {
    const [scanCounts, validateCounts, supplierCounts, top20Counts] = await Promise.all([
      socialScanQueue.getJobCounts(),
      marketplaceValidationQueue.getJobCounts(),
      supplierAnalysisQueue.getJobCounts(),
      dailyTop20Queue.getJobCounts(),
    ]);
    res.json({
      success: true,
      data: {
        'trend:social-scan':            scanCounts,
        'trend:marketplace-validation': validateCounts,
        'trend:supplier-analysis':      supplierCounts,
        'trend:daily-top20':            top20Counts,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
